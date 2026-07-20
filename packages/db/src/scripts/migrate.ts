import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { tursoConfigFromEnv } from "../client/turso-client";
import { appliedMigrationIds, loadMigrationFiles, migrateDown, migrateUp, planMigrations } from "../migrations/runner";

const command = Bun.argv[2] ?? "status";
const dryRun = Bun.argv.includes("--dry-run");
const migrationsDir = resolve(import.meta.dir, "../../migrations");
const client = createClient({ ...tursoConfigFromEnv(Bun.env), intMode: "number" });
const files = await loadMigrationFiles(migrationsDir);

try {
  if (command === "up") {
    const result = await migrateUp(client, files, { dryRun, includeSeeds: false });
    printResult("up", result.applied, dryRun);
  } else if (command === "seed") {
    const result = await migrateUp(client, files, { dryRun, includeSeeds: true });
    printResult("seed", result.applied, dryRun);
  } else if (command === "down") {
    const steps = Number(Bun.argv.find((arg) => arg.startsWith("--steps="))?.split("=")[1] ?? "1");
    const result = await migrateDown(client, files, { dryRun, steps });
    printResult("down", result.applied, dryRun);
  } else if (command === "status") {
    const [applied, plan] = await Promise.all([
      appliedMigrationIds(client),
      planMigrations(client, files, { includeSeeds: true }),
    ]);
    console.info(`Applied migrations: ${applied.length ? applied.join(", ") : "none"}`);
    console.info(`Pending migrations: ${plan.pending.length ? plan.pending.map((file) => file.id).join(", ") : "none"}`);
  } else {
    throw new Error(`Unknown migration command: ${command}`);
  }
} finally {
  client.close();
}

function printResult(commandName: string, ids: readonly string[], wasDryRun: boolean): void {
  const prefix = wasDryRun ? "Dry run" : "Applied";
  console.info(`${prefix} ${commandName}: ${ids.length ? ids.join(", ") : "nothing"}`);
}
