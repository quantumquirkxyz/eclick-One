import type { CommerceService } from "../services/commerce-service";
import type { ControllerResult } from "./controller";

export class CommerceController {
  constructor(private readonly service: CommerceService) {}

  dashboard = async (): Promise<ControllerResult> => ({ body: await this.service.getDashboard() });
  provinces = async (): Promise<ControllerResult> => ({ body: await this.service.listProvinces() });
  clients = async (): Promise<ControllerResult> => ({ body: await this.service.listClients() });
  products = async (): Promise<ControllerResult> => ({ body: await this.service.listProducts() });
  inventory = async (): Promise<ControllerResult> => ({ body: await this.service.listInventory() });
  orders = async (): Promise<ControllerResult> => ({ body: await this.service.listOrders() });
  payments = async (): Promise<ControllerResult> => ({ body: await this.service.listPayments() });
  reports = async (): Promise<ControllerResult> => ({ body: await this.service.getReports() });
}
