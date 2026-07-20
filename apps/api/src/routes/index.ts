import type { AuthController } from "../controllers/auth-controller";
import type { CommerceController } from "../controllers/commerce-controller";
import type { HealthController } from "../controllers/health-controller";
import type { Middleware } from "./router";
import { Router } from "./router";

export function createRouter(
  healthController: HealthController,
  commerceController: CommerceController,
  authController: AuthController,
  authMiddleware: Middleware,
): Router {
  const router = new Router();
  router.register("GET", "/api/v1/health", healthController.check);
  router.register("POST", "/api/v1/auth/register", authController.register);
  router.register("POST", "/api/v1/auth/login", authController.login);
  router.register("POST", "/api/v1/auth/refresh", authController.refresh);
  router.register("POST", "/api/v1/auth/logout", authController.logout);
  router.register("GET", "/api/v1/auth/verify", authController.verify, [authMiddleware]);
  router.register("GET", "/api/v1/dashboard", commerceController.dashboard, [authMiddleware]);
  router.register("GET", "/api/v1/provinces", commerceController.provinces, [authMiddleware]);
  router.register("GET", "/api/v1/customers", commerceController.clients, [authMiddleware]);
  router.register("GET", "/api/v1/clientes", commerceController.clients, [authMiddleware]);
  router.register("GET", "/api/v1/customers/:codigo_cliente/preference", commerceController.clientPreference, [authMiddleware]);
  router.register("GET", "/api/v1/products", commerceController.products, [authMiddleware]);
  router.register("GET", "/api/v1/inventory", commerceController.inventory, [authMiddleware]);
  router.register("GET", "/api/v1/orders", commerceController.orders, [authMiddleware]);
  router.register("GET", "/api/v1/orders/current", commerceController.currentOrders, [authMiddleware]);
  router.register("GET", "/api/v1/payments", commerceController.payments, [authMiddleware]);
  router.register("GET", "/api/v1/reports", commerceController.reports, [authMiddleware]);
  router.register("POST", "/api/v1/customers", commerceController.createClient, [authMiddleware]);
  router.register("POST", "/api/v1/orders", commerceController.createOrder, [authMiddleware]);
  router.register("POST", "/api/v1/payments", commerceController.recordPayment, [authMiddleware]);
  router.register("PATCH", "/api/v1/orders/:codigo_pedido/status", commerceController.transitionOrderStatus, [authMiddleware]);
  router.register("GET", "/api/v1/orders/:codigo_pedido/onchain", commerceController.orderOnChainStatus, [authMiddleware]);
  return router;
}
