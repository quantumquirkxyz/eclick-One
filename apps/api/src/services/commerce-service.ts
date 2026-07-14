import type { Client, CommerceRepositories, Inventory, Order, OrderStatus, Payment, Product, Province } from "@eclick-one/domain";

export interface DashboardSnapshot {
  synthetic: boolean;
  notice: string;
  metrics: {
    clients: number;
    activeProducts: number;
    openOrders: number;
    collected: number;
  };
  monthlyOrders: readonly { month: string; orders: number }[];
  orderStatuses: readonly { status: OrderStatus; count: number }[];
  lowStock: readonly { productCode: number; available: number; reorderLevel: number }[];
}

export class CommerceService {
  constructor(
    private readonly repositories: CommerceRepositories,
    private readonly synthetic: boolean,
  ) {}

  listProvinces(): Promise<readonly Province[]> {
    return this.repositories.listProvinces();
  }

  listClients(): Promise<readonly Client[]> {
    return this.repositories.listClients();
  }

  listProducts(): Promise<readonly Product[]> {
    return this.repositories.listProducts();
  }

  listInventory(): Promise<readonly Inventory[]> {
    return this.repositories.listInventory();
  }

  listOrders(): Promise<readonly Order[]> {
    return this.repositories.listOrders();
  }

  listPayments(): Promise<readonly Payment[]> {
    return this.repositories.listPayments();
  }

  async getDashboard(): Promise<DashboardSnapshot> {
    // Independent reads can run concurrently and remain bounded by the SQL pool.
    const [clients, products, inventory, orders, payments] = await Promise.all([
      this.repositories.listClients(),
      this.repositories.listProducts(),
      this.repositories.listInventory(),
      this.repositories.listOrders(),
      this.repositories.listPayments(),
    ]);

    const monthly = new Map<string, number>();
    const statuses = new Map<OrderStatus, number>();
    for (const order of orders) {
      trackMonthlyOrder(order.orderDate, monthly);
      statuses.set(order.status, (statuses.get(order.status) ?? 0) + 1);
    }

    return {
      synthetic: this.synthetic,
      notice: this.synthetic
        ? "Synthetic demonstration data — not operational or customer data."
        : "Connected Azure SQL data.",
      metrics: {
        clients: clients.length,
        activeProducts: products.filter((product) => product.active).length,
        openOrders: orders.filter((order) =>
          order.status === "generated" || order.status === "in process",
        ).length,
        collected: payments.reduce((total, payment) => total + payment.amount, 0),
      },
      monthlyOrders: [...monthly.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, orderCount]) => ({ month, orders: orderCount })),
      orderStatuses: [...statuses.entries()].map(([status, count]) => ({ status, count })),
      lowStock: computeLowStockItems(inventory),
    };
  }

  async getReports() {
    const dashboard = await this.getDashboard();
    return {
      synthetic: dashboard.synthetic,
      generatedAt: new Date().toISOString(),
      sections: [
        { key: "monthly-orders", title: "Monthly orders (days 1–30)", rows: dashboard.monthlyOrders },
        { key: "order-status", title: "Order status distribution", rows: dashboard.orderStatuses },
        { key: "low-stock", title: "Low stock watchlist", rows: dashboard.lowStock },
      ],
    };
  }
}

/**
 * Business rule: day 31 does not enter monthly order reporting.
 */
function trackMonthlyOrder(orderDate: string, acc: Map<string, number>): void {
  const date = new Date(orderDate);
  if (date.getUTCDate() <= 30) {
    const key = date.toISOString().slice(0, 7);
    acc.set(key, (acc.get(key) ?? 0) + 1);
  }
}

function computeLowStockItems(inventory: readonly Inventory[]): DashboardSnapshot["lowStock"] {
  return inventory
    .map((stock) => ({
      productCode: stock.productCode,
      available: stock.quantityOnHand - stock.quantityReserved,
      reorderLevel: stock.reorderLevel,
    }))
    .filter((stock) => stock.available <= stock.reorderLevel)
    .sort((left, right) => left.available - right.available);
}
