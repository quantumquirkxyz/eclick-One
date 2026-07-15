import { createClient } from "@libsql/client";
import { requiredEnv } from "@eclick-one/shared";

const url = requiredEnv(Bun.env, "TURSO_DATABASE_URL");
const authToken = requiredEnv(Bun.env, "TURSO_AUTH_TOKEN");
const schema = await Bun.file(new URL("../sql/turso-schema.sql", import.meta.url)).text();

const client = createClient({ url, authToken });

try {
  await client.executeMultiple(schema);
  console.info("Turso schema applied successfully.");
} finally {
  client.close();
}
