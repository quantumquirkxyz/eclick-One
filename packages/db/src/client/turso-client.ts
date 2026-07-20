import { createClient, type Client, type InArgs, type InStatement, type ResultSet, type Transaction, type TransactionMode } from "@libsql/client";
import type { Environment } from "@eclick-one/shared";
import { requiredEnv } from "@eclick-one/shared";
import { dbResilienceConfigFromEnv, DbResiliencePolicy, type DbResilienceConfig, type DbResilienceMetrics } from "./resilience";

export interface TursoConfig {
  url: string;
  authToken?: string;
  resilience: DbResilienceConfig;
}

export function tursoConfigFromEnv(env: Environment): TursoConfig {
  const url = requiredEnv(env, "TURSO_DATABASE_URL");
  const authToken = env.TURSO_AUTH_TOKEN?.trim() || undefined;
  const isRemote = /^libsql:|^https?:|^wss?:/i.test(url);
  if (isRemote && !authToken) {
    throw new Error("Missing required environment variable: TURSO_AUTH_TOKEN");
  }
  const resilience = dbResilienceConfigFromEnv(env, "TURSO");
  return authToken ? { url, authToken, resilience } : { url, resilience };
}

export class TursoClient {
  private readonly client: Client;
  private readonly resilience: DbResiliencePolicy;

  constructor(config: TursoConfig) {
    this.resilience = new DbResiliencePolicy(config.resilience);
    this.client = createClient(
      config.authToken
        ? {
            url: config.url,
            authToken: config.authToken,
            intMode: "number",
          }
        : {
            url: config.url,
            intMode: "number",
          },
    );
  }

  get connection(): Client {
    return this.client;
  }

  execute(stmtOrSql: InStatement | string, args?: InArgs): Promise<ResultSet> {
    return this.resilience.run(() => (typeof stmtOrSql === "string" ? this.client.execute(stmtOrSql, args) : this.client.execute(stmtOrSql)));
  }

  transaction(mode?: TransactionMode): Promise<Transaction> {
    return this.resilience.run(() => this.client.transaction(mode));
  }

  async ping(): Promise<void> {
    await this.execute("SELECT 1");
  }

  metrics(): DbResilienceMetrics {
    return this.resilience.snapshot();
  }

  async close(): Promise<void> {
    this.client.close();
  }
}
