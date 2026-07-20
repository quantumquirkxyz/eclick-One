export interface AgentActivityEntry {
  timestamp: string;
  type: "info" | "action" | "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
}

export interface AgentMetrics {
  totalActions: number;
  totalErrors: number;
  totalInfo: number;
  ordersProcessed: number;
  ordersFailed: number;
  avgResponseTimeMs: number;
  uptimeSeconds: number;
  startedAt: string;
}

class AgentActivity {
  private entries: AgentActivityEntry[] = [];
  private maxEntries = 1000;
  private metrics: AgentMetrics = {
    totalActions: 0,
    totalErrors: 0,
    totalInfo: 0,
    ordersProcessed: 0,
    ordersFailed: 0,
    avgResponseTimeMs: 0,
    uptimeSeconds: 0,
    startedAt: new Date().toISOString(),
  };
  private responseTimes: number[] = [];

  log(type: AgentActivityEntry["type"], message: string, details?: Record<string, unknown>): void {
    const entry: AgentActivityEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      ...(details !== undefined && { details }),
    };
    this.entries.unshift(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    if (type === "action") this.metrics.totalActions++;
    else if (type === "error" || type === "warn") this.metrics.totalErrors++;
    else this.metrics.totalInfo++;

    const prefix = type === "error" ? "✗" : type === "warn" ? "⚠" : type === "action" ? "→" : "ℹ";
    console.log(`[${entry.timestamp}] [${prefix}] ${message}`);
  }

  trackOrderProcessed(durationMs: number): void {
    this.metrics.ordersProcessed++;
    this.responseTimes.push(durationMs);
    if (this.responseTimes.length > 100) this.responseTimes.shift();
    this.metrics.avgResponseTimeMs = Math.round(
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length,
    );
  }

  trackOrderFailed(): void {
    this.metrics.ordersFailed++;
  }

  getRecent(count = 50): AgentActivityEntry[] {
    return this.entries.slice(0, count);
  }

  getMetrics(): AgentMetrics {
    this.metrics.uptimeSeconds = Math.floor(
      (Date.now() - new Date(this.metrics.startedAt).getTime()) / 1000,
    );
    return { ...this.metrics };
  }

  reset(): void {
    this.entries = [];
    this.responseTimes = [];
    this.metrics = {
      totalActions: 0,
      totalErrors: 0,
      totalInfo: 0,
      ordersProcessed: 0,
      ordersFailed: 0,
      avgResponseTimeMs: 0,
      uptimeSeconds: 0,
      startedAt: new Date().toISOString(),
    };
  }
}

export const agentActivity = new AgentActivity();