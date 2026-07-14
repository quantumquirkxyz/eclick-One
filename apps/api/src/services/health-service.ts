import type { DatabaseContext } from "../database/database";

export class HealthService {
  constructor(private readonly database: DatabaseContext) {}

  async check(deep: boolean) {
    const startedAt = performance.now();
    if (deep) await this.database.ping();
    return {
      status: "ok" as const,
      service: "eclick-one-api",
      repositoryMode: this.database.mode,
      database: deep ? "reachable" : "not_checked",
      responseTimeMs: Math.round((performance.now() - startedAt) * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }
}
