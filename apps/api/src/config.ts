import { commaSeparatedEnv, integerEnv, type Environment } from "@eclick-one/shared";

export interface ApiConfig {
  host: string;
  port: number;
  corsOrigins: readonly string[];
}

export function loadApiConfig(env: Environment): ApiConfig {
  const host = env.API_HOST?.trim() || "0.0.0.0";
  const port = integerEnv(env, "API_PORT", 3000, { min: 1, max: 65_535 });
  const corsOrigins = commaSeparatedEnv(env, "CORS_ORIGINS", ["http://localhost:5173"]);
  return { host, port, corsOrigins };
}
