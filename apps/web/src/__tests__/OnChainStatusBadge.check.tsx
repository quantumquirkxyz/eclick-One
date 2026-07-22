import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TestWrapper } from "../test-utils";
import { OnChainStatusBadge } from "../components/agent/OnChainStatusBadge";

describe("OnChainStatusBadge", () => {
  it("renders loading state initially", () => {
    vi.spyOn(global, "fetch").mockImplementation(() => new Promise(() => {}) as unknown as Promise<Response>);

    render(
      <TestWrapper>
        <OnChainStatusBadge orderCode="TEST-001" />
      </TestWrapper>
    );
    expect(screen.getByText("...")).toBeDefined();
  });

  it("renders no on-chain status when not on chain", async () => {
    vi.spyOn(global, "fetch").mockImplementation((url: string | URL | Request) => {
      if (typeof url === "string" && url.includes("/onchain")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ onChain: false, status: null }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });

    render(
      <TestWrapper>
        <OnChainStatusBadge orderCode="TEST-001" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("No on-chain data")).toBeDefined();
    });
  });

  it("renders on-chain status when confirmed", async () => {
    vi.spyOn(global, "fetch").mockImplementation((url: string | URL | Request) => {
      if (typeof url === "string" && url.includes("/onchain")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ onChain: true, status: 3 }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });

    render(
      <TestWrapper>
        <OnChainStatusBadge orderCode="TEST-001" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/On-chain/)).toBeDefined();
    });
  });

  it("renders pending sync when the blockchain is unavailable", async () => {
    vi.spyOn(global, "fetch").mockImplementation((url: string | URL | Request) => {
      if (typeof url === "string" && url.includes("/onchain")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ onChain: false, status: null, unavailable: true }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });

    render(
      <TestWrapper>
        <OnChainStatusBadge orderCode="TEST-001" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Pending sync")).toBeDefined();
    });
  });
});
