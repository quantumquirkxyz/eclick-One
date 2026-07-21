import { afterEach, describe, expect, test } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { appliedMigrationIds, loadMigrationFiles, migrateDown, migrateUp, planMigrations } from "./runner";

const clients: Client[] = [];
const migrationsDir = new URL("../../migrations", import.meta.url).pathname;

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

describe("database migrations", () => {
  test("plans pending migrations without applying them in dry-run mode", async () => {
    const client = memoryClient();
    const files = await loadMigrationFiles(migrationsDir);

    const result = await migrateUp(client, files, { dryRun: true, includeSeeds: true });

    expect(result.dryRun).toBe(true);
    expect(result.applied).toEqual(["001_initial_schema", "002_seed_reference_data", "003_auth_tables"]);
    expect(await appliedMigrationIds(client)).toEqual([]);
  });

  test("applies schema migrations idempotently", async () => {
    const client = memoryClient();
    const files = await loadMigrationFiles(migrationsDir);

    expect(await migrateUp(client, files)).toMatchObject({ applied: ["001_initial_schema", "003_auth_tables"], dryRun: false });
    expect(await migrateUp(client, files)).toMatchObject({ applied: [], dryRun: false });

    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'PEDIDO'");
    expect(tables.rows).toHaveLength(1);
    const authTables = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'USUARIO'");
    expect(authTables.rows).toHaveLength(1);
    expect(await appliedMigrationIds(client)).toEqual(["001_initial_schema", "003_auth_tables"]);
  });

  test("applies seed migrations separately from schema migrations", async () => {
    const client = memoryClient();
    const files = await loadMigrationFiles(migrationsDir);
    await migrateUp(client, files);

    const beforeSeed = await planMigrations(client, files, { includeSeeds: true });
    expect(beforeSeed.pending.map((file) => file.id)).toEqual(["002_seed_reference_data"]);

    await migrateUp(client, files, { includeSeeds: true });
    const products = await client.execute("SELECT id_producto FROM PRODUCTO WHERE id_producto >= 1000 ORDER BY id_producto");
    expect(products.rows.map((row) => row.id_producto)).toEqual([1000, 1001, 1002, 1003]);
    expect(await appliedMigrationIds(client)).toEqual(["001_initial_schema", "002_seed_reference_data", "003_auth_tables"]);
  });

  test("rolls migrations down in reverse order", async () => {
    const client = memoryClient();
    const files = await loadMigrationFiles(migrationsDir);
    await migrateUp(client, files, { includeSeeds: true });

    expect(await migrateDown(client, files)).toMatchObject({ applied: ["003_auth_tables"] });
    expect(await appliedMigrationIds(client)).toEqual(["001_initial_schema", "002_seed_reference_data"]);

    expect(await migrateDown(client, files)).toMatchObject({ applied: ["002_seed_reference_data"] });
    expect(await appliedMigrationIds(client)).toEqual(["001_initial_schema"]);

    expect(await migrateDown(client, files)).toMatchObject({ applied: ["001_initial_schema"] });
    expect(await appliedMigrationIds(client)).toEqual([]);
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'PEDIDO'");
    expect(tables.rows).toHaveLength(0);
  });
});

function memoryClient(): Client {
  const client = createClient({ url: ":memory:", intMode: "number" });
  clients.push(client);
  return client;
}
