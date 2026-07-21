import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { TestWrapper } from "../test-utils";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
    isAuthenticated: false,
    isLoading: false,
  }),
}));

describe("Authentication form validation", () => {
  it("shows inline login validation after blur and disables submit", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      </MemoryRouter>,
    );

    const submit = screen.getByRole("button", { name: "Sign in" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByLabelText("Email"));
    await user.tab();

    expect(screen.getAllByText("Email is required.")).toHaveLength(2);
    expect(screen.getByText("Please fix the following fields:")).toBeDefined();
  });

  it("blocks register submit until passwords match", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("First name"), "Ana");
    await user.tab();
    await user.type(screen.getByLabelText("Last name"), "Lopez");
    await user.tab();
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.tab();
    await user.type(screen.getAllByPlaceholderText("••••••••")[0]!, "12345678");
    await user.tab();
    await user.type(screen.getAllByPlaceholderText("••••••••")[1]!, "87654321");
    await user.tab();

    expect(screen.getAllByText("Passwords must match.")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
  });
});
