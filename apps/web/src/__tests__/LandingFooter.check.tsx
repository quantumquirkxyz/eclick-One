import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TestWrapper } from "../test-utils";
import { LandingFooter } from "../components/landing/LandingFooter";

describe("LandingFooter", () => {
  it("renders brand name", () => {
    render(
      <TestWrapper>
        <LandingFooter />
      </TestWrapper>
    );
    expect(screen.getByText("eclick One")).toBeDefined();
  });

  it("renders footer translations", () => {
    render(
      <TestWrapper>
        <LandingFooter />
      </TestWrapper>
    );
    expect(screen.getByText(/e-commerce operations in Panama/)).toBeDefined();
    expect(screen.getByText(/Synthetic data/)).toBeDefined();
  });
});
