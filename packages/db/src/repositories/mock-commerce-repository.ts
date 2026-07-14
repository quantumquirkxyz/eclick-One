import type {
  Client,
  CommerceRepositories,
  Inventory,
  Order,
  Payment,
  Product,
  Province,
} from "@eclick-one/domain";

// Every value in this adapter is synthetic and exists only to exercise the MVP.
const provinces: readonly Province[] = [
  { code: "PA", name: "Panamá (synthetic sample)" },
  { code: "CH", name: "Chiriquí (synthetic sample)" },
  { code: "CO", name: "Colón (synthetic sample)" },
];

const clients: readonly Client[] = [
  {
    code: 1,
    name: "Cliente Sintético Uno",
    email: "cliente1@example.invalid",
    phone: "+507 6000-0001",
    balance: 420,
    createdAt: "2024-10-01T14:00:00.000Z",
  },
  {
    code: 2,
    name: "Cliente Sintético Dos",
    email: "cliente2@example.invalid",
    phone: "+507 6000-0002",
    balance: 0,
    createdAt: "2024-10-08T15:00:00.000Z",
  },
  {
    code: 3,
    name: "Cliente Sintético Tres",
    email: "cliente3@example.invalid",
    phone: "+507 6000-0003",
    balance: 185,
    createdAt: "2024-11-03T13:30:00.000Z",
  },
];

const products: readonly Product[] = [
  { code: 1000, name: "Producto Sintético A", description: "Muestra académica", unitPrice: 50, active: true },
  { code: 1001, name: "Producto Sintético B", description: "Muestra académica", unitPrice: 70, active: true },
  { code: 1002, name: "Producto Sintético C", description: "Muestra académica", unitPrice: 90, active: true },
  { code: 1003, name: "Producto Sintético D", description: "Muestra académica", unitPrice: 50, active: false },
];

const inventory: readonly Inventory[] = [
  { productCode: 1000, quantityOnHand: 34, quantityReserved: 4, reorderLevel: 12, updatedAt: "2024-12-20T13:00:00.000Z" },
  { productCode: 1001, quantityOnHand: 18, quantityReserved: 6, reorderLevel: 10, updatedAt: "2024-12-20T13:00:00.000Z" },
  { productCode: 1002, quantityOnHand: 8, quantityReserved: 3, reorderLevel: 10, updatedAt: "2024-12-20T13:00:00.000Z" },
  { productCode: 1003, quantityOnHand: 0, quantityReserved: 0, reorderLevel: 5, updatedAt: "2024-12-20T13:00:00.000Z" },
];

const orders: readonly Order[] = [
  {
    code: "PA-SYN-0001",
    clientCode: 1,
    provinceCode: "PA",
    deliveryAddress: "Dirección sintética 101, Panamá",
    orderDate: "2024-11-04T14:00:00.000Z",
    validDate: "2024-11-04T14:00:00.000Z",
    deliveryDate: "2024-11-06T15:00:00.000Z",
    status: "delivered",
    total: 120,
    isPaid: true,
    monthlyRuleApplies: false,
    lines: [{ productCode: 1000, quantity: 2, amount: 70 }],
  },
  {
    code: "CH-SYN-0002",
    clientCode: 3,
    provinceCode: "CH",
    deliveryAddress: "Dirección sintética 202, Chiriquí",
    orderDate: "2024-12-12T16:00:00.000Z",
    validDate: "2024-12-12T16:00:00.000Z",
    status: "in process",
    total: 90,
    isPaid: true,
    monthlyRuleApplies: true,
    lines: [{ productCode: 1002, quantity: 3, amount: 90 }],
  },
  {
    code: "CO-SYN-0003",
    clientCode: 1,
    provinceCode: "CO",
    deliveryAddress: "Dirección sintética 303, Colón",
    orderDate: "2024-12-20T18:00:00.000Z",
    validDate: "2024-12-20T18:00:00.000Z",
    status: "generated",
    total: 50,
    isPaid: false,
    monthlyRuleApplies: false,
    lines: [{ productCode: 1000, quantity: 1, amount: 50 }],
  },
];

const payments: readonly Payment[] = [
  { id: 1, orderCode: "PA-SYN-0001", amount: 70, cardType: "DB", paidAt: "2024-11-04T15:00:00.000Z", reference: "SYN-PAY-001" },
  { id: 2, orderCode: "PA-SYN-0001", amount: 50, cardType: "CR", paidAt: "2024-11-04T15:05:00.000Z", reference: "SYN-PAY-002" },
  { id: 3, orderCode: "CH-SYN-0002", amount: 90, cardType: "CR", paidAt: "2024-12-12T17:00:00.000Z", reference: "SYN-PAY-003" },
];

export class MockCommerceRepository implements CommerceRepositories {
  async listProvinces(): Promise<readonly Province[]> {
    return structuredClone(provinces);
  }

  async listClients(): Promise<readonly Client[]> {
    return structuredClone(clients);
  }

  async findClientByCode(code: number): Promise<Client | null> {
    return structuredClone(clients.find((client) => client.code === code) ?? null);
  }

  async listProducts(): Promise<readonly Product[]> {
    return structuredClone(products);
  }

  async listInventory(): Promise<readonly Inventory[]> {
    return structuredClone(inventory);
  }

  async listOrders(): Promise<readonly Order[]> {
    return structuredClone(orders);
  }

  async listPayments(): Promise<readonly Payment[]> {
    return structuredClone(payments);
  }
}
