import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  use: {
    baseURL: "http://localhost:5173",
    locale: "en-US",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions: {
      env: {
        ...process.env,
        LD_LIBRARY_PATH: [
          "/tmp/nspr-libs/usr/lib/x86_64-linux-gnu",
          "/tmp/nss-libs/usr/lib/x86_64-linux-gnu",
          "/tmp/alsa-libs/usr/lib/x86_64-linux-gnu",
          process.env.LD_LIBRARY_PATH || "",
        ].filter(Boolean).join(":"),
      },
    },
  },
  webServer: [
    {
      command: "bun --env-file=../../.env src/server.ts",
      cwd: "../api",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "bun run dev",
      cwd: ".",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
