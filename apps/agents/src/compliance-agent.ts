import { createPublicClient, http, type Address, type Hash } from "viem";
import { foundry } from "viem/chains";
import { createAuthConfig } from "@eclick-one/shared";
import { agentActivity } from "./agent-activity";
import { startAgentServer } from "./agent-http";
import { ORDER_MANAGER_ABI, OrderStatus, ORDER_STATUS_LABELS } from "./contract-abi";
import { orderIdFromCode } from "./order-hash";
import { AgentPersistence } from "./agent-persistence";

const ORDER_MANAGER_ADDRESS = (Bun.env.ONCHAIN_ORDER_MANAGER_ADDRESS ?? "") as Address;
const RPC_URL = Bun.env.ONCHAIN_RPC_URL ?? "http://localhost:8545";
const API_BASE_URL = Bun.env.AGENT_API_BASE_URL ?? "http://localhost:3000";
const POLL_INTERVAL_MS = Number(Bun.env.AGENT_POLL_INTERVAL ?? 2000);
const AGENT_PORT = Number(Bun.env.COMPLIANCE_AGENT_PORT ?? 3101);
const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

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
const agentAuth = createAuthConfig(Bun.env);

type LogEntry = {
  blockNumber: bigint;
  logIndex: number;
  args: { orderId: Hash; from: number; to: number; triggeredBy: Address };
};

const processedLogs = new Set<string>();
const persistence = AgentPersistence.getInstance();
let isShuttingDown = false;

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

  async reportViolation(report: ComplianceReport): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/compliance/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (!response.ok) {
        agentActivity.log("error", `Failed to report compliance violation to API: ${response.status}`);
      }
    } catch (error) {
      agentActivity.log("error", "Exception reporting compliance violation", { error: String(error) });
    }
  }
}

const complianceRegistry = new ComplianceRegistry();

async function retryRpcConnection<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = MAX_RETRIES,
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (isShuttingDown) return null;
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

async function verifyOrderTransition(
  eventOrderId: Hash,
  fromStatus: number,
  toStatus: number,
  triggeredBy: Address,
): Promise<void> {
  const allowedNext = VALID_TRANSITIONS[fromStatus];
  if (!allowedNext) {
    const report: ComplianceReport = {
      timestamp: new Date().toISOString(),
      orderCode: eventOrderId.slice(2, 10),
      status: "warning",
      message: `Transition from unknown status ${fromStatus}`,
      details: { fromStatus, toStatus, triggeredBy },
    };
    complianceRegistry.add(report);
    await complianceRegistry.reportViolation(report);
    return;
  }

  if (!allowedNext.includes(toStatus)) {
    const report: ComplianceReport = {
      timestamp: new Date().toISOString(),
      orderCode: eventOrderId.slice(2, 10),
      status: "violation",
      message: `Invalid transition: ${ORDER_STATUS_LABELS[fromStatus as OrderStatus] ?? fromStatus} -> ${ORDER_STATUS_LABELS[toStatus as OrderStatus] ?? toStatus}`,
      details: { fromStatus, toStatus, allowedTransitions: allowedNext, triggeredBy },
    };
    complianceRegistry.add(report);
    agentActivity.log("error", `Compliance violation: invalid transition ${fromStatus}→${toStatus}`, {
      triggeredBy,
    });
    await complianceRegistry.reportViolation(report);
    return;
  }

  const report: ComplianceReport = {
    timestamp: new Date().toISOString(),
    orderCode: eventOrderId.slice(2, 10),
    status: "compliant",
    message: `Valid transition: ${ORDER_STATUS_LABELS[fromStatus as OrderStatus] ?? fromStatus} -> ${ORDER_STATUS_LABELS[toStatus as OrderStatus] ?? toStatus}`,
    details: { fromStatus, toStatus, triggeredBy },
  };
  complianceRegistry.add(report);
}

type OrderInfo = { codigo_pedido: string; estado: string };

