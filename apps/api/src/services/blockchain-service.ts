export interface BlockchainProbe {
  isAvailable(): Promise<boolean>;
  getChainId(): Promise<number>;
  getLatestBlockNumber(): Promise<bigint>;
}

export interface BlockchainStatusResult {
  connected: boolean;
  mode: "connected" | "disconnected" | "unavailable";
  chainId: number | null;
  latestBlockNumber: string | null;
  lastCheckedAt: string;
  message: string;
}

export class BlockchainService {
  constructor(private readonly onchain: BlockchainProbe | null) {}

  async check(): Promise<BlockchainStatusResult> {
    const lastCheckedAt = new Date().toISOString();
    if (!this.onchain) {
      return {
        connected: false,
        mode: "unavailable",
        chainId: null,
        latestBlockNumber: null,
        lastCheckedAt,
        message: "Blockchain infrastructure is not configured.",
      };
    }

    const available = await this.onchain.isAvailable().catch(() => false);
    if (!available) {
      return {
        connected: false,
        mode: "disconnected",
        chainId: null,
        latestBlockNumber: null,
        lastCheckedAt,
        message: "Blockchain network is offline.",
      };
    }

    const [chainId, latestBlockNumber] = await Promise.all([
      this.onchain.getChainId(),
      this.onchain.getLatestBlockNumber(),
    ]);

    return {
      connected: true,
      mode: "connected",
      chainId,
      latestBlockNumber: latestBlockNumber.toString(),
      lastCheckedAt,
      message: "Blockchain network is connected.",
    };
  }
}
