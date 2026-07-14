import sql, { type config as SqlConfig, type ConnectionPool } from "mssql";
import { booleanEnv, integerEnv, requiredEnv, type Environment } from "@eclick-one/shared";

export function azureSqlConfigFromEnv(env: Environment): SqlConfig {
  return {
    server: requiredEnv(env, "AZURE_SQL_SERVER"),
    port: integerEnv(env, "AZURE_SQL_PORT", 1433, { min: 1, max: 65_535 }),
    database: requiredEnv(env, "AZURE_SQL_DATABASE"),
    user: requiredEnv(env, "AZURE_SQL_USER"),
    password: requiredEnv(env, "AZURE_SQL_PASSWORD"),
    options: {
      encrypt: booleanEnv(env, "AZURE_SQL_ENCRYPT", true),
      trustServerCertificate: booleanEnv(env, "AZURE_SQL_TRUST_SERVER_CERTIFICATE", false),
      enableArithAbort: true,
    },
    pool: {
      max: integerEnv(env, "AZURE_SQL_POOL_MAX", 10, { min: 1, max: 100 }),
      min: integerEnv(env, "AZURE_SQL_POOL_MIN", 0, { min: 0, max: 100 }),
      idleTimeoutMillis: integerEnv(env, "AZURE_SQL_POOL_IDLE_TIMEOUT_MS", 30_000, {
        min: 1_000,
        max: 600_000,
      }),
    },
  };
}

/** Owns one lazy, reusable pool and clears failed connection attempts for retry. */
export class AzureSqlClient {
  private poolPromise: Promise<ConnectionPool> | null = null;

  constructor(private readonly configuration: SqlConfig) {}

  getPool(): Promise<ConnectionPool> {
    if (!this.poolPromise) {
      this.poolPromise = new sql.ConnectionPool(this.configuration).connect().catch((error) => {
        this.poolPromise = null;
        throw error;
      });
    }
    return this.poolPromise;
  }

  async ping(): Promise<void> {
    const pool = await this.getPool();
    await pool.request().query("SELECT 1 AS healthy");
  }

  async close(): Promise<void> {
    if (!this.poolPromise) return;
    const pool = await this.poolPromise;
    this.poolPromise = null;
    await pool.close();
  }
}
