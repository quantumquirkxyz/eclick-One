import { test, expect } from "@playwright/test";
import { loginUser, registerUser } from "./helpers";

test.describe("Complete Commerce Flow", () => {
  test("register and see dashboard metrics", async ({ page }) => {
    await registerUser(page);
    await expect(page.getByRole("heading", { level: 1, name: "Summary" })).toBeVisible();
    await expect(page.getByText("Operations center")).toBeVisible();
    await expect(page.getByText("Active base")).toBeVisible();
    await expect(page.getByText("Current orders")).toBeVisible();
  });

  test("navigate to customers and create one", async ({ page }) => {
    await loginUser(page);
    await page.getByText("Customers").first().click();
    await page.waitForURL("**/app/customers");

    await expect(page.getByText("Ana Morales")).toBeVisible();

    await page.getByLabel("First name").fill("E2E");
    await page.getByLabel("Last name").fill("Tester");
    await page.getByLabel("Identification").fill("E2E-999");
    await page.getByText("Create customer").click();

    await expect(page.getByText("Tester")).toBeVisible({ timeout: 5000 });
  });

  test("navigate to orders and view list", async ({ page }) => {
    await loginUser(page);
    await page.getByText("Orders").first().click();
    await page.waitForURL("**/app/orders");

    await expect(page.getByText("Current orders")).toBeVisible();
    await expect(page.getByText("PA-SYN-0001")).toBeVisible();
  });

  test("create an order and record its payment", async ({ page }) => {
    await loginUser(page);
    await page.getByText("Orders").first().click();
    await page.waitForURL("**/app/orders");

    const orderLabel = `e2e-order-${Date.now()}`;
    await page.getByLabel("Address").fill("Avenida Central, Panama");
    await page.getByRole("textbox", { name: /^Label$/ }).fill(orderLabel);
    await page.getByRole("button", { name: "Create order" }).click();
    await expect(page.getByText("Order created in mock mode.")).toBeVisible();

    const changeStatusPanel = page.locator("section.panel", {
      has: page.getByRole("heading", { name: "Change status" }),
    });
    const orderCode = await changeStatusPanel.getByRole("combobox").first().inputValue();
    await expect(page.locator("tr", { hasText: orderCode }).first()).toBeVisible();

    await page.getByText("Payments").first().click();
    await page.waitForURL("**/app/payments");
    const registerPaymentPanel = page.locator("section.panel", {
      has: page.getByRole("heading", { name: "Register payment" }),
    });
    await registerPaymentPanel.getByRole("combobox").first().selectOption(orderCode.trim());
    await registerPaymentPanel.getByLabel("Reference").fill(`E2E-${Date.now()}`);
    await page.getByRole("button", { name: "Register payment" }).click();

    await expect(page.getByText("Payment registered in mock mode.")).toBeVisible();
    await expect(page.getByRole("cell", { name: orderCode.trim() }).first()).toBeVisible();
  });

  test("navigate to payments and view list", async ({ page }) => {
    await loginUser(page);
    await page.getByText("Payments").first().click();
    await page.waitForURL("**/app/payments");

    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  });

  test("navigate to products and view catalog", async ({ page }) => {
    await loginUser(page);
    await page.getByText("Products").first().click();
    await page.waitForURL("**/app/products");

    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    await expect(page.getByText("Academic Laptop")).toBeVisible();
  });

  test("navigate to inventory and view stock", async ({ page }) => {
    await loginUser(page);
    await page.getByText("Inventory").first().click();
    await page.waitForURL("**/app/inventory");

    await expect(page.getByRole("heading", { level: 1, name: "Inventory" })).toBeVisible();
  });

  test("navigate to reports", async ({ page }) => {
    await loginUser(page);
    await page.getByText("Reports").first().click();
    await page.waitForURL("**/app/reports");

    await expect(page.getByRole("heading", { level: 1, name: /Reports/i })).toBeVisible();
  });
});
