import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TestWrapper } from "../test-utils";
import { BlockchainBanner } from "../components/BlockchainBanner";

describe("BlockchainBanner", () => {
  it("shows a banner when blockchain infrastructure is unavailable", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        connected: false,
        mode: "unavailable",
        chainId: null,
        latestBlockNumber: null,
        lastCheckedAt: new Date().toISOString(),
        message: "Blockchain infrastructure is not configured.",
      }),
    } as Response));

    render(
      <TestWrapper>
        <BlockchainBanner />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Blockchain infrastructure is unavailable. On-chain writes will remain pending sync.")).toBeDefined();
    });
  });
});
