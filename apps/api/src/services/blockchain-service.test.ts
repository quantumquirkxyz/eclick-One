import { describe, expect, test } from "bun:test";
import { BlockchainService, type BlockchainProbe } from "./blockchain-service";

function createProbe(overrides: Partial<BlockchainProbe>): BlockchainProbe {
  return {
    isAvailable: overrides.isAvailable ?? (async () => true),
    getChainId: overrides.getChainId ?? (async () => 31337),
    getLatestBlockNumber: overrides.getLatestBlockNumber ?? (async () => 12345n),
  };
}

describe("BlockchainService", () => {
  test("reports unavailable when no on-chain client is configured", async () => {
    const service = new BlockchainService(null);

    await expect(service.check()).resolves.toMatchObject({
      connected: false,
      mode: "unavailable",
      chainId: null,
      latestBlockNumber: null,
    });
  });

  test("reports disconnected when the blockchain cannot be reached", async () => {
    const service = new BlockchainService(createProbe({
      isAvailable: async () => false,
    }));

    await expect(service.check()).resolves.toMatchObject({
      connected: false,
      mode: "disconnected",
      chainId: null,
      latestBlockNumber: null,
    });
  });

  test("reports connected with chain and block metadata", async () => {
    const service = new BlockchainService(createProbe({}));

    const result = await service.check();
    expect(result).toMatchObject({
      connected: true,
      mode: "connected",
      chainId: 31337,
      latestBlockNumber: "12345",
    });
    expect(result.message).toContain("connected");
  });
});
