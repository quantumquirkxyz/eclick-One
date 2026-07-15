# Repository Pattern Rules

## Interface Definition

All 6 repository interfaces live in a single file: `packages/domain/src/contracts.ts`.

```typescript
export interface ProvinceRepository {
  listProvinces(): Promise<readonly Province[]>;
}

export interface ClientRepository {
  listClients(): Promise<readonly Client[]>;
  findClientByCode(code: number): Promise<Client | null>;
  createClient(input: NewClient): Promise<Client>;
  getClientPreference(code: number): Promise<ProductPreference | null>;
}

export interface ProductRepository {
  listProducts(): Promise<readonly Product[]>;
}

export interface InventoryRepository {
  listInventory(): Promise<readonly Inventory[]>;
}

export interface OrderRepository {
  listOrders(): Promise<readonly Order[]>;
  listCurrentOrders(): Promise<readonly Order[]>;
  createOrder(input: NewOrder): Promise<Order>;
  transitionOrderStatus(input: OrderStatusTransition): Promise<Order>;
}

export interface PaymentRepository {
  listPayments(): Promise<readonly Payment[]>;
  recordPayment(input: NewPayment): Promise<Payment>;
}

// Combined type used by services
export type CommerceRepositories = ProvinceRepository &
  ClientRepository &
  ProductRepository &
  InventoryRepository &
  OrderRepository &
  PaymentRepository;
```

## Implementations

### Mock Mode (`REPOSITORY_MODE=mock`)

File: `packages/db/src/mock-commerce-repository.ts`

- In-memory Maps, `structuredClone` for immutability
- Pre-seeded: 4 provinces, 3 clients (2 paz_y_salvo, 1 not), 4 products (codes 1000-1003), 4 inventory records, 5 orders, 2 payments
- Sequential client code generation, province-prefixed order codes (e.g. `PA-SYN-0001`), sequential payment IDs
- `createOrder` validates client/product exist, auto-calculates amount
- `transitionOrderStatus` auto-sets delivery date from most recent payment
- `recordPayment` auto-updates order to `pagado=true` and transitions `generado→proceso`

### Turso Mode (`REPOSITORY_MODE=turso`)

Files: `packages/db/src/turso-commerce-repository.ts`, `packages/db/src/turso-client.ts`

- libSQL via `@libsql/client`
- Manual SQL (no stored procedures) inside transactions
- Inventory management: reserve on create, restore on cancel, consume on deliver
- Plan lookup from `PLAN_PEDIDO` table (Unitario=$50, Doble=$70, Multiple=$90)
- Contract management via `CONTRATO` table
- Payment validation: amount check, duplicate check, card ownership
- Config: `TURSO_DATABASE_URL` (required), `TURSO_AUTH_TOKEN` (required for remote)

### SQL Mode (not wired at runtime)

Files: `packages/db/src/sql-commerce-repository.ts`, `packages/db/src/azure-sql-client.ts`

- Azure SQL via `mssql` package
- Reads: parameterized SELECT queries on `dbo.*` views
- Writes: stored procedure execution via `request.execute()`
- Config: `AZURE_SQL_*` env vars
- `createDatabase()` in `apps/api/src/database/database.ts` does NOT branch to SQL mode — only mock and turso are connected.

## Configuration

```bash
REPOSITORY_MODE=mock    # default, in-memory, no DB needed
REPOSITORY_MODE=turso   # requires TURSO_DATABASE_URL and optionally TURSO_AUTH_TOKEN
```

## Testing

- Unit tests run against mock repositories
- Integration tests in `apps/api/src/` test both health and commerce endpoints against mock
- Domain unit tests in `packages/domain/` test pure business rules with no repositories
