import type { BlockchainService } from "../services/blockchain-service";
import type { ControllerResult } from "./controller";

export class BlockchainController {
  constructor(private readonly service: BlockchainService) {}

  check = async (): Promise<ControllerResult> => ({ body: await this.service.check() });
}
