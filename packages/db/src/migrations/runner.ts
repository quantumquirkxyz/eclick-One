import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Client } from "@libsql/client";

export type MigrationDirection = "up" | "down";

export interface MigrationFile {
  id: string;
  name: string;
  path: string;
  direction: MigrationDirection;
  sql: string;
  seed: boolean;
}

export interface MigrationPlan {
  pending: readonly MigrationFile[];
  applied: readonly string[];
}

export interface MigrationResult {
  applied: readonly string[];
  dryRun: boolean;
}

const MIGRATION_FILE_PATTERN = /^(\d{3})_(.+)\.(up|down)\.sql$/;

export async function loadMigrationFiles(directory: string): Promise<readonly MigrationFile[]> {
  const names = (await readdir(directory)).filter((name) => MIGRATION_FILE_PATTERN.test(name)).sort();
  return Promise.all(names.map(async (name) => {
    const match = name.match(MIGRATION_FILE_PATTERN);
    if (!match) throw new Error(`Invalid migration filename: ${name}`);
    const path = join(directory, name);
    const sql = await Bun.file(path).text();
    return {
      id: `${match[1]}_${match[2]}`,
      name,
      path,
      direction: match[3] as MigrationDirection,
      sql,
      seed: match[2]?.startsWith("seed_") ?? false,
    };
  }));
}

export async function ensureMigrationTable(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function appliedMigrationIds(client: Client): Promise<readonly string[]> {
  await ensureMigrationTable(client);
  const result = await client.execute("SELECT id FROM _migrations ORDER BY id");
  return result.rows.map((row) => String(row.id));
}

export async function planMigrations(
  client: Client,
  files: readonly MigrationFile[],
  options: { includeSeeds: boolean },
): Promise<MigrationPlan> {
  const applied = await appliedMigrationIds(client);
  const appliedSet = new Set(applied);
  const pending = files
    .filter((file) => file.direction === "up")
    .filter((file) => options.includeSeeds || !file.seed)
    .filter((file) => !appliedSet.has(file.id));
  return { pending, applied };
}

export async function migrateUp(
  client: Client,
  files: readonly MigrationFile[],
  options: { dryRun?: boolean; includeSeeds?: boolean } = {},
): Promise<MigrationResult> {
  const plan = await planMigrations(client, files, { includeSeeds: options.includeSeeds ?? false });
  if (options.dryRun) return { applied: plan.pending.map((file) => file.id), dryRun: true };

  for (const file of plan.pending) {
    await executeTransactionalBatch(
      client,
      file.sql,
      `INSERT INTO _migrations (id, name, checksum) VALUES ('${sqlLiteral(file.id)}', '${sqlLiteral(file.name)}', '${sqlLiteral(await checksum(file.sql))}')`,
    );
  }
  return { applied: plan.pending.map((file) => file.id), dryRun: false };
}

export async function migrateDown(
  client: Client,
  files: readonly MigrationFile[],
  options: { dryRun?: boolean; steps?: number } = {},
): Promise<MigrationResult> {
  const applied = [...await appliedMigrationIds(client)];
  const steps = options.steps ?? 1;
  const targets = applied.slice(Math.max(0, applied.length - steps)).reverse();
  const downFiles = new Map(files.filter((file) => file.direction === "down").map((file) => [file.id, file]));
  const pending = targets.map((id) => {
    const file = downFiles.get(id);
    if (!file) throw new Error(`Missing down migration for ${id}.`);
    return file;
  });
  if (options.dryRun) return { applied: pending.map((file) => file.id), dryRun: true };

  for (const file of pending) {
    await executeTransactionalBatch(
      client,
      file.sql,
      `DELETE FROM _migrations WHERE id = '${sqlLiteral(file.id)}'`,
    );
  }
  return { applied: pending.map((file) => file.id), dryRun: false };
}

async function executeTransactionalBatch(client: Client, sql: string, trackingSql: string): Promise<void> {
  await client.executeMultiple(`BEGIN;\n${sql}\n${trackingSql};\nCOMMIT;`);
}

async function checksum(sql: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sql));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sqlLiteral(value: string): string {
  return value.replaceAll("'", "''");
}
