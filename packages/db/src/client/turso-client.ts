import { createClient, type Client } from "@libsql/client";
import type { Environment } from "@eclick-one/shared";
import { requiredEnv } from "@eclick-one/shared";

export interface TursoConfig {
  url: string;
  authToken?: string;
}

export function tursoConfigFromEnv(env: Environment): TursoConfig {
  const url = requiredEnv(env, "TURSO_DATABASE_URL");
  const authToken = env.TURSO_AUTH_TOKEN?.trim() || undefined;
  const isRemote = /^libsql:|^https?:|^wss?:/i.test(url);
  if (isRemote && !authToken) {
    throw new Error("Missing required environment variable: TURSO_AUTH_TOKEN");
  }
  return authToken ? { url, authToken } : { url };
}

export class TursoClient {
  private readonly client: Client;

  constructor(config: TursoConfig) {
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

  async ping(): Promise<void> {
    await this.client.execute("SELECT 1");
  }

  async close(): Promise<void> {
    this.client.close();
  }
}
