import type { OrderStatus, NewClient, NewOrder, NewPayment } from "@eclick-one/domain";
import { BadRequestError } from "../errors/app-error";
import type { CommerceService } from "../services/commerce-service";
import type { ControllerResult } from "./controller";

export class CommerceController {
  constructor(private readonly service: CommerceService) {}

  dashboard = async (): Promise<ControllerResult> => ({ body: await this.service.getDashboard() });
  provinces = async (): Promise<ControllerResult> => ({ body: await this.service.listProvinces() });
  clients = async (): Promise<ControllerResult> => ({ body: await this.service.listClients() });
  currentOrders = async (): Promise<ControllerResult> => ({ body: await this.service.listCurrentOrders() });
  products = async (): Promise<ControllerResult> => ({ body: await this.service.listProducts() });
  inventory = async (): Promise<ControllerResult> => ({ body: await this.service.listInventory() });
  orders = async (): Promise<ControllerResult> => ({ body: await this.service.listOrders() });
  payments = async (): Promise<ControllerResult> => ({ body: await this.service.listPayments() });
  reports = async (): Promise<ControllerResult> => ({ body: await this.service.getReports() });

  clientPreference = async (_request: Request, params: Record<string, string>): Promise<ControllerResult> => {
    const codigo = Number(params.codigo_cliente);
    if (!Number.isInteger(codigo)) {
      throw new BadRequestError("codigo_cliente must be an integer.");
    }
    return { body: await this.service.getClientPreference(codigo) };
  };

  createClient = async (request: Request): Promise<ControllerResult> => {
    const body = await readJson<NewClient>(request);
    return { status: 201, body: await this.service.createClient(body) };
  };

  createOrder = async (request: Request): Promise<ControllerResult> => {
    const body = await readJson<NewOrder>(request);
    return { status: 201, body: await this.service.createOrder(body) };
  };

  recordPayment = async (request: Request): Promise<ControllerResult> => {
    const body = await readJson<NewPayment>(request);
    return { status: 201, body: await this.service.recordPayment(body) };
  };

  transitionOrderStatus = async (request: Request, params: Record<string, string>): Promise<ControllerResult> => {
    const body = await readJson<{ estado: OrderStatus }>(request);
    if (!body.estado) {
      throw new BadRequestError("estado is required.");
    }
    const codigoPedido = params.codigo_pedido;
    if (!codigoPedido) {
      throw new BadRequestError("codigo_pedido is required.");
    }
    return {
      body: await this.service.transitionOrderStatus({
        codigo_pedido: codigoPedido,
        estado: body.estado,
      }),
    };
  };
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
}
