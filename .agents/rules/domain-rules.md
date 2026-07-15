# Domain Business Rules

## Order Lifecycle

```
generado (created)
    │
    ├──► proceso (in process)
    │       │
    │       ├──► entregado (delivered)
    │       │       │
    │       │       ▼
    │       │   facturado (invoiced)
    │       │
    │       ├──► facturado (invoiced, direct)
    │       │
    │       └──► cancelado (cancelled)
    │
    └──► cancelado (cancelled, immediate)
```

Valid transitions from `assertOrderTransitionAllowed()`:
- `generado → proceso`
- `generado → cancelado`
- `proceso → entregado`
- `proceso → cancelado`
- `proceso → facturado`
- `entregado → facturado`

No other transitions are allowed. `facturado` and `cancelado` are terminal states.

## Client Standing

`assertClientCanGenerateOrder(pazYSalvo: boolean)` — throws if `pazYSalvo !== true`.

```typescript
// Actual Client entity
interface Client {
  codigo_cliente: number;
  nombre: string;
  apellido: string;
  identificacion: string;
  provincia: Province;
  tipo_tarjeta: CardType;
  paz_y_salvo: boolean;  // true = allowed to create orders
  email?: string;
  phone?: string;
}
```

## Payment Rules

- Payment must be recorded before an order can transition to `entregado`
- `canDeliverOrder(isPaid: boolean)` returns `isPaid`
- `assertOrderDeliveryAllowed(order)` checks `order.pagado` — throws if not paid
- Payment amount must match order amount (`assertOrderPaymentAmount`)
- Payment reference cannot be empty string when provided (`assertPaymentReference`)
- In mock mode: payments blocked on cancelled orders and already-paid orders
- Payment history is append-only (returns all records, no deletion)

## monthlyRuleApplies

`monthlyRuleApplies` is NOT a field on any entity. It is a boolean parameter to `canRemainInProcess()`:

```typescript
interface InProcessPolicyInput {
  enteredInProcessAt: string;
  evaluatedAt: string;
  monthlyRuleApplies: boolean;
}

// Returns true if monthlyRuleApplies is true OR elapsed time <= 48 hours
function canRemainInProcess(input: InProcessPolicyInput): boolean
```

When `true`, the 48-hour deadline for orders in `proceso` is waived. This is an explicit policy input — never silently invented.

Additionally, `isIncludedInMonthlyOrders(date)` excludes day 31 of any month (returns `false` for the 31st).

## Pricing Rules

`amountForQuantity(quantity)`:
- 1 unit → $50
- 2 units → $70
- 3+ units → $90

## Delivery Date

`calculateDeliveryDate(paymentDate)` — adds 48 hours to the payment/valid date.

## Product Preference

`selectProductPreference(requests)` — requires minimum 3 request events for the same product. Ties broken by total quantity, then product code. Returns `ProductPreference | null`.

## Naming Conventions

- Domain entities and status values use Spanish names matching the Panama business domain
- Statuses: `generado`, `proceso`, `entregado`, `facturado`, `cancelado`
- API routes use English (`/api/v1/customers`, `/api/v1/orders`) with Spanish alias (`/api/v1/clientes`)
- Code identifiers (variables, functions) use English

## Date Handling

- All dates are ISO-8601 timestamps (e.g. `"2024-12-29T00:00:00.000Z"`)
- Domain comparisons use `Date.parse()` on UTC instants
- Minimum order date: `2024-12-29T00:00:00.000Z`
- Future dates are rejected
- Province prefixes: `PA` (Panama), `CH` (Chiriqui), `CO` (Colon), `OC` (Cocle)
