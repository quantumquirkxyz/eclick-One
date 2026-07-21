import type { AuthController } from "../controllers/auth-controller";
import type { CommerceController } from "../controllers/commerce-controller";
import type { DocsController } from "../controllers/docs-controller";
import type { HealthController } from "../controllers/health-controller";
import type { Middleware } from "./router";
import { Router } from "./router";

export function createRouter(
  healthController: HealthController,
  docsController: DocsController,
  commerceController: CommerceController,
  authController: AuthController,
  authMiddleware: Middleware,
  viewerOrAbove: Middleware,
  operatorOrAbove: Middleware,
  adminOnly: Middleware,
): Router {
  const router = new Router();
  router.register("GET", "/api/v1/health", healthController.check);
  router.register("GET", "/api/v1/openapi.yaml", docsController.spec);
  router.register("GET", "/api/v1/docs", docsController.redirect);
  router.register("GET", "/docs", docsController.ui);
  router.register("POST", "/api/v1/auth/register", authController.register);
  router.register("POST", "/api/v1/auth/login", authController.login);
  router.register("POST", "/api/v1/auth/refresh", authController.refresh);
  router.register("POST", "/api/v1/auth/logout", authController.logout);
  router.register("GET", "/api/v1/auth/verify", authController.verify, [authMiddleware]);
  router.register("GET", "/api/v1/dashboard", commerceController.dashboard, [authMiddleware, viewerOrAbove]);
  router.register("GET", "/api/v1/provinces", commerceController.provinces, [authMiddleware, viewerOrAbove]);
  router.register("GET", "/api/v1/customers", commerceController.clients, [authMiddleware, viewerOrAbove]);
  router.register("GET", "/api/v1/clientes", commerceController.clients, [authMiddleware, viewerOrAbove]);
  router.register("GET", "/api/v1/customers/:codigo_cliente/preference", commerceController.clientPreference, [authMiddleware, viewerOrAbove]);
  router.register("GET", "/api/v1/products", commerceController.products, [authMiddleware, viewerOrAbove]);
  router.register("GET", "/api/v1/inventory", commerceController.inventory, [authMiddleware, viewerOrAbove]);
  router.register("GET", "/api/v1/orders", commerceController.orders, [authMiddleware, viewerOrAbove]);
  router.register("GET", "/api/v1/orders/current", commerceController.currentOrders, [authMiddleware, viewerOrAbove]);
  router.register("GET", "/api/v1/payments", commerceController.payments, [authMiddleware, viewerOrAbove]);
  router.register("GET", "/api/v1/reports", commerceController.reports, [authMiddleware, viewerOrAbove]);
  router.register("POST", "/api/v1/customers", commerceController.createClient, [authMiddleware, operatorOrAbove]);
  router.register("POST", "/api/v1/orders", commerceController.createOrder, [authMiddleware, operatorOrAbove]);
  router.register("POST", "/api/v1/payments", commerceController.recordPayment, [authMiddleware, operatorOrAbove]);
  router.register("POST", "/api/v1/compliance/report", commerceController.reportCompliance, [authMiddleware, operatorOrAbove]);
  router.register("PATCH", "/api/v1/orders/:codigo_pedido/status", commerceController.transitionOrderStatus, [authMiddleware, operatorOrAbove]);
  router.register("GET", "/api/v1/orders/:codigo_pedido/onchain", commerceController.orderOnChainStatus, [authMiddleware, viewerOrAbove]);
  return router;
}
