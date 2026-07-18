import { createPublicClient, http, type Address, type Hash } from "viem";
import { foundry } from "viem/chains";
import { agentActivity } from "./agent-activity";
import { startAgentServer } from "./agent-http";
import { ORDER_MANAGER_ABI, OrderStatus, ORDER_STATUS_LABELS } from "./contract-abi";
import { orderIdFromCode } from "./order-hash";

const ORDER_MANAGER_ADDRESS = (Bun.env.ONCHAIN_ORDER_MANAGER_ADDRESS ?? "") as Address;
const RPC_URL = Bun.env.ONCHAIN_RPC_URL ?? "http://localhost:8545";
const API_BASE_URL = Bun.env.AGENT_API_BASE_URL ?? "http://localhost:3000";
const POLL_INTERVAL_MS = Number(Bun.env.AGENT_POLL_INTERVAL ?? 2000);
const AGENT_PORT = Number(Bun.env.COMPLIANCE_AGENT_PORT ?? 3101);
const MAX_RETRIES = 3;

const VALID_TRANSITIONS: Record<number, number[]> = {
  [OrderStatus.Generated]: [OrderStatus.InProcess, OrderStatus.Cancelled],
  [OrderStatus.InProcess]: [OrderStatus.Delivered, OrderStatus.Cancelled, OrderStatus.Invoiced],
  [OrderStatus.Delivered]: [OrderStatus.Invoiced],
};

const ON_CHAIN_TO_OFF_CHAIN: Record<number, string> = {
  [OrderStatus.Generated]: "generado",
  [OrderStatus.InProcess]: "proceso",
  [OrderStatus.Delivered]: "entregado",
  [OrderStatus.Cancelled]: "cancelado",
  [OrderStatus.Invoiced]: "facturado",
};

if (!ORDER_MANAGER_ADDRESS) {
  console.error("Missing ONCHAIN_ORDER_MANAGER_ADDRESS");
  process.exit(1);
}

const publicClient = createPublicClient({
  chain: foundry,
  transport: http(RPC_URL),
});

const processedLogs = new Set<string>();

interface ComplianceReport {
  timestamp: string;
  orderCode: string;
  status: "compliant" | "violation" | "warning";
  message: string;
  details: Record<string, unknown>;
}

class ComplianceRegistry {
  private reports: ComplianceReport[] = [];
  private maxReports = 500;

  add(report: ComplianceReport): void {
    this.reports.unshift(report);
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(0, this.maxReports);
    }
    const icon = report.status === "violation" ? "✗" : report.status === "warning" ? "⚠" : "✓";
    console.log(`[${report.timestamp}] [${icon}] [${report.orderCode}] ${report.message}`);
  }

  getRecent(count = 50): ComplianceReport[] {
    return this.reports.slice(0, count);
  }

  getStats(): { compliant: number; violations: number; warnings: number } {
    return {
      compliant: this.reports.filter((r) => r.status === "compliant").length,
      violations: this.reports.filter((r) => r.status === "violation").length,
      warnings: this.reports.filter((r) => r.status === "warning").length,
    };
  }
}

const complianceRegistry = new ComplianceRegistry();

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
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        agentActivity.log("error", `${label} failed: ${error}`);
      }
    }
  }
  return null;
}

async function verifyOrderTransition(
  eventOrderId: Hash,
  fromStatus: number,
  toStatus: number,
  triggeredBy: Address,
): Promise<void> {
  const allowedNext = VALID_TRANSITIONS[fromStatus];
  if (!allowedNext) {
    complianceRegistry.add({
      timestamp: new Date().toISOString(),
      orderCode: eventOrderId.slice(2, 10),
      status: "warning",
      message: `Transition from unknown status ${fromStatus}`,
      details: { fromStatus, toStatus, triggeredBy },
    });
    return;
  }

  if (!allowedNext.includes(toStatus)) {
    complianceRegistry.add({
      timestamp: new Date().toISOString(),
      orderCode: eventOrderId.slice(2, 10),
      status: "violation",
      message: `Invalid transition: ${ORDER_STATUS_LABELS[fromStatus as OrderStatus] ?? fromStatus} → ${ORDER_STATUS_LABELS[toStatus as OrderStatus] ?? toStatus}`,
      details: { fromStatus, toStatus, allowedTransitions: allowedNext, triggeredBy },
    });
    agentActivity.log("error", `Compliance violation: invalid transition ${fromStatus}→${toStatus}`, {
      triggeredBy,
    });
    return;
  }

  complianceRegistry.add({
    timestamp: new Date().toISOString(),
    orderCode: eventOrderId.slice(2, 10),
    status: "compliant",
    message: `Valid transition: ${ORDER_STATUS_LABELS[fromStatus as OrderStatus] ?? fromStatus} → ${ORDER_STATUS_LABELS[toStatus as OrderStatus] ?? toStatus}`,
    details: { fromStatus, toStatus, triggeredBy },
  });
}

