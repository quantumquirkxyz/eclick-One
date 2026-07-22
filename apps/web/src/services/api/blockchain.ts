import { apiRequest } from "./client";

export interface BlockchainStatus {
  connected: boolean;
  mode: "connected" | "disconnected" | "unavailable";
  chainId: number | null;
  latestBlockNumber: string | null;
  lastCheckedAt: string;
  message: string;
}

export async function fetchBlockchainStatus(): Promise<BlockchainStatus | null> {
  try {
    return await apiRequest<BlockchainStatus>("/api/v1/blockchain/status");
  } catch {
    return null;
  }
}
