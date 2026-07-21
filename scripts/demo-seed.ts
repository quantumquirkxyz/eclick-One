import { setTimeout as delay } from "node:timers/promises";

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type Province = {
  id: string;
  codigo: string;
  nombre: string;
  prefijo: string;
};

type Client = {
  codigo_cliente: number;
  nombre: string;
  apellido: string;
  identificacion: string;
  provincia: Province;
  tipo_tarjeta: "DB" | "CR";
  paz_y_salvo: boolean;
};

type Product = {
  codigo_producto: number;
  nombre: string;
  categoria: string;
};

type Order = {
  codigo_pedido: string;
  codigo_cliente: number;
  codigo_producto: number;
  cantidad: number;
  monto: number;
  etiqueta: string;
  direccion: string;
  fecha_pedido: string;
  fecha_entrega?: string;
  estado: "generado" | "proceso" | "entregado" | "cancelado" | "facturado";
  tipo_duracion: string;
  pagado?: boolean;
};

type Payment = {
  id_pago: number;
  codigo_pedido: string;
  monto_pagado: number;
  fecha_pago: string;
  tipo_tarjeta: "DB" | "CR";
  referencia?: string;
};

const apiBaseUrl = (Bun.env.DEMO_API_URL ?? "http://localhost:3000/api/v1").replace(/\/$/, "");
const demoIdentity = {
  email: Bun.env.DEMO_SEED_EMAIL ?? "demo.operator@eclick.one",
  nombre: Bun.env.DEMO_SEED_FIRST_NAME ?? "Demo",
  apellido: Bun.env.DEMO_SEED_LAST_NAME ?? "Operator",
  password: Bun.env.DEMO_SEED_PASSWORD ?? "DemoSeedPassword-2026",
};

const customerPlans = [
  {
    nombre: "Valeria",
    apellido: "Delgado",
    identificacion: "8-555-101",
    provinciaCodigo: "PA",
    tipo_tarjeta: "CR" as const,
    paz_y_salvo: true,
    numero_tarjeta: "4111111111110101",
    email: "valeria.delgado@demo.eclick.one",
    phone: "+507 6990-0101",
  },
  {
    nombre: "Oscar",
    apellido: "Bermudez",
    identificacion: "4-555-102",
    provinciaCodigo: "CH",
    tipo_tarjeta: "DB" as const,
    paz_y_salvo: true,
    numero_tarjeta: "4111111111110102",
    email: "oscar.bermudez@demo.eclick.one",
    phone: "+507 6990-0102",
  },
  {
    nombre: "Natalia",
    apellido: "Fong",
    identificacion: "2-555-103",
    provinciaCodigo: "WP",
    tipo_tarjeta: "CR" as const,
    paz_y_salvo: true,
    numero_tarjeta: "4111111111110103",
    email: "natalia.fong@demo.eclick.one",
    phone: "+507 6990-0103",
  },
];

const orderPlans = [
  {
    etiqueta: "demo-script-onboarding",
    customerIdentification: "8-555-101",
    productCode: 1000,
    cantidad: 1,
    direccion: "Demo Tower 1, Calle 50, Panama",
    fecha_pedido: "2026-07-18T10:00:00.000Z",
    tipo_duracion: "48h",
    targetStatus: "proceso" as const,
  },
  {
    etiqueta: "demo-script-order-lifecycle",
    customerIdentification: "4-555-102",
    productCode: 1006,
    cantidad: 2,
    direccion: "Logistics Center 4, David, Chiriqui",
    fecha_pedido: "2026-07-17T09:30:00.000Z",
    tipo_duracion: "48h",
    targetStatus: "facturado" as const,
    paymentDate: "2026-07-17T11:45:00.000Z",
    paymentCardType: "DB" as const,
    paymentReference: "DEMO-WALK-001",
  },
  {
    etiqueta: "demo-script-cancelled-order",
    customerIdentification: "2-555-103",
    productCode: 1014,
    cantidad: 1,
    direccion: "Retail Plaza 8, Arraijan, West Panama",
    fecha_pedido: "2026-07-16T14:15:00.000Z",
    tipo_duracion: "48h",
    targetStatus: "cancelado" as const,
  },
];

const expectedMinimums = {
  provinces: 10,
  customers: 15,
  products: 20,
  orders: 25,
  payments: 15,
};

const headers = {
  "content-type": "application/json",
};

const health = await waitForHealth();
console.log(`[demo:seed] API ready in ${Math.round(health.uptime ?? 0)}s at ${apiBaseUrl}`);

const tokens = await registerOrLogin();
const authHeaders = {
  ...headers,
  Authorization: `Bearer ${tokens.accessToken}`,
};

const provinces = await request<Province[]>("/provinces", { headers: authHeaders });
const products = await request<Product[]>("/products", { headers: authHeaders });
let customers = await request<Client[]>("/customers", { headers: authHeaders });
let orders = await request<Order[]>("/orders", { headers: authHeaders });
let payments = await request<Payment[]>("/payments", { headers: authHeaders });

assertMinimum("provinces", provinces.length, expectedMinimums.provinces);
assertMinimum("products", products.length, expectedMinimums.products);

for (const plan of customerPlans) {
  if (customers.some((customer) => customer.identificacion === plan.identificacion)) {
    continue;
  }
  const provincia = provinces.find((item) => item.codigo === plan.provinciaCodigo);
  if (!provincia) {
    throw new Error(`Missing province ${plan.provinciaCodigo}; demo seed requires reference data.`);
  }
  await request("/customers", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      nombre: plan.nombre,
      apellido: plan.apellido,
      identificacion: plan.identificacion,
      provincia,
      tipo_tarjeta: plan.tipo_tarjeta,
      paz_y_salvo: plan.paz_y_salvo,
      numero_tarjeta: plan.numero_tarjeta,
      email: plan.email,
      phone: plan.phone,
    }),
  });
}