async function fetchOrdersBatch(): Promise<OrderInfo[]> {
  if (isShuttingDown) return [];

  const result = await retryRpcConnection(async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/orders`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    return response.json();
  }, "fetch orders");

  return (result as OrderInfo[]) ?? [];
}

async function verifyOnChainVsOffChainState(): Promise<void> {
  try {
    const orders = await fetchOrdersBatch();
    for (const order of orders.slice(0, BATCH_SIZE)) {
      if (isShuttingDown) break;

      try {
        const oid = orderIdFromCode(order.codigo_pedido);
        const onChainData = await retryRpcConnection(() =>
          publicClient.readContract({
            address: ORDER_MANAGER_ADDRESS,
            abi: ORDER_MANAGER_ABI,
            functionName: "getOrder",
            args: [oid],
          }),
          "getOrder",
        );

        if (!onChainData) continue;

        const data = onChainData as readonly unknown[];
        const onChainStatus = Number(data[0]);
        if (onChainStatus === OrderStatus.None) {
          const report: ComplianceReport = {
            timestamp: new Date().toISOString(),
            orderCode: order.codigo_pedido,
            status: "warning",
            message: "Order exists off-chain but not on-chain",
            details: { offChainStatus: order.estado },
          };
          complianceRegistry.add(report);
          await complianceRegistry.reportViolation(report);
          continue;
        }

        const expectedOffChain = ON_CHAIN_TO_OFF_CHAIN[onChainStatus];
        if (expectedOffChain && order.estado !== expectedOffChain) {
          const level = order.estado === "cancelado" && onChainStatus === OrderStatus.InProcess ? "warning" : "violation";
          const report: ComplianceReport = {
            timestamp: new Date().toISOString(),
            orderCode: order.codigo_pedido,
            status: level,
            message: `State mismatch: on-chain=${expectedOffChain}, off-chain=${order.estado}`,
            details: { onChainStatus, offChainStatus: order.estado },
          };
          complianceRegistry.add(report);
          await complianceRegistry.reportViolation(report);
        }
      } catch (error) {
        agentActivity.log("error", `Failed to verify order ${order.codigo_pedido}`, {
          error: String(error),
        });
      }
    }
  } catch (error) {
    agentActivity.log("error", `State verification error: ${String(error)}`);
  }
}

async function pollEvents(): Promise<void> {
  agentActivity.log("info", "Starting compliance monitoring...");
  let lastBlock = persistence.getLastBlock("compliance");
  let verificationCounter = 0;

  const poll = async () => {
    try {
      const currentBlock = await retryRpcConnection(() => publicClient.getBlockNumber(), "getBlockNumber");
      if (!currentBlock || isShuttingDown) {
        setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      if (currentBlock > lastBlock) {
        const logs = await retryRpcConnection(() =>
          publicClient.getLogs({
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
          }),
          "getLogs",
        );

        if (logs) {
          for (const log of logs as LogEntry[]) {
            const logKey = `${log.blockNumber}-${log.logIndex}`;
            if (processedLogs.has(logKey)) continue;
            processedLogs.add(logKey);

            const orderId = log.args.orderId;
            const fromStatus = log.args.from;
            const toStatus = log.args.to;
            const triggeredBy = log.args.triggeredBy;

            await verifyOrderTransition(orderId, fromStatus, toStatus, triggeredBy);
          }
          lastBlock = currentBlock;
          persistence.saveBlockPosition("compliance", lastBlock);
        }
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

async function gracefulShutdown(signal: string): Promise<void> {
  isShuttingDown = true;
  agentActivity.log("info", `Compliance agent received ${signal}, shutting down...`);
  try {
    persistence.saveBlockPosition("compliance", (await publicClient.getBlockNumber()));
  } catch {}
  console.log(`\nCompliance stats:`, JSON.stringify(complianceRegistry.getStats(), null, 2));
  console.log(`\nFinal metrics:`, JSON.stringify(agentActivity.getMetrics(), null, 2));
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGHUP", () => {
  persistence.reloadConfig();
});

agentActivity.log("info", "=== Compliance Agent ===");
agentActivity.log("info", `OrderManager: ${ORDER_MANAGER_ADDRESS}`);
agentActivity.log("info", `RPC: ${RPC_URL}`);
agentActivity.log("info", `API: ${API_BASE_URL}`);
agentActivity.log("info", `Poll interval: ${POLL_INTERVAL_MS}ms`);

startAgentServer(AGENT_PORT, {
  name: "compliance",
  wallet: "read-only",
  description: "Monitors order state transitions and validates them against business rules",
}, agentAuth);

pollEvents();
