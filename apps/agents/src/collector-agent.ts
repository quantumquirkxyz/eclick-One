import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { agentActivity } from "./agent-activity";
import { startAgentServer } from "./agent-http";
import { ORDER_MANAGER_ABI, OrderStatus, ORDER_STATUS_LABELS } from "./contract-abi";
import { orderIdFromCode } from "./order-hash";

const ORDER_MANAGER_ADDRESS = (Bun.env.ONCHAIN_ORDER_MANAGER_ADDRESS ?? "") as Address;
const RPC_URL = Bun.env.ONCHAIN_RPC_URL ?? "http://localhost:8545";
const COLLECTOR_PRIVATE_KEY = (Bun.env.ONCHAIN_COLLECTOR_PRIVATE_KEY ?? "") as `0x${string}`;
const API_BASE_URL = Bun.env.AGENT_API_BASE_URL ?? "http://localhost:3000";
const POLL_INTERVAL_MS = Number(Bun.env.AGENT_POLL_INTERVAL ?? 2000);
const AGENT_PORT = Number(Bun.env.AGENT_PORT ?? 3100);
const MAX_RETRIES = 3;

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.None]: [OrderStatus.Generated],
  [OrderStatus.Generated]: [OrderStatus.InProcess, OrderStatus.Cancelled],
  [OrderStatus.InProcess]: [OrderStatus.Delivered, OrderStatus.Cancelled, OrderStatus.Invoiced],
  [OrderStatus.Delivered]: [OrderStatus.Invoiced],
  [OrderStatus.Cancelled]: [],
  [OrderStatus.Invoiced]: [],
};

if (!ORDER_MANAGER_ADDRESS || !COLLECTOR_PRIVATE_KEY) {
  console.error("Missing ONCHAIN_ORDER_MANAGER_ADDRESS or ONCHAIN_COLLECTOR_PRIVATE_KEY");
  process.exit(1);
}

const account = privateKeyToAccount(COLLECTOR_PRIVATE_KEY);
agentActivity.log("info", `Collector agent wallet: ${account.address}`);

const walletClient = createWalletClient({
  account,
  chain: foundry,
  transport: http(RPC_URL),
});

const publicClient = createPublicClient({
  chain: foundry,
  transport: http(RPC_URL),
});

const processedLogs = new Set<string>();

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = MAX_RETRIES,
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * 2 ** attempt, 10000);
        agentActivity.log("error", `${label} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`, {
          error: String(error),
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        agentActivity.log("error", `${label} failed after ${maxRetries} attempts`, {
          error: String(error),
        });
      }
    }
  }
  return null;
}

async function transitionOrderOnChain(oid: Hash, orderCode: string): Promise<boolean> {
  const result = await retryWithBackoff(async () => {
    const { request } = await publicClient.simulateContract({
      address: ORDER_MANAGER_ADDRESS,
      abi: ORDER_MANAGER_ABI,
      functionName: "transitionToDelivered",
      args: [oid],
      account,
    });
    return await walletClient.writeContract(request);
  }, `on-chain transition ${orderCode}`);

  if (result) {
    agentActivity.log("action", `Order ${orderCode} → entregado (on-chain)`, { txHash: result });
    return true;
  }
  return false;
}

async function callApiForTransition(orderCode: string): Promise<boolean> {
  const result = await retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/orders/${orderCode}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "entregado" }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API returned ${response.status}: ${text}`);
    }
    return response.json();
  }, `API transition ${orderCode}`);

  if (result) {
    agentActivity.log("action", `Order ${orderCode} → entregado (API)`);
    return true;
  }
  return false;
}

async function processPaymentEvent(orderId: Hash, amount: bigint, orderCode: string): Promise<void> {
  const startTime = Date.now();
  agentActivity.log("info", `Processing payment for order ${orderCode}, amount=${amount}`);

  const delivered = await transitionOrderOnChain(orderId, orderCode);
  if (delivered) {
    const apiOk = await callApiForTransition(orderCode);
    if (apiOk) {
      agentActivity.trackOrderProcessed(Date.now() - startTime);
      agentActivity.log("action", `Order ${orderCode}: full cycle complete (on-chain + API)`);
    } else {
      agentActivity.trackOrderFailed();
      agentActivity.log("error", `Order ${orderCode}: on-chain ok but API sync failed`);
    }
  } else {
    agentActivity.trackOrderFailed();
    agentActivity.log("error", `Order ${orderCode}: on-chain delivery failed, trying API-only fallback`);
    const fallbackOk = await callApiForTransition(orderCode);
    if (fallbackOk) {
      agentActivity.log("action", `Order ${orderCode}: delivered via API fallback (on-chain pending)`);
    }
  }
}

async function pollEvents(): Promise<void> {
  agentActivity.log("info", "Starting poll-based event listener...");
  let lastBlock = await publicClient.getBlockNumber();

  const poll = async () => {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= lastBlock) {
        setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      const logs = await publicClient.getLogs({
        address: ORDER_MANAGER_ADDRESS,
        event: {
          type: "event",
          name: "PaymentRecorded",
          inputs: [
            { type: "bytes32", name: "orderId", indexed: true },
            { type: "uint256", name: "amount", indexed: false },
          ],
        } as const,
        fromBlock: lastBlock + 1n,
        toBlock: currentBlock,
      });

      for (const log of logs) {
        const logKey = `${log.blockNumber}-${log.logIndex}`;
        if (processedLogs.has(logKey)) continue;
        processedLogs.add(logKey);

        const eventOrderId = log.args.orderId as Hash;
        const amount = log.args.amount as bigint;

        const orderData = await publicClient.readContract({
          address: ORDER_MANAGER_ADDRESS,
          abi: ORDER_MANAGER_ABI,
          functionName: "getOrder",
          args: [eventOrderId],
        });

        const currentStatus = orderData[0] as number;
        if (currentStatus === OrderStatus.InProcess) {
          const orderCode = `chain-${eventOrderId.slice(2, 10)}`;
          await processPaymentEvent(eventOrderId, amount, orderCode);
        }
      }

      lastBlock = currentBlock;
    } catch (error) {
      agentActivity.log("error", `Poll error: ${String(error)}`);
    }

    setTimeout(poll, POLL_INTERVAL_MS);
  };

  poll();
}

process.on("SIGINT", () => {
  agentActivity.log("info", "Collector agent shutting down...");
  console.log(`\nFinal metrics:`, JSON.stringify(agentActivity.getMetrics(), null, 2));
  process.exit(0);
});

process.on("SIGTERM", () => {
  agentActivity.log("info", "Collector agent shutting down...");
  process.exit(0);
});

agentActivity.log("info", "=== Collector Agent ===");
agentActivity.log("info", `OrderManager: ${ORDER_MANAGER_ADDRESS}`);
agentActivity.log("info", `RPC: ${RPC_URL}`);
agentActivity.log("info", `API: ${API_BASE_URL}`);
agentActivity.log("info", `Poll interval: ${POLL_INTERVAL_MS}ms`);

startAgentServer(AGENT_PORT, {
  name: "collector",
  wallet: account.address,
  description: "Monitors PaymentRecorded events and transitions orders to delivered",
});

pollEvents();