customers = await request<Client[]>("/customers", { headers: authHeaders });

for (const plan of orderPlans) {
  const customer = customers.find((item) => item.identificacion === plan.customerIdentification);
  if (!customer) {
    throw new Error(`Customer ${plan.customerIdentification} was not available after seeding.`);
  }
  const existingOrder = orders.find((order) => order.etiqueta === plan.etiqueta);
  const order = existingOrder ?? await request<Order>("/orders", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      codigo_cliente: customer.codigo_cliente,
      codigo_producto: plan.productCode,
      cantidad: plan.cantidad,
      direccion: plan.direccion,
      fecha_pedido: plan.fecha_pedido,
      etiqueta: plan.etiqueta,
      tipo_duracion: plan.tipo_duracion,
    }),
  });

  await ensureOrderState(order, plan, authHeaders);
}

customers = await request<Client[]>("/customers", { headers: authHeaders });
orders = await request<Order[]>("/orders", { headers: authHeaders });
payments = await request<Payment[]>("/payments", { headers: authHeaders });

const dashboard = await request<{
  metrics: {
    clients: number;
    products: number;
    orders: number;
    currentOrders: number;
    collected: number;
    notPazYSalvo: number;
    atRiskOrders: number;
  };
}>("/dashboard", { headers: authHeaders });
const reports = await request<{ sections: readonly { key: string; title: string }[] }>("/reports", { headers: authHeaders });

assertMinimum("customers", customers.length, expectedMinimums.customers);
assertMinimum("orders", orders.length, expectedMinimums.orders);
assertMinimum("payments", payments.length, expectedMinimums.payments);

console.log("[demo:seed] Demo dataset summary");
console.log(`  Provinces: ${provinces.length}`);
console.log(`  Customers: ${customers.length}`);
console.log(`  Products: ${products.length}`);
console.log(`  Orders: ${orders.length}`);
console.log(`  Payments: ${payments.length}`);
console.log(`  Dashboard metrics: ${JSON.stringify(dashboard.metrics)}`);
console.log(`  Reports: ${reports.sections.map((section) => section.title).join(", ")}`);
console.log(`[demo:seed] Demo credentials: ${demoIdentity.email} / ${demoIdentity.password}`);

async function ensureOrderState(
  initialOrder: Order,
  plan: (typeof orderPlans)[number],
  authHeaders: Record<string, string>,
): Promise<void> {
  let order = initialOrder;

  if (plan.targetStatus === "cancelado") {
    if (order.estado === "generado" || order.estado === "proceso") {
      await transitionOrder(order.codigo_pedido, "cancelado", authHeaders);
    }
    return;
  }

  if (order.estado === "generado" && plan.targetStatus !== "generado") {
    order = await transitionOrder(order.codigo_pedido, "proceso", authHeaders);
  }

  if (plan.paymentReference) {
    const payments = await request<Payment[]>("/payments", { headers: authHeaders });
    const alreadyPaid = payments.some((payment) => payment.referencia === plan.paymentReference);
    if (!alreadyPaid) {
      await request("/payments", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          codigo_pedido: order.codigo_pedido,
          monto_pagado: order.monto,
          fecha_pago: plan.paymentDate ?? new Date().toISOString(),
          tipo_tarjeta: plan.paymentCardType ?? "CR",
          referencia: plan.paymentReference,
        }),
      });
    }
  }

  const refreshed = await request<Order[]>("/orders", { headers: authHeaders });
  order = refreshed.find((item) => item.codigo_pedido === order.codigo_pedido) ?? order;

  if (plan.targetStatus === "proceso") {
    return;
  }
  if (plan.targetStatus === "entregado" || plan.targetStatus === "facturado") {
    if (order.estado === "proceso") {
      order = await transitionOrder(order.codigo_pedido, "entregado", authHeaders);
    }
    if (plan.targetStatus === "facturado" && order.estado === "entregado") {
      await transitionOrder(order.codigo_pedido, "facturado", authHeaders);
    }
  }
}

async function transitionOrder(
  codigo_pedido: string,
  estado: Order["estado"],
  authHeaders: Record<string, string>,
): Promise<Order> {
  return request<Order>(`/orders/${encodeURIComponent(codigo_pedido)}/status`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ estado }),
  });
}

async function waitForHealth(): Promise<Record<string, unknown>> {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      return await request<Record<string, unknown>>("/health");
    } catch (error) {
      if (attempt === 30) throw error;
      await delay(1_000);
    }
  }
  throw new Error("API health check timed out.");
}

async function registerOrLogin(): Promise<AuthTokens> {
  try {
    return await request<AuthTokens>("/auth/register", {
      method: "POST",
      headers,
      body: JSON.stringify(demoIdentity),
    });
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 409) {
      throw error;
    }
    return request<AuthTokens>("/auth/login", {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: demoIdentity.email,
        password: demoIdentity.password,
      }),
    });
  }
}

async function request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

function assertMinimum(label: string, actual: number, minimum: number): void {
  if (actual < minimum) {
    throw new Error(`Expected at least ${minimum} ${label}, received ${actual}.`);
  }
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly responseText: string,
  ) {
    super(`HTTP ${status}: ${responseText}`);
  }
}
