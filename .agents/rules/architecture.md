# Architecture Rules

## Clean Architecture (Dependency Inversion)

Dependency flows INWARD only. No package may import from a package at a higher layer.

```
frontend app → domain package
API app      → domain package
db package   → domain package
contracts     → (standalone Solidity, references domain concepts via events)
agents app   → domain package (reads via API + contract events)
domain package → (NO framework or database dependencies)
shared package → (no project imports)
```

## On-Chain Layer

Smart contracts (apps/contracts/) provide an immutable, event-driven layer
for critical commerce operations. They mirror the domain state machine on-chain.

```
OrderManager — order state machine
  ├── createOrder → OrderCreated event
  ├── transitionTo* → OrderStatusTransitioned event
  ├── recordPayment → PaymentRecorded event
  └── add/removeCollector → collector management

PaymentLedger — append-only payment records
  └── recordPayment → PaymentRecorded event
```

**Dual-Write Pattern**: Every order/payment write operation targets both the
off-chain database and the on-chain contract. On-chain failure is non-fatal;
the app continues in degraded mode.

**Event-Driven Agents**: AI agents poll for contract events and react
autonomously (e.g., Collector Agent transitions orders on payment).

## AI Agent Layer

Agents (apps/agents/) are standalone processes that:
1. Monitor on-chain events (polling with configurable interval)
2. Execute business actions via smart contract functions and API calls
3. Report status via HTTP endpoints (/health, /activity, /metrics)
4. Retry with exponential backoff on transient failures

```
Collector Agent     — transitions Generated→InProcess→Delivered on payment
Compliance Agent    — validates all state transitions against domain rules
Future agents       — Forecaster, Negotiator, Preference Analyst, Dispute Resolver
```

**Agent Principles**:
- Non-fatal failures: agent unavailability never breaks the core app
- Idempotent actions: repeated event processing is safe (deduplication)
- Observable: every action is logged with context
- Recoverable: retry with backoff on transient failures
- Permissioned: agents must be authorized by contract owner

## Layer Responsibilities

| Layer | Responsibility | Imports from |
|-------|---------------|--------------|
| Frontend app | Components, routing, API calls, i18n, Web3 dashboard | domain package |
| API app | HTTP routes, controllers, request validation, dual-write | domain package, db package |
| Agents app | Event monitoring, autonomous action, agent HTTP server | API via HTTP, contracts via viem |
| Contracts app | Solidity state machine, payment ledger, events | nothing (standalone) |
| DB package | Repository implementations | domain package |
| Domain package | Entities, business rules, repository interfaces | nothing |
| Shared package | Utilities, config helpers | nothing from this project |

## Service Layer

Services consume repository interfaces, never concrete implementations. The repository mode is selected at startup. Changing the mode must NOT change any service code.

```typescript
// GOOD: Service depends on interface
class Service {
  constructor(private repos: Repositories) {}
}

// BAD: Service depends on concrete implementation
class Service {
  private repo = new MockRepository(); // NEVER
}
```

## Controller Pattern

Controllers are thin HTTP adapters. They parse input, call a service, format the response. No business logic in controllers.

```typescript
type Controller = (
  request: Request,
  params: Record<string, string>,
) => Promise<ControllerResult> | ControllerResult;

interface ControllerResult {
  status?: number;
  body: unknown;
}
```

## Repository Interface Standard

All repository interfaces live in the domain layer. Implementations live in the db layer.
