import baseConfig from "./playwright.config";

export default {
  ...baseConfig,
  testDir: "./manual",
  testMatch: "**/*.playwright.ts",
};
