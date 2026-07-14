import { createApiApplication } from "./app";
import { loadApiConfig } from "./config";

const config = loadApiConfig(Bun.env);
const app = createApiApplication(Bun.env, config.corsOrigins);

const server = Bun.serve({
  hostname: config.host,
  port: config.port,
  fetch: app.fetch,
});

console.info(`eclick One API listening at ${server.url} (${app.database.mode} repositories)`);

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal} received; closing resources.`);
  await app.database.close();
  await server.stop();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
