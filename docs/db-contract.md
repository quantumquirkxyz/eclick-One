# Azure SQL consumption contract

Status: proposed application contract for review by the database owner. The application does not own migrations in this phase. Names below are stable application-facing endpoints; underlying normalized tables may differ.

## Design constraints

- Azure SQL generates customer codes beginning at `1` and product codes beginning at `1000` (identity or equivalent sequences).
- The database should preserve payment rows as an append-only history. Corrections should be represented by reversal/replacement records, not destructive updates.
- Order addresses are order snapshots and must not be inferred from a customer table.
- Dates must be exposed as `datetime2`/`datetimeoffset`; the API serializes them as ISO-8601 strings.
- Monetary values use fixed-point `decimal`, never floating-point SQL types.
- Status and card-type constraints must agree with the domain enums.
- Application access should use a least-privilege identity and encrypted transport.

## Read views required by the phase-one SQL adapter

### `app.vw_provinces`

| Column | Suggested SQL type | Notes |
| --- | --- | --- |
| `code` | `char(2)` | Stable, uppercase two-letter prefix |
| `name` | `nvarchar(80)` | Province display name |

### `app.vw_clients`

| Column | Suggested SQL type | Notes |
| --- | --- | --- |
| `code` | `int` | Database generated, minimum 1 |
| `name` | `nvarchar(160)` | Display/legal name |
| `email` | `nvarchar(254)` | Unique where business policy requires |
| `phone` | `nvarchar(32)` | Text preserves country code |
| `balance` | `decimal(19,4)` | Must be positive to generate an order |
| `created_at` | `datetimeoffset` | Creation instant |

No customer address is requested because addresses belong to orders.

### `app.vw_products`

| Column | Suggested SQL type | Notes |
| --- | --- | --- |
| `code` | `int` | Database generated, minimum 1000 |
| `name` | `nvarchar(160)` | Product display name |
| `description` | `nvarchar(1000)` | Nullable |
| `unit_price` | `decimal(19,4)` | Non-negative |
| `active` | `bit` | Availability flag |

### `app.vw_inventory`

| Column | Suggested SQL type | Notes |
| --- | --- | --- |
| `product_code` | `int` | Product reference |
| `quantity_on_hand` | `int` | Non-negative physical stock |
| `quantity_reserved` | `int` | Between 0 and on-hand |
| `reorder_level` | `int` | Non-negative threshold |
| `updated_at` | `datetimeoffset` | Last inventory observation |

### `app.vw_orders`

| Column | Suggested SQL type | Notes |
| --- | --- | --- |
| `code` | `nvarchar(64)` | Begins with `province_code + '-'` |
| `client_code` | `int` | Client reference |
| `province_code` | `char(2)` | Delivery province/prefix |
| `delivery_address` | `nvarchar(500)` | Immutable order snapshot |
| `order_date` | `datetimeoffset` | No later than 2024-12-29 |
| `valid_date` | `datetimeoffset` | Nullable valid fallback date |
| `delivery_date` | `datetimeoffset` | Nullable; 48 hours after payment/valid date |
| `status` | `varchar(20)` | `generated`, `in process`, `delivered`, `canceled`, `invoiced` |
| `total` | `decimal(19,4)` | Non-negative |
| `is_paid` | `bit` | Derived from valid payment history where possible |
| `monthly_rule_applies` | `bit` | Explicit exception marker; semantics pending |

The final schema will also need order-line exposure (`order_code`, `product_code`, `quantity`, captured price) for preference calculations. A future `app.vw_order_lines` is recommended.

### `app.vw_payments`

| Column | Suggested SQL type | Notes |
| --- | --- | --- |
| `id` | `bigint` | Immutable database-generated history key |
| `order_code` | `nvarchar(64)` | Order reference |
| `amount` | `decimal(19,4)` | Positive amount |
| `card_type` | `char(2)` | `DB` or `CR` |
| `paid_at` | `datetimeoffset` | Payment instant |
| `reference` | `nvarchar(128)` | Provider/reference token; never raw card data |

## Proposed transactional procedures for later phases

These are not called by the phase-one adapter but define the preferred mutation boundary:

- `app.usp_client_create`: validates client fields and returns the generated code.
- `app.usp_product_create`: validates product fields and returns the generated code.
- `app.usp_order_create`: atomically checks positive customer balance, reserves inventory, stores the order address/lines, applies the two-letter prefix, and returns the order code.
- `app.usp_payment_record`: appends payment history and returns the payment id; must be idempotent by external reference.
- `app.usp_order_transition`: validates allowed status transitions and timestamps.

Transactions should use optimistic concurrency or appropriate row locks around stock and balance checks. Procedures should return structured error codes so the API can map conflicts separately from validation and infrastructure failures.

## Questions requiring database-owner resolution

1. Is “balance” credit available, account balance, or outstanding debt? The supplied rule is implemented literally as `balance > 0`.
2. What qualifies as the “valid date” used when a payment timestamp is unavailable?
3. What exactly activates the monthly exception to the 48-hour in-process limit?
4. Should day 31 be rejected, excluded from monthly reporting, or assigned to another accounting period? Phase one excludes it from monthly reporting.
5. Which province-code standard and collision policy should generate order suffixes?
