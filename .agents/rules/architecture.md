# Architecture Rules

## Clean Architecture (Dependency Inversion)

Dependency flows INWARD only. No package may import from a package at a higher layer.

```
apps/web     → packages/domain
apps/api     → packages/domain
packages/db  → packages/domain, packages/shared
packages/domain → (NO framework or database dependencies)
packages/shared → (no project imports, only std lib)
```

## Layer Responsibilities

| Layer | Responsibility | Imports from |
|-------|---------------|--------------|
| `apps/web` | React components, routing, API calls, i18n | `packages/domain` |
| `apps/api` | HTTP routes, controllers, request validation | `packages/domain`, `packages/db`, `packages/shared` |
| `packages/db` | Repository implementations (Mock, Turso, SQL) | `packages/domain`, `packages/shared` |
| `packages/domain` | Entities, business rules, repository interfaces | nothing |
| `packages/shared` | Environment config helpers | nothing from this project |

## Service Layer

Services consume repository interfaces, never concrete implementations. The repository mode (`mock` / `turso`) is selected at startup via `REPOSITORY_MODE` env var. Changing the mode must NOT change any service code.

```typescript
// GOOD: Service depends on interface
class CommerceService {
  constructor(private repos: CommerceRepositories) {}
}

// BAD: Service depends on concrete implementation
class CommerceService {
  private repo = new MockCommerceRepository(); // NEVER
}
```

## Controller Pattern

Controllers are thin HTTP adapters. They parse input, call a service, format the response. No business logic in controllers.

```typescript
// Actual controller signature in this project
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

All repository interfaces live in `packages/domain/src/contracts.ts` as 6 separate interfaces (`ProvinceRepository`, `ClientRepository`, `ProductRepository`, `InventoryRepository`, `OrderRepository`, `PaymentRepository`), combined as `CommerceRepositories`.

Three implementations in `packages/db/src/`:
- `MockCommerceRepository` — in-memory Maps, seeded synthetic data
- `TursoCommerceRepository` — libSQL via `@libsql/client` 
- `SqlCommerceRepository` — Azure SQL via `mssql` (code exists, not wired at runtime)

Runtime wiring in `apps/api/src/database/database.ts` — `createDatabase()` only branches to `mock` or `turso`.
