import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TestWrapper } from "../test-utils";
import { AgentActivityPanel } from "../components/agent/AgentActivityPanel";

describe("AgentActivityPanel", () => {
  it("renders loading state initially", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() => new Promise(() => {}) as unknown as Promise<Response>);

    render(
      <TestWrapper>
        <AgentActivityPanel />
      </TestWrapper>
    );

    expect(screen.getByText("Agent Activity")).toBeDefined();
  });

  it("renders empty state when agent is offline", async () => {
    vi.spyOn(global, "fetch").mockImplementation((url: string | URL | Request) => {
      if (typeof url === "string" && url.includes("/health")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: "error" }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
    });

    render(
      <TestWrapper>
        <AgentActivityPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Agent offline")).toBeDefined();
    });
  });
});
