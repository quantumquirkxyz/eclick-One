import { describe, expect, test } from "bun:test";
import { DbResiliencePolicy, dbResilienceConfigFromEnv } from "./resilience";

describe("DbResiliencePolicy", () => {
  test("retries transient failures with configured backoff", async () => {
    const delays: number[] = [];
    const policy = new DbResiliencePolicy(
      { ...dbResilienceConfigFromEnv({}, "DB"), retryDelaysMs: [100, 500, 1_000], jitterRatio: 0 },
      async (ms) => { delays.push(ms); },
      () => 0.5,
    );
    let attempts = 0;
    const result = await policy.run(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("database is locked");
      return "ok";
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(delays).toEqual([100, 500]);
    expect(policy.snapshot()).toMatchObject({ state: "closed", consecutiveFailures: 0 });
  });

  test("opens the circuit breaker after consecutive failures", async () => {
    const policy = new DbResiliencePolicy(
      { ...dbResilienceConfigFromEnv({}, "DB"), retryDelaysMs: [], circuitBreakerFailures: 2 },
      async () => {},
    );

    await expect(policy.run(async () => { throw new Error("database is locked"); })).rejects.toThrow("database is locked");
    await expect(policy.run(async () => { throw new Error("database is locked"); })).rejects.toThrow("database is locked");
    expect(policy.snapshot().state).toBe("open");
    await expect(policy.run(async () => "unreachable")).rejects.toThrow("Database circuit breaker is open.");
  });
});
