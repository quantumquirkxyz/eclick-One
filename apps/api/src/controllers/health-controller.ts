import type { HealthService } from "../services/health-service";
import type { ControllerResult } from "./controller";

export class HealthController {
  constructor(private readonly service: HealthService) {}

  check = async (request: Request): Promise<ControllerResult> => {
    const deep = new URL(request.url).searchParams.get("deep") === "true";
    return { body: await this.service.check(deep) };
  };
}
