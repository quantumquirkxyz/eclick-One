import { test, expect } from "@playwright/test";

test.describe("Error Handling Flow", () => {
  test("redirect to login when accessing protected route without auth", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("show validation error on login with empty fields", async ({ page }) => {
    await page.goto("/login");
    await page.locator("button[type='submit']").click();
    const emailIsMissing = await page
      .locator('input[autocomplete="email"]')
      .evaluate((input) => input instanceof HTMLInputElement && input.validity.valueMissing);
    expect(emailIsMissing).toBe(true);
  });

  test("show error on login with invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[autocomplete="email"]', "nonexistent@test.com");
    await page.fill('input[autocomplete="current-password"]', "wrongpassword");
    await page.locator("button[type='submit']").click();
    await expect(page.getByText("Invalid credentials.").or(page.getByText("Credenciales invalidas."))).toBeVisible();
  });

  test("show 404 page for unknown routes", async ({ page }) => {
    await page.goto("/nonexistent-route");
    await expect(page.getByText("Page not found").or(page.getByText("no encontrada"))).toBeVisible();
    await expect(page.getByText("Back home").or(page.getByText("Volver al inicio"))).toBeVisible();
  });

  test("show validation error on register with short password", async ({ page }) => {
    await page.goto("/register");
    await page.fill('input[autocomplete="given-name"]', "Test");
    await page.fill('input[autocomplete="family-name"]', "User");
    await page.fill('input[autocomplete="email"]', "test@shortpass.com");
    await page.locator('input[autocomplete="new-password"]').first().fill("123");
    await page.locator('input[autocomplete="new-password"]').nth(1).fill("123");
    await page.locator("button[type='submit']").click();
    await expect(page.getByText("Password must be at least 8 characters.").or(page.getByText("La contrasena debe tener al menos 8 caracteres."))).toBeVisible();
  });
});
