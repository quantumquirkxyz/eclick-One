import { test, expect } from "@playwright/test";
import { loginUser } from "./helpers";

test.describe("Web3 Dashboard Flow", () => {
  test("navigate to Web3 dashboard", async ({ page }) => {
    await loginUser(page);
    await page.getByText("Web3").first().click();
    await page.waitForURL("**/app/web3");
    await expect(page.getByRole("heading", { level: 1, name: "Web3" })).toBeVisible();
  });

  test("Web3 dashboard shows connection status", async ({ page }) => {
    await loginUser(page);
    await page.getByText("Web3").first().click();
    await page.waitForURL("**/app/web3");

    await expect(page.getByText(/Connected|Disconnected|Conectado|Desconectado/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("order on-chain status badge is visible", async ({ page }) => {
    await loginUser(page);
    await page.getByText("Orders").first().click();
    await page.waitForURL("**/app/orders");

    const onChainBadge = page.locator("text=On-chain").or(page.locator("text=En cadena")).first();
    await expect(onChainBadge).toBeAttached({ timeout: 5000 });
  });
});
