import { Package } from "lucide-react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../components/EmptyState";

describe("EmptyState", () => {
  it("renders copy and optional action", () => {
    render(<EmptyState icon={Package} title="Empty catalog" description="No products available." actionLabel="Reload data" onAction={() => undefined} />);

    expect(screen.getByRole("status")).toHaveTextContent("Empty catalog");
    expect(screen.getByRole("button", { name: "Reload data" })).toBeDefined();
  });
});
