# eclick One

Initial monorepo foundation for an academic/professional e-commerce operations application for Panama. This phase deliberately keeps business workflows small: it establishes domain rules, replaceable persistence adapters, a layered REST API, and a navigable dashboard backed only by clearly identified synthetic data.

## Architecture

```text
apps/
  api/       Bun REST API: routes -> controllers -> services -> repositories
  web/       React + Vite single-page application (the runnable frontend)
packages/
  domain/    Entities, pure business rules, and repository contracts
  db/        Mock repositories and an Azure SQL adapter using mssql
  shared/    Environment and shared utility helpers
docs/
  db-contract.md  Expected external SQL surface
eclick-one-ui-ux/ Supplied UI/UX source package consumed by apps/web
```

The dependency direction is inward: applications and database adapters depend on `@eclick-one/domain`; the domain package has no framework or database dependency. Services consume repository interfaces, so changing `REPOSITORY_MODE=mock` to `sql` does not change service code.

`apps/web` renders the supplied `eclick-one-ui-ux` prototype through Vite. This avoids operating a separate Next.js server while preserving the requested visual frontend and the `/api` development proxy.

## Requirements

- [Bun](https://bun.sh/) 1.3 or later
- Azure SQL Database credentials only when using the SQL repository mode

## Local development

```bash
cp .env.example .env
bun install
bun run dev
```

The web application runs at `http://localhost:5173` and proxies `/api` to the API at `http://localhost:3000`. All initial records and dashboard metrics are synthetic.

Useful commands:

```bash
bun run dev:web
bun run dev:api
bun run typecheck
bun test
bun run build
```

## Azure SQL preparation

Set `REPOSITORY_MODE=sql` and provide the `AZURE_SQL_*` variables from `.env.example`. The SQL adapter is intentionally read-only in this phase and queries the views defined in [docs/db-contract.md](docs/db-contract.md). It fails fast when required configuration is missing and opens the connection pool lazily.

The database owner must reconcile the proposed SQL names and columns before SQL mode is enabled. Do not commit real credentials or production/customer data.

## Current scope and limitations

- CRUD workflows, authentication, authorization, migrations, and complete business transactions are deferred.
- SQL identifiers are database-generated; mock identifiers simulate the same minimum ranges.
- The exact meaning of the stated “monthly rule” exception is not available. The domain exposes an explicit `monthlyRuleApplies` input instead of silently inventing the policy.
- Dates are ISO-8601 timestamps. The domain compares instants in UTC; a future localization layer should explicitly apply Panama (`America/Panama`) business-day semantics where required.
- Optional Mastra/OpenRouter settings are isolated from the primary execution path.
