import { createClient } from "@libsql/client";
import { tursoConfigFromEnv } from "../client/turso-client";
import { loadMigrationFiles, migrateUp } from "../migrations/runner";

const client = createClient({ ...tursoConfigFromEnv(Bun.env), intMode: "number" });
const files = await loadMigrationFiles(new URL("../../migrations", import.meta.url).pathname);

try {
  const result = await migrateUp(client, files, { includeSeeds: true });
  console.info(`Turso migrations applied successfully: ${result.applied.length ? result.applied.join(", ") : "nothing"}.`);
} finally {
  client.close();
}
