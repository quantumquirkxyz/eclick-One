import type { DatabaseContext } from "../database/database";

export interface HealthCheckResult {
  status: "ok";
  service: string;
  repositoryMode: string;
  database: string;
  responseTimeMs: number;
  timestamp: string;
  uptime: number;
}

export class HealthService {
  private readonly startedAt = Date.now();

  constructor(private readonly database: DatabaseContext) {}

  async check(deep: boolean): Promise<HealthCheckResult> {
    const startedAt = performance.now();
    if (deep) await this.database.ping();
    return {
      status: "ok",
      service: "eclick-one-api",
      repositoryMode: this.database.mode,
      database: deep ? "reachable" : "not_checked",
      responseTimeMs: Math.round((performance.now() - startedAt) * 100) / 100,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }
}
