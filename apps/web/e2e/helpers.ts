import { expect, type Page } from "@playwright/test";

export const TEST_USER = {
  email: "e2e@test.com",
  nombre: "E2E",
  apellido: "Tester",
  password: "TestPass123!",
};

export async function registerUser(page: Page): Promise<void> {
  const user = {
    ...TEST_USER,
    email: `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
  };

  await page.context().clearCookies();
  await page.goto("/register");
  await page.evaluate(() => localStorage.clear());
  await page.waitForSelector('input[autocomplete="given-name"]');
  await page.fill('input[autocomplete="given-name"]', user.nombre);
  await page.fill('input[autocomplete="family-name"]', user.apellido);
  await page.fill('input[autocomplete="email"]', user.email);
  const passwordInputs = page.locator('input[autocomplete="new-password"]');
  const count = await passwordInputs.count();
  await passwordInputs.nth(0).fill(user.password);
  if (count > 1) {
    await passwordInputs.nth(1).fill(user.password);
  }
  await page.locator("button[type='submit']").click();
  await page.waitForURL("**/app", { timeout: 10000 });
  await expect(page.getByRole("heading", { level: 1, name: /Summary|Resumen/i })).toBeVisible();
}

export async function loginUser(page: Page): Promise<void> {
  await ensureUserExists(page);
  await page.context().clearCookies();
  await page.goto("/login");
  await page.evaluate(() => localStorage.clear());
  await page.waitForSelector('input[autocomplete="email"]');
  await page.fill('input[autocomplete="email"]', TEST_USER.email);
  await page.fill('input[autocomplete="current-password"]', TEST_USER.password);
  await page.locator("button[type='submit']").click();
  await page.waitForURL("**/app", { timeout: 10000 });
  await expect(page.getByRole("heading", { level: 1, name: /Summary|Resumen/i })).toBeVisible();
}

async function ensureUserExists(page: Page): Promise<void> {
  const response = await page.request.post("/api/v1/auth/register", {
    data: {
      email: TEST_USER.email,
      nombre: TEST_USER.nombre,
      apellido: TEST_USER.apellido,
      password: TEST_USER.password,
    },
  });

  if (response.ok()) {
    return;
  }

  if (response.status() !== 409) {
    throw new Error(`E2E user setup failed with HTTP ${response.status()}.`);
  }
}
