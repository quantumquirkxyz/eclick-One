import { createApiApplication } from "./app";
import { loadApiConfig } from "./config";

const config = loadApiConfig(Bun.env);
const app = createApiApplication(Bun.env, config);

const server = Bun.serve({
  hostname: config.host,
  port: config.port,
  fetch: app.fetch,
});

console.info(`eclick One API listening at ${server.url} (${app.database.mode} repositories)`);

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal} received; closing resources.`);
  try {
    await app.database.close();
  } catch (error) {
    console.error("Error closing database:", error);
  }
  try {
    await server.stop();
  } catch (error) {
    console.error("Error stopping server:", error);
  }
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
