import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TestWrapper } from "../test-utils";
import { NotFoundPage } from "../pages/NotFoundPage";

describe("NotFoundPage", () => {
  it("renders 404 title", () => {
    render(
      <TestWrapper>
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      </TestWrapper>
    );
    expect(screen.getByText("Page not found")).toBeDefined();
  });

  it("renders back link", () => {
    render(
      <TestWrapper>
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      </TestWrapper>
    );
    expect(screen.getByText("Back home")).toBeDefined();
  });
});
