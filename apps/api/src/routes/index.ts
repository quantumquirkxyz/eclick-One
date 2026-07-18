import type { CommerceController } from "../controllers/commerce-controller";
import type { HealthController } from "../controllers/health-controller";
import { Router } from "./router";

export function createRouter(
  healthController: HealthController,
  commerceController: CommerceController,
): Router {
  const router = new Router();
  router.register("GET", "/api/v1/health", healthController.check);
  router.register("GET", "/api/v1/dashboard", commerceController.dashboard);
  router.register("GET", "/api/v1/provinces", commerceController.provinces);
  router.register("GET", "/api/v1/customers", commerceController.clients);
  router.register("GET", "/api/v1/clientes", commerceController.clients);
  router.register("GET", "/api/v1/customers/:codigo_cliente/preference", commerceController.clientPreference);
  router.register("GET", "/api/v1/products", commerceController.products);
  router.register("GET", "/api/v1/inventory", commerceController.inventory);
  router.register("GET", "/api/v1/orders", commerceController.orders);
  router.register("GET", "/api/v1/orders/current", commerceController.currentOrders);
  router.register("GET", "/api/v1/payments", commerceController.payments);
  router.register("GET", "/api/v1/reports", commerceController.reports);
  router.register("POST", "/api/v1/customers", commerceController.createClient);
  router.register("POST", "/api/v1/orders", commerceController.createOrder);
  router.register("POST", "/api/v1/payments", commerceController.recordPayment);
  router.register("PATCH", "/api/v1/orders/:codigo_pedido/status", commerceController.transitionOrderStatus);
  router.register("GET", "/api/v1/orders/:codigo_pedido/onchain", commerceController.orderOnChainStatus);
  return router;
}
