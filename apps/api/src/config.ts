import { commaSeparatedEnv, integerEnv, type Environment } from "@eclick-one/shared";
import type { OnChainConfig } from "./onchain/OnChainClient";
import type { AuthSessionConfig } from "./services/auth-session-service";

export interface ApiConfig {
  host: string;
  port: number;
  corsOrigins: readonly string[];
  onchain: OnChainConfig | null;
  auth: AuthSessionConfig;
}

export function loadApiConfig(env: Environment): ApiConfig {
  const host = env.API_HOST?.trim() || "0.0.0.0";
  const port = integerEnv(env, "API_PORT", 3000, { min: 1, max: 65_535 });
  const corsOrigins = commaSeparatedEnv(env, "CORS_ORIGINS", ["http://localhost:5173"]);

  const rpcUrl = env.ONCHAIN_RPC_URL?.trim();
  const orderManagerAddress = env.ONCHAIN_ORDER_MANAGER_ADDRESS?.trim();
  const collectorPrivateKey = env.ONCHAIN_COLLECTOR_PRIVATE_KEY?.trim();

  const onchain: OnChainConfig | null =
    rpcUrl && orderManagerAddress && collectorPrivateKey
      ? {
          rpcUrl,
          chainId: integerEnv(env, "ONCHAIN_CHAIN_ID", 31337, { min: 1, max: 2_147_483_647 }),
          orderManagerAddress: orderManagerAddress as `0x${string}`,
          paymentLedgerAddress: (env.ONCHAIN_PAYMENT_LEDGER_ADDRESS?.trim() ?? orderManagerAddress) as `0x${string}`,
          collectorPrivateKey,
        }
      : null;

  const jwtSecret = env.AUTH_JWT_SECRET?.trim();
  if (env.NODE_ENV === "production" && !jwtSecret) {
    throw new Error("AUTH_JWT_SECRET is required in production.");
  }

  const auth: AuthSessionConfig = {
    accessTokenTtlSeconds: integerEnv(env, "AUTH_ACCESS_TOKEN_TTL_SECONDS", 900, { min: 60, max: 86_400 }),
    refreshTokenTtlSeconds: integerEnv(env, "AUTH_REFRESH_TOKEN_TTL_SECONDS", 604_800, { min: 300, max: 2_592_000 }),
    authRateLimitAttempts: integerEnv(env, "AUTH_RATE_LIMIT_ATTEMPTS", 5, { min: 1, max: 100 }),
    authRateLimitWindowSeconds: integerEnv(env, "AUTH_RATE_LIMIT_WINDOW_SECONDS", 60, { min: 1, max: 3_600 }),
    jwtSecret: jwtSecret || "development-only-auth-secret-change-before-production",
  };

  return { host, port, corsOrigins, onchain, auth };
}
