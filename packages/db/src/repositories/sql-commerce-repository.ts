import type {
  Client,
  CommerceRepositories,
  Inventory,
  Order,
  Payment,
  Product,
  Province,
} from "@eclick-one/domain";
import type { AzureSqlClient } from "../client/azure-sql-client";

type ProvinceRow = { code: string; name: string };
type ClientRow = { code: number; name: string; email: string; phone: string; balance: number; created_at: Date };
type ProductRow = { code: number; name: string; description: string | null; unit_price: number; active: boolean };
type InventoryRow = { product_code: number; quantity_on_hand: number; quantity_reserved: number; reorder_level: number; updated_at: Date };
type OrderRow = { code: string; client_code: number; province_code: string; delivery_address: string; order_date: Date; valid_date: Date | null; delivery_date: Date | null; status: Order["status"]; total: number; is_paid: boolean; monthly_rule_applies: boolean };
type PaymentRow = { id: number; order_code: string; amount: number; card_type: Payment["cardType"]; paid_at: Date; reference: string };

/** Read-only phase-one adapter for the stable views documented in docs/db-contract.md. */
export class SqlCommerceRepository implements CommerceRepositories {
  constructor(private readonly client: AzureSqlClient) {}

  async listProvinces(): Promise<readonly Province[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<ProvinceRow>(
      "SELECT code, name FROM app.vw_provinces ORDER BY name",
    );
    return recordset;
  }

  async listClients(): Promise<readonly Client[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<ClientRow>(
      "SELECT code, name, email, phone, balance, created_at FROM app.vw_clients ORDER BY code",
    );
    return recordset.map(mapClient);
  }

  async findClientByCode(code: number): Promise<Client | null> {
    const pool = await this.client.getPool();
    const { recordset } = await pool
      .request()
      .input("code", code)
      .query<ClientRow>(
        "SELECT code, name, email, phone, balance, created_at FROM app.vw_clients WHERE code = @code",
      );
    const row = recordset[0];
    return row ? mapClient(row) : null;
  }

  async listProducts(): Promise<readonly Product[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<ProductRow>(
      "SELECT code, name, description, unit_price, active FROM app.vw_products ORDER BY code",
    );
    return recordset.map((row) => ({
      code: row.code,
      name: row.name,
      ...(row.description === null ? {} : { description: row.description }),
      unitPrice: Number(row.unit_price),
      active: row.active,
    }));
  }

  async listInventory(): Promise<readonly Inventory[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<InventoryRow>(
      "SELECT product_code, quantity_on_hand, quantity_reserved, reorder_level, updated_at FROM app.vw_inventory ORDER BY product_code",
    );
    return recordset.map((row) => ({
      productCode: row.product_code,
      quantityOnHand: row.quantity_on_hand,
      quantityReserved: row.quantity_reserved,
      reorderLevel: row.reorder_level,
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async listOrders(): Promise<readonly Order[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<OrderRow>(
      "SELECT code, client_code, province_code, delivery_address, order_date, valid_date, delivery_date, status, total, is_paid, monthly_rule_applies FROM app.vw_orders ORDER BY order_date DESC",
    );
    return recordset.map((row) => ({
      code: row.code,
      clientCode: row.client_code,
      provinceCode: row.province_code,
      deliveryAddress: row.delivery_address,
      orderDate: row.order_date.toISOString(),
      ...(row.valid_date === null ? {} : { validDate: row.valid_date.toISOString() }),
      ...(row.delivery_date === null ? {} : { deliveryDate: row.delivery_date.toISOString() }),
      status: row.status,
      total: Number(row.total),
      isPaid: row.is_paid,
      monthlyRuleApplies: row.monthly_rule_applies,
      // Order-line view is pending in the phase-one database contract.
      lines: [],
    }));
  }

  async listPayments(): Promise<readonly Payment[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<PaymentRow>(
      "SELECT id, order_code, amount, card_type, paid_at, reference FROM app.vw_payments ORDER BY paid_at DESC, id DESC",
    );
    return recordset.map((row) => ({
      id: row.id,
      orderCode: row.order_code,
      amount: Number(row.amount),
      cardType: row.card_type,
      paidAt: row.paid_at.toISOString(),
      reference: row.reference,
    }));
  }
}

function mapClient(row: ClientRow): Client {
  return {
    code: row.code,
    name: row.name,
    email: row.email,
    phone: row.phone,
    balance: Number(row.balance),
    createdAt: row.created_at.toISOString(),
  };
}