async function verifyOnChainVsOffChainState(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/orders`);
    if (!response.ok) return;

    const orders = await response.json() as Array<{ codigo_pedido: string; estado: string }>;
    for (const order of orders.slice(0, 10)) {
      const oid = orderIdFromCode(order.codigo_pedido);
      const onChainData = await publicClient.readContract({
        address: ORDER_MANAGER_ADDRESS,
        abi: ORDER_MANAGER_ABI,
        functionName: "getOrder",
        args: [oid],
      });

      const onChainStatus = onChainData[0] as number;
      if (onChainStatus === OrderStatus.None) {
        complianceRegistry.add({
          timestamp: new Date().toISOString(),
          orderCode: order.codigo_pedido,
          status: "warning",
          message: "Order exists off-chain but not on-chain",
          details: { offChainStatus: order.estado },
        });
        continue;
      }

      const expectedOffChain = ON_CHAIN_TO_OFF_CHAIN[onChainStatus];
      if (expectedOffChain && order.estado !== expectedOffChain) {
        const level = order.estado === "cancelado" && onChainStatus === OrderStatus.InProcess ? "warning" : "violation";
        complianceRegistry.add({
          timestamp: new Date().toISOString(),
          orderCode: order.codigo_pedido,
          status: level,
          message: `State mismatch: on-chain=${expectedOffChain}, off-chain=${order.estado}`,
          details: { onChainStatus, offChainStatus: order.estado },
        });
      }
    }
  } catch (error) {
    agentActivity.log("error", `State verification error: ${String(error)}`);
  }
}

async function pollEvents(): Promise<void> {
  agentActivity.log("info", "Starting compliance monitoring...");
  let lastBlock = await publicClient.getBlockNumber();
  let verificationCounter = 0;

  const poll = async () => {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock > lastBlock) {
        const logs = await publicClient.getLogs({
          address: ORDER_MANAGER_ADDRESS,
          event: {
            type: "event",
            name: "OrderStatusTransitioned",
            inputs: [
              { type: "bytes32", name: "orderId", indexed: true },
              { type: "uint8", name: "from", indexed: false },
              { type: "uint8", name: "to", indexed: false },
              { type: "address", name: "triggeredBy", indexed: false },
            ],
          } as const,
          fromBlock: lastBlock + 1n,
          toBlock: currentBlock,
        });

        for (const log of logs) {
          const logKey = `${log.blockNumber}-${log.logIndex}`;
          if (processedLogs.has(logKey)) continue;
          processedLogs.add(logKey);

          const orderId = log.args.orderId as Hash;
          const fromStatus = log.args.from as number;
          const toStatus = log.args.to as number;
          const triggeredBy = log.args.triggeredBy as Address;

          await verifyOrderTransition(orderId, fromStatus, toStatus, triggeredBy);
        }

        lastBlock = currentBlock;
      }

      verificationCounter++;
      if (verificationCounter % 30 === 0) {
        await verifyOnChainVsOffChainState();
      }
    } catch (error) {
      agentActivity.log("error", `Compliance poll error: ${String(error)}`);
    }

    setTimeout(poll, POLL_INTERVAL_MS);
  };

  poll();
}

agentActivity.log("info", "=== Compliance Agent ===");
agentActivity.log("info", `OrderManager: ${ORDER_MANAGER_ADDRESS}`);
agentActivity.log("info", `RPC: ${RPC_URL}`);
agentActivity.log("info", `API: ${API_BASE_URL}`);
agentActivity.log("info", `Poll interval: ${POLL_INTERVAL_MS}ms`);

startAgentServer(AGENT_PORT, {
  name: "compliance",
  wallet: "read-only",
  description: "Monitors order state transitions and validates them against business rules",
});

pollEvents();
