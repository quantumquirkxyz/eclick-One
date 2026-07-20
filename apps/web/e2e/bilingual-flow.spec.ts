import { test, expect } from "@playwright/test";
import { loginUser } from "./helpers";

test.describe("Bilingual Flow", () => {
  test("switch to Spanish and verify UI translation", async ({ page }) => {
    await loginUser(page);

    await expect(page.getByRole("heading", { level: 1, name: "Summary" })).toBeVisible();

    const languageSelect = page.getByLabel("Language");
    await languageSelect.selectOption("es");

    await expect(page.getByRole("heading", { level: 1, name: "Resumen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Clientes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pedidos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pagos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reportes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Web3" })).toBeVisible();
  });

  test("switch back to English from Spanish", async ({ page }) => {
    await loginUser(page);

    const languageSelect = page.getByLabel("Language");
    await languageSelect.selectOption("es");
    await expect(page.getByRole("heading", { level: 1, name: "Resumen" })).toBeVisible();

    const spanishSelect = page.getByLabel("Idioma");
    await spanishSelect.selectOption("en");

    await expect(page.getByRole("heading", { level: 1, name: "Summary" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Customers" })).toBeVisible();
  });

  test("complete flow in Spanish", async ({ page }) => {
    await loginUser(page);

    const languageSelect = page.getByLabel("Language");
    await languageSelect.selectOption("es");

    await page.getByText("Clientes").first().click();
    await page.waitForURL("**/app/customers");
    await expect(page.getByText("Nuevo cliente")).toBeVisible();
    await expect(page.getByText("Ana Morales")).toBeVisible();

    await page.getByText("Pedidos").first().click();
    await page.waitForURL("**/app/orders");
    await expect(page.getByRole("heading", { name: "Pedidos actuales" })).toBeVisible();

    await page.getByText("Reportes").first().click();
    await page.waitForURL("**/app/reports");
    await expect(page.getByRole("heading", { level: 1, name: /Reportes/i })).toBeVisible();
  });
});
