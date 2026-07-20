import { commaSeparatedEnv, createAuthConfig, integerEnv, type Environment } from "@eclick-one/shared";
import type { OnChainConfig } from "./onchain/OnChainClient";

export interface ApiConfig {
  host: string;
  port: number;
  corsOrigins: readonly string[];
  onchain: OnChainConfig | null;
  auth: ReturnType<typeof createAuthConfig>;
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

  return { host, port, corsOrigins, onchain, auth: createAuthConfig(env) };
}
