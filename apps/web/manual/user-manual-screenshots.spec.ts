import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, type Page } from "@playwright/test";
import { loginUser } from "../e2e/helpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, "../../../docs/screenshots");

test.describe("User manual screenshots", () => {
  test.beforeAll(async () => {
    await mkdir(screenshotsDir, { recursive: true });
  });

  test("capture public and authenticated screens", async ({ page }) => {
    await captureLanding(page);
    await captureRegister(page);
    await captureLogin(page);
    await captureDashboard(page);
    await captureCustomers(page);
    await captureOrders(page);
    await capturePayments(page);
    await captureProducts(page);
    await captureInventory(page);
    await captureReports(page);
    await captureWeb3(page);
    await captureSpanishDashboard(page);
  });
});

async function captureLanding(page: Page) {
  await page.goto("/");
  await page.setViewportSize({ width: 1440, height: 1400 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: screenshotPath("landing-page.png"), fullPage: true });
}

async function captureRegister(page: Page) {
  await page.goto("/register");
  await page.setViewportSize({ width: 1440, height: 1200 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: screenshotPath("register-page.png"), fullPage: true });
}

async function captureLogin(page: Page) {
  await page.goto("/login");
  await page.setViewportSize({ width: 1440, height: 1200 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: screenshotPath("login-page.png"), fullPage: true });
}

async function captureDashboard(page: Page) {
  await loginUser(page);
  await page.setViewportSize({ width: 1440, height: 1600 });
  await expect(page.getByRole("heading", { level: 1, name: /Summary|Resumen/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("dashboard-summary.png"), fullPage: true });
}

async function captureCustomers(page: Page) {
  await page.getByRole("link", { name: /Customers|Clientes/i }).click();
  await page.waitForURL("**/app/customers");
  await expect(page.getByRole("heading", { level: 1, name: /Customers|Clientes/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("customers-page.png"), fullPage: true });
}

async function captureOrders(page: Page) {
  await page.getByRole("link", { name: /Orders|Pedidos/i }).click();
  await page.waitForURL("**/app/orders");
  await expect(page.getByRole("heading", { level: 1, name: /Orders|Pedidos/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("orders-page.png"), fullPage: true });
}

async function capturePayments(page: Page) {
  await page.getByRole("link", { name: /Payments|Pagos/i }).click();
  await page.waitForURL("**/app/payments");
  await expect(page.getByRole("heading", { level: 1, name: /Payments|Pagos/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("payments-page.png"), fullPage: true });
}

async function captureProducts(page: Page) {
  await page.getByRole("link", { name: /Products|Productos/i }).click();
  await page.waitForURL("**/app/products");
  await expect(page.getByRole("heading", { level: 1, name: /Products|Productos/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("products-page.png"), fullPage: true });
}

async function captureInventory(page: Page) {
  await page.getByRole("link", { name: /Inventory|Inventario/i }).click();
  await page.waitForURL("**/app/inventory");
  await expect(page.getByRole("heading", { level: 1, name: /Inventory|Inventario/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("inventory-page.png"), fullPage: true });
}

async function captureReports(page: Page) {
  await page.getByRole("link", { name: /Reports|Reportes/i }).click();
  await page.waitForURL("**/app/reports");
  await expect(page.getByRole("heading", { level: 1, name: /Reports|Reportes/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("reports-page.png"), fullPage: true });
}

async function captureWeb3(page: Page) {
  await page.getByRole("link", { name: /^Web3$/i }).click();
  await page.waitForURL("**/app/web3");
  await expect(page.getByRole("heading", { level: 1, name: /^Web3$/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("web3-page.png"), fullPage: true });
}

async function captureSpanishDashboard(page: Page) {
  const languageSelect = page.getByLabel(/Language|Idioma/i);
  await languageSelect.selectOption("es");
  await page.getByRole("link", { name: /^Resumen$/i }).click();
  await page.waitForURL("**/app");
  await expect(page.getByRole("heading", { level: 1, name: /^Resumen$/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("dashboard-spanish.png"), fullPage: true });
}

function screenshotPath(filename: string): string {
  return path.join(screenshotsDir, filename);
}

