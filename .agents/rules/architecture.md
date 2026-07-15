# Architecture Rules

## Clean Architecture (Dependency Inversion)

Dependency flows INWARD only. No package may import from a package at a higher layer.

```
frontend app → domain package
API app      → domain package
db package   → domain package
domain package → (NO framework or database dependencies)
shared package → (no project imports)
```

## Layer Responsibilities

| Layer | Responsibility | Imports from |
|-------|---------------|--------------|
| Frontend app | Components, routing, API calls, i18n | domain package |
| API app | HTTP routes, controllers, request validation | domain package, db package |
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
