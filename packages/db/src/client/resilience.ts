import { integerEnv, type Environment } from "@eclick-one/shared";

export interface DbResilienceConfig {
  poolMin: number;
  poolMax: number;
  connectionTimeoutMs: number;
  queryTimeoutMs: number;
  retryDelaysMs: readonly number[];
  jitterRatio: number;
  circuitBreakerFailures: number;
  circuitBreakerResetMs: number;
}

export interface DbResilienceMetrics {
  state: "closed" | "open" | "half-open";
  consecutiveFailures: number;
  active: number;
  idle: number;
  waiting: number;
  poolMin: number;
  poolMax: number;
}

const DEFAULT_RETRY_DELAYS = [100, 500, 1_000] as const;

export function dbResilienceConfigFromEnv(env: Environment, prefix: string): DbResilienceConfig {
  return {
    poolMin: integerEnv(env, `${prefix}_POOL_MIN`, 2, { min: 0, max: 10 }),
    poolMax: integerEnv(env, `${prefix}_POOL_MAX`, 10, { min: 1, max: 10 }),
    connectionTimeoutMs: integerEnv(env, `${prefix}_CONNECTION_TIMEOUT_MS`, 5_000, { min: 500, max: 60_000 }),
    queryTimeoutMs: integerEnv(env, `${prefix}_QUERY_TIMEOUT_MS`, 10_000, { min: 500, max: 120_000 }),
    retryDelaysMs: DEFAULT_RETRY_DELAYS,
    jitterRatio: 0.2,
    circuitBreakerFailures: integerEnv(env, `${prefix}_CIRCUIT_BREAKER_FAILURES`, 5, { min: 1, max: 50 }),
    circuitBreakerResetMs: integerEnv(env, `${prefix}_CIRCUIT_BREAKER_RESET_MS`, 30_000, { min: 1_000, max: 600_000 }),
  };
}

export class DbResiliencePolicy {
  private consecutiveFailures = 0;
  private openedAt = 0;
  private active = 0;
  private waiting = 0;

  constructor(
    private readonly config: DbResilienceConfig,
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    private readonly random: () => number = Math.random,
  ) {
    if (config.poolMin > config.poolMax) {
      throw new Error("Database pool min cannot exceed pool max.");
    }
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (true) {
      this.assertCircuitAllowsAttempt();
      try {
        this.active += 1;
        const result = await withTimeout(operation(), this.config.queryTimeoutMs);
        this.recordSuccess();
        return result;
      } catch (error) {
        this.recordFailure();
        if (attempt >= this.config.retryDelaysMs.length || !isTransientDatabaseError(error)) {
          throw error;
        }
        await this.delay(attempt);
        attempt += 1;
      } finally {
        this.active = Math.max(0, this.active - 1);
      }
    }
  }

  snapshot(): DbResilienceMetrics {
    return {
      state: this.currentState(),
      consecutiveFailures: this.consecutiveFailures,
      active: this.active,
      idle: Math.max(0, this.config.poolMin - this.active),
      waiting: this.waiting,
      poolMin: this.config.poolMin,
      poolMax: this.config.poolMax,
    };
  }

  private async delay(attempt: number): Promise<void> {
    const base = this.config.retryDelaysMs[attempt] ?? this.config.retryDelaysMs.at(-1) ?? 100;
    const jitter = base * this.config.jitterRatio * (this.random() * 2 - 1);
    await this.sleep(Math.max(0, Math.round(base + jitter)));
  }

  private assertCircuitAllowsAttempt(): void {
    if (this.currentState() === "open") {
      throw new Error("Database circuit breaker is open.");
    }
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = 0;
  }

  private recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.config.circuitBreakerFailures) {
      this.openedAt = Date.now();
    }
  }

  private currentState(): DbResilienceMetrics["state"] {
    if (this.openedAt === 0) return "closed";
    return Date.now() - this.openedAt >= this.config.circuitBreakerResetMs ? "half-open" : "open";
  }
}

function isTransientDatabaseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return ["timeout", "temporarily", "transient", "econnreset", "econnrefused", "too many connections", "database is locked", "rate limit"].some((term) =>
    message.includes(term),
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Database query timed out after ${timeoutMs}ms.`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
