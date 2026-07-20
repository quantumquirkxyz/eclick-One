import { localeFromRequest } from "../i18n";
import {
  parseClientCode,
  parseOrderCode,
  readClientBody,
  readOrderBody,
  readPaymentBody,
  readStatusTransitionBody,
} from "../http/validation";
import type { CommerceService } from "../services/commerce-service";
import type { ControllerResult } from "./controller";

export class CommerceController {
  constructor(private readonly service: CommerceService) {}

  dashboard = async (request: Request): Promise<ControllerResult> => ({ body: await this.service.getDashboard(localeFromRequest(request)) });
  provinces = async (): Promise<ControllerResult> => ({ body: await this.service.listProvinces() });
  clients = async (): Promise<ControllerResult> => ({ body: await this.service.listClients() });
  currentOrders = async (): Promise<ControllerResult> => ({ body: await this.service.listCurrentOrders() });
  products = async (): Promise<ControllerResult> => ({ body: await this.service.listProducts() });
  inventory = async (): Promise<ControllerResult> => ({ body: await this.service.listInventory() });
  orders = async (): Promise<ControllerResult> => ({ body: await this.service.listOrders() });
  payments = async (): Promise<ControllerResult> => ({ body: await this.service.listPayments() });
  reports = async (request: Request): Promise<ControllerResult> => ({ body: await this.service.getReports(localeFromRequest(request)) });

  clientPreference = async (_request: Request, params: Record<string, string>): Promise<ControllerResult> => {
    const codigo = parseClientCode(params.codigo_cliente);
    return { body: await this.service.getClientPreference(codigo) };
  };

  createClient = async (request: Request): Promise<ControllerResult> => {
    const body = await readClientBody(request);
    return { status: 201, body: await this.service.createClient(body) };
  };

  createOrder = async (request: Request): Promise<ControllerResult> => {
    const body = await readOrderBody(request);
    return { status: 201, body: await this.service.createOrder(body) };
  };

  recordPayment = async (request: Request): Promise<ControllerResult> => {
    const body = await readPaymentBody(request);
    return { status: 201, body: await this.service.recordPayment(body) };
  };

  orderOnChainStatus = async (_request: Request, params: Record<string, string>): Promise<ControllerResult> => {
    const codigoPedido = parseOrderCode(params.codigo_pedido);
    return { body: await this.service.getOrderOnChainStatus(codigoPedido) };
  };

  transitionOrderStatus = async (request: Request, params: Record<string, string>): Promise<ControllerResult> => {
    const body = await readStatusTransitionBody(request);
    const codigoPedido = parseOrderCode(params.codigo_pedido);
    return {
      body: await this.service.transitionOrderStatus({
        codigo_pedido: codigoPedido,
        estado: body.estado,
      }),
    };
  };
}
