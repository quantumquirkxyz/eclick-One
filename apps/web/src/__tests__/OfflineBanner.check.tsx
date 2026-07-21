import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfflineBanner } from "../components/OfflineBanner";
import { TestWrapper } from "../test-utils";

describe("OfflineBanner", () => {
  it("shows a banner when the browser is offline", () => {
    const originalOnline = navigator.onLine;
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(
      <TestWrapper>
        <OfflineBanner />
      </TestWrapper>,
    );

    expect(screen.getByText("You are offline. Requests will retry when the connection returns.")).toBeDefined();

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: originalOnline,
    });
  });
});
