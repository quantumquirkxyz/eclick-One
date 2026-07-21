import { getStoredAccessToken } from "../api/auth";

const AGENT_BASE_URL = "/agent";
const COMPLIANCE_AGENT_BASE_URL = "/agent-compliance";

export interface AgentActivityEntry {
  timestamp: string;
  type: "info" | "action" | "error";
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

export interface AgentHealth {
  status: string;
  agent: string;
  wallet: string;
  uptime: number;
}

export interface AgentInfo {
  name: string;
  wallet: string;
  description: string;
}

async function fetchAgent<T>(baseUrl: string, path: string): Promise<T | null> {
  try {
    const headers = new Headers();
    const accessToken = getStoredAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    const response = await fetch(`${baseUrl}${path}`, { headers });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export const collectorApi = {
  health: () => fetchAgent<AgentHealth>(AGENT_BASE_URL, "/health"),
  activity: (count = 50) => fetchAgent<readonly AgentActivityEntry[]>(AGENT_BASE_URL, `/activity?count=${count}`),
  metrics: () => fetchAgent<AgentMetrics>(AGENT_BASE_URL, "/metrics"),
  info: () => fetchAgent<AgentInfo>(AGENT_BASE_URL, "/info"),
};

export const complianceApi = {
  health: () => fetchAgent<AgentHealth>(COMPLIANCE_AGENT_BASE_URL, "/health"),
  activity: (count = 50) => fetchAgent<readonly AgentActivityEntry[]>(COMPLIANCE_AGENT_BASE_URL, `/activity?count=${count}`),
  metrics: () => fetchAgent<AgentMetrics>(COMPLIANCE_AGENT_BASE_URL, "/metrics"),
  info: () => fetchAgent<AgentInfo>(COMPLIANCE_AGENT_BASE_URL, "/info"),
};

export async function fetchOnChainStatus(
  orderCode: string,
): Promise<{ onChain: boolean; status: number | null } | null> {
  try {
    const response = await fetch(`/api/v1/orders/${orderCode}/onchain`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

const ON_CHAIN_STATUS_LABELS: Record<number, string> = {
  0: "None",
  1: "Generated",
  2: "In Process",
  3: "Delivered",
  4: "Cancelled",
  5: "Invoiced",
};

export function formatOnChainStatus(status: number | null): string {
  if (status === null || status === undefined) return "N/A";
  return ON_CHAIN_STATUS_LABELS[status] ?? `Unknown (${status})`;
}
