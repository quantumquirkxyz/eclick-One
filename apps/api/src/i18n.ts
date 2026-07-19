export type ApiLocale = "en" | "es";

export function localeFromRequest(request: Request): ApiLocale {
  const header = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return header.startsWith("es") ? "es" : "en";
}

export function apiText(locale: ApiLocale, key: keyof typeof messages.en): string {
  return messages[locale][key] ?? messages.en[key];
}

export function translateApiMessage(message: string, locale: ApiLocale): string {
  if (locale === "en") return englishMessageMap[message] ?? message;
  return spanishMessageMap[message] ?? message;
}

const messages = {
  en: {
    noRoute: "No route for {method} {pathname}.",
    internalError: "The service could not complete the request.",
    dashboardMock: "Synthetic in-memory data. Real persistence will be enabled with Turso.",
    dashboardSql: "Connected to Turso.",
    reportOrderStatus: "Orders by status",
    reportOrdersByMonth: "Orders by month",
    reportPaymentsByMonth: "Payments by month",
    reportInventory: "Inventory",
    reportTopProducts: "Most consumed products",
    reportCurrentOrders: "Current orders",
    reportPayments: "Payment history",
  },
  es: {
    noRoute: "No hay ruta para {method} {pathname}.",
    internalError: "El servicio no pudo completar la solicitud.",
    dashboardMock: "Datos sinteticos en memoria. La persistencia real se activara con Turso.",
    dashboardSql: "Conectado a Turso.",
    reportOrderStatus: "Pedidos por estado",
    reportOrdersByMonth: "Pedidos por mes",
    reportPaymentsByMonth: "Pagos por mes",
    reportInventory: "Inventario",
    reportTopProducts: "Productos mas consumidos",
    reportCurrentOrders: "Pedidos actuales",
    reportPayments: "Historial de pagos",
  },
} as const;

const spanishMessageMap: Record<string, string> = {
  "Resource not found.": "Recurso no encontrado.",
  "Invalid request.": "Solicitud invalida.",
  "Operation not allowed.": "Operacion no permitida.",
  "Service temporarily unavailable.": "Servicio temporalmente no disponible.",
  "Authentication failed.": "Autenticacion fallida.",
  "Refresh session is invalid.": "La sesion de actualizacion no es valida.",
  "Access token has been revoked.": "El token de acceso fue revocado.",
  "Too many authentication attempts.": "Demasiados intentos de autenticacion.",
  "email and password are required.": "email y password son obligatorios.",
  "codigo_cliente must be an integer.": "codigo_cliente debe ser un entero.",
  "estado is required.": "estado es obligatorio.",
  "codigo_pedido is required.": "codigo_pedido es obligatorio.",
  "Request body must be valid JSON.": "El cuerpo de la solicitud debe ser JSON valido.",
  "cantidad must be a positive integer.": "cantidad debe ser un entero positivo.",
  "fecha_entrega cannot be earlier than fecha_pedido.": "fecha_entrega no puede ser anterior a fecha_pedido.",
  "Order status is not allowed.": "El estado del pedido no esta permitido.",
  "Cannot register a payment for a cancelled order.": "No se puede registrar un pago para un pedido cancelado.",
  "Order is already paid.": "El pedido ya esta pagado.",
  "Cannot invoice an unpaid order.": "No se puede facturar un pedido sin pagar.",
  "provincia is required.": "provincia es obligatoria.",
};

const englishMessageMap: Record<string, string> = {
};
