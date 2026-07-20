import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "../test-utils";

describe("TestWrapper", () => {
  it("renders children", () => {
    render(
      <TestWrapper>
        <div data-testid="child">Hello</div>
      </TestWrapper>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });
});
