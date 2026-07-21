import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { createAuthConfig } from "@eclick-one/shared";
import { agentActivity } from "./agent-activity";
import { startAgentServer } from "./agent-http";
import { ORDER_MANAGER_ABI, OrderStatus, ORDER_STATUS_LABELS } from "./contract-abi";
import { AgentPersistence } from "./agent-persistence";

type PaymentLog = {
  blockNumber: bigint;
  logIndex: number;
  args: { orderId: Hash; amount: bigint };
};

const ORDER_MANAGER_ADDRESS = (Bun.env.ONCHAIN_ORDER_MANAGER_ADDRESS ?? "") as Address;
const RPC_URL = Bun.env.ONCHAIN_RPC_URL ?? "http://localhost:8545";
const COLLECTOR_PRIVATE_KEY = (Bun.env.ONCHAIN_COLLECTOR_PRIVATE_KEY ?? "") as `0x${string}`;
const API_BASE_URL = Bun.env.AGENT_API_BASE_URL ?? "http://localhost:3000";
const POLL_INTERVAL_MS = Number(Bun.env.AGENT_POLL_INTERVAL ?? 2000);
const AGENT_PORT = Number(Bun.env.AGENT_PORT ?? 3100);
const MAX_RETRIES = 3;
const MAX_TRANSACTIONS_PER_MINUTE = 5;
const GAS_PRICE_THRESHOLD = BigInt(Bun.env.AGENT_GAS_PRICE_THRESHOLD ?? "100000000000"); // 100 gwei default

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
const agentAuth = createAuthConfig(Bun.env);

const processedLogs = new Set<string>();
const persistence = AgentPersistence.getInstance();
const transactionTimestamps: number[] = [];
let currentNonce: number | null = null;
let isShuttingDown = false;

function rateLimitCheck(): boolean {
  const now = Date.now();
  const recent = transactionTimestamps.filter((t) => now - t < 60000);
  transactionTimestamps.length = 0;
  transactionTimestamps.push(...recent);
  return transactionTimestamps.length < MAX_TRANSACTIONS_PER_MINUTE;
}

function recordTransaction(): void {
  transactionTimestamps.push(Date.now());
}

async function getGasPrice(): Promise<bigint> {
  try {
    const gasPrice = await publicClient.getGasPrice();
    return gasPrice;
  } catch {
    return 0n;
  }
}

async function retryRpcConnection<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = MAX_RETRIES,
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isTimeout = String(error).includes("timeout") || String(error).includes("ETIMEDOUT");
      if (isTimeout && attempt < maxRetries) {
        const delay = Math.min(1000 * 2 ** attempt, 10000);
        agentActivity.log("error", `${label} RPC timeout (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (attempt < maxRetries) {
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
  if (isShuttingDown) return false;

  const result = await retryRpcConnection(async () => {
    const gasPrice = await getGasPrice();
    if (gasPrice > GAS_PRICE_THRESHOLD) {
      agentActivity.log("warn", `Gas price ${gasPrice} exceeds threshold ${GAS_PRICE_THRESHOLD}, skipping cycle`);
      return null as never;
    }

    if (!rateLimitCheck()) {
      agentActivity.log("warn", "Rate limit reached (5 transactions/minute), skipping");
      return null as never;
    }

    const { request } = await publicClient.simulateContract({
      address: ORDER_MANAGER_ADDRESS,
      abi: ORDER_MANAGER_ABI,
      functionName: "transitionToDelivered",
      args: [oid],
      account,
    });
    const hash = await walletClient.writeContract(request);
    recordTransaction();
    if (currentNonce !== null) {
      currentNonce++;
    }
    return hash;
  }, `on-chain transition ${orderCode}`);

  if (result) {
    agentActivity.log("action", `Order ${orderCode} → entregado (on-chain)`, { txHash: result });
    return true;
  }
  return false;
}

async function callApiWithRetry(url: string, options: RequestInit, label: string): Promise<unknown | null> {
  if (isShuttingDown) return null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const text = await response.text();
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          const delay = Math.min(1000 * 2 ** attempt, 10000);
          agentActivity.log("error", `${label} returned ${response.status} (attempt ${attempt}/${MAX_RETRIES}), retrying`, {
            error: text,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`API returned ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        agentActivity.log("error", `${label} failed after ${MAX_RETRIES} attempts`, {
          error: String(error),
        });
      }
    }
  }
  return null;
}

async function callApiForTransition(orderCode: string): Promise<boolean> {
  const result = await callApiWithRetry(
    `${API_BASE_URL}/api/v1/orders/${orderCode}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "entregado" }),
    },
    `API transition ${orderCode}`,
  );

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
  let lastBlock = persistence.getLastBlock("collector");

  const poll = async () => {
    try {
      const currentBlock = await retryRpcConnection(() => publicClient.getBlockNumber(), "getBlockNumber");
      if (!currentBlock || currentBlock <= lastBlock || isShuttingDown) {
        setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      const logs = await retryRpcConnection(() =>
        publicClient.getLogs({
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
        }),
        "getLogs",
      );

      if (logs) {
        for (const log of logs as PaymentLog[]) {
          const logKey = `${log.blockNumber}-${log.logIndex}`;
          if (processedLogs.has(logKey)) continue;
          processedLogs.add(logKey);

          const eventOrderId = log.args.orderId;
          const amount = log.args.amount;

          const orderData = await retryRpcConnection(() =>
            publicClient.readContract({
              address: ORDER_MANAGER_ADDRESS,
              abi: ORDER_MANAGER_ABI,
              functionName: "getOrder",
              args: [eventOrderId],
            }),
            "getOrder",
          );

          if (orderData) {
            const data = orderData as readonly unknown[];
            const currentStatus = Number(data[0]);
            if (currentStatus === OrderStatus.InProcess) {
              const orderCode = `chain-${eventOrderId.slice(2, 10)}`;
              await processPaymentEvent(eventOrderId, amount, orderCode);
            }
          }
        }
        lastBlock = currentBlock;
        persistence.saveBlockPosition("collector", lastBlock);
      }
    } catch (error) {
      agentActivity.log("error", `Poll error: ${String(error)}`);
    }

    setTimeout(poll, POLL_INTERVAL_MS);
  };

  poll();
}

async function gracefulShutdown(signal: string): Promise<void> {
  isShuttingDown = true;
  agentActivity.log("info", `Collector agent received ${signal}, shutting down...`);
  try {
    persistence.saveBlockPosition("collector", (await publicClient.getBlockNumber()));
  } catch {}
  console.log(`\nFinal metrics:`, JSON.stringify(agentActivity.getMetrics(), null, 2));
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGHUP", () => {
  persistence.reloadConfig();
});

agentActivity.log("info", "=== Collector Agent ===");
agentActivity.log("info", `OrderManager: ${ORDER_MANAGER_ADDRESS}`);
agentActivity.log("info", `RPC: ${RPC_URL}`);
agentActivity.log("info", `API: ${API_BASE_URL}`);
agentActivity.log("info", `Poll interval: ${POLL_INTERVAL_MS}ms`);
agentActivity.log("info", `Max transactions/minute: ${MAX_TRANSACTIONS_PER_MINUTE}`);
agentActivity.log("info", `Gas price threshold: ${GAS_PRICE_THRESHOLD.toString()}`);

startAgentServer(AGENT_PORT, {
  name: "collector",
  wallet: account.address,
  description: "Monitors PaymentRecorded events and transitions orders to delivered",
}, agentAuth);

pollEvents();
