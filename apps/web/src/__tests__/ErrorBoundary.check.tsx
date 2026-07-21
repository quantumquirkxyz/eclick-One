import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PageErrorBoundary } from "../components/ErrorBoundary";
import { TestWrapper } from "../test-utils";

describe("PageErrorBoundary", () => {
  it("renders a fallback and resets on retry", async () => {
    let shouldCrash = true;

    function CrashControl() {
      if (shouldCrash) {
        throw new Error("boom");
      }
      return <p>Recovered</p>;
    }

    render(
      <MemoryRouter>
        <TestWrapper>
          <PageErrorBoundary>
            <CrashControl />
          </PageErrorBoundary>
        </TestWrapper>
      </MemoryRouter>,
    );

    expect(screen.getByText("Server error")).toBeDefined();
    shouldCrash = false;
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText("Recovered")).toBeDefined();
  });
});
