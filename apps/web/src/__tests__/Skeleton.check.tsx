import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkeletonPage, SkeletonPageTitle, SkeletonTable } from "../components/Skeleton";
import { TestWrapper } from "../test-utils";

describe("Skeleton components", () => {
  it("announces loading state in English by default", () => {
    localStorage.setItem("eclick-one-locale", "en");

    render(
      <TestWrapper>
        <SkeletonPage title="Orders" description="Loading orders...">
          <SkeletonPageTitle />
          <SkeletonTable columns={3} rows={2} />
        </SkeletonPage>
      </TestWrapper>,
    );

    expect(screen.getByRole("status", { name: "Orders. Loading orders..." })).toBeDefined();
  });

  it("announces loading state in Spanish", () => {
    localStorage.setItem("eclick-one-locale", "es");

    render(
      <TestWrapper>
        <SkeletonPage title="Pedidos">
          <SkeletonPageTitle />
        </SkeletonPage>
      </TestWrapper>,
    );

    expect(screen.getByRole("status", { name: "Pedidos. Cargando..." })).toBeDefined();
  });
});
