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
  router.register("GET", "/api/v1/products", commerceController.products);
  router.register("GET", "/api/v1/inventory", commerceController.inventory);
  router.register("GET", "/api/v1/orders", commerceController.orders);
  router.register("GET", "/api/v1/payments", commerceController.payments);
  router.register("GET", "/api/v1/reports", commerceController.reports);
  return router;
}
