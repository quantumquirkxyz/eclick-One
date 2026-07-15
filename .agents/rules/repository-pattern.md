# Repository Pattern Rules

## Interface Definition

All repository interfaces live in the domain layer. Each aggregate root gets its own interface.

```typescript
export interface Repository<T> {
  list(): Promise<readonly T[]>;
  findById(id: string): Promise<T | null>;
  create(input: unknown): Promise<T>;
  update(input: unknown): Promise<T>;
}

// Combined type used by services
export type CommerceRepositories = RepositoryA & RepositoryB & RepositoryC;
```

## Implementations

### Mock Mode

- In-memory storage (Maps or arrays with structuredClone)
- Pre-seeded with realistic synthetic data
- No database required; works offline
- Must match the exact interface contract so services work unchanged

### SQL Mode

- Real database adapter (Postgres, MySQL, SQLite, etc.)
- Connection pool opened lazily on first query
- Fail-fast when required config is missing
- Parameterized queries or stored procedures — no string concatenation

## Configuration

```bash
REPOSITORY_MODE=mock    # default, in-memory, no DB needed
REPOSITORY_MODE=sql     # requires database env vars
```

## Testing

- Unit tests run against mock repositories
- Integration tests run against both mock and SQL (when configured)
- Repository tests verify the contract, not the implementation
