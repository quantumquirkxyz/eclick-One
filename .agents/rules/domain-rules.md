# Domain Business Rules

The domain layer contains entities, business rules, and repository interfaces. It has zero framework or database dependencies.

## Entity Design

Entities use plain objects or classes with no external dependencies. Each entity captures the minimal set of fields needed for business rules.

## Business Rules as Pure Functions

Rules are pure functions that throw typed errors on violation. They accept plain values, never infrastructure concerns.

```typescript
export class DomainRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainRuleError";
  }
}
```

## State Machines

For entities with lifecycle states, encode transitions as explicit pure functions:

```typescript
function assertTransitionAllowed(current: Status, next: Status): void {
  // explicit allowed transitions
  // throw DomainRuleError for invalid transitions
}
```

## Validation Rules

Keep validation in the domain layer: date ranges, amount limits, required fields, format constraints. Controllers may do structural validation (required fields exist, types are correct) but business logic validation belongs in the domain.

## Explicit Policy Inputs

When a business policy may vary (e.g. time limits, fee calculations, exception rules), model it as an explicit input parameter. Never silently invent policy. Let the caller decide.

## Date Handling

- All dates are ISO-8601 UTC
- Domain comparisons use UTC instants
- Future dates may be rejected depending on business rules
- No timezone logic in domain — leave that to the presentation layer

## Naming Conventions

- Business status values may use the domain's native language
- Code identifiers (variables, functions) use English
- API routes use English
