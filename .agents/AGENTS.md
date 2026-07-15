---
description: "Build and operate the eclick One e-commerce platform for Panama. Permanent rules for all agents. Read before any task."
---

# eclick One — Project Rules

eclick One is an academic/professional web application for e-commerce operations in Panama.
It separates public project presentation from the internal operations console and supports
synthetic mock data, Turso (libSQL), and an Azure SQL adapter (not wired at runtime).

## Project Structure

```
apps/
  api/       Bun REST API: routes (custom Router) → controllers → services → repositories
  web/       React + Vite SPA (public landing + operations console)
packages/
  domain/    Entities, pure business rules, repository interfaces
  db/        Repository implementations (MockCommerceRepository, TursoCommerceRepository, SqlCommerceRepository)
  shared/    Environment variable helpers
docs/
  db-contract.md  Expected external SQL surface
.context/         Technical reference for development agents
```

## Commands

```bash
bun run dev           # Start both API + web concurrently
bun run dev:web       # Frontend only at localhost:5173
bun run dev:api       # API only at localhost:3000
bun run typecheck     # TypeScript check across all packages
bun test              # Run all tests
bun run build         # Build all packages
```

## Architecture Rules (read .agents/rules/architecture.md)

Dependency flows INWARD: `apps/web` → `packages/domain`, `apps/api` → `packages/domain`, `packages/db` → `packages/domain`.
`packages/domain` has ZERO framework or database dependencies. `packages/shared` has no project imports.

Services consume repository interfaces. Switching `REPOSITORY_MODE=mock` to `turso` changes NO service code.

## Domain Rules (read .agents/rules/domain-rules.md)

Order lifecycle: generado → proceso → entregado/cancelado → facturado (direct proceso → facturado also allowed).
Client must be `paz_y_salvo: true` to create orders. Payment must be recorded before entregado.
All dates are ISO-8601 UTC. `monthlyRuleApplies` is an explicit policy input to `canRemainInProcess` — never silently invented.

## Bilingual UI (read .agents/rules/bilingual.md)

Bilingual by default — browser language detected on first load, persisted in localStorage key `eclick-one-locale`.
Every UI string has both EN and ES (213+ keys per locale). No hardcoded strings in JSX.
Spanish text is 20-30% longer — accommodate in layout.

## Repository Pattern (read .agents/rules/repository-pattern.md)

`REPOSITORY_MODE=mock` (default, in-memory, offline) or `REPOSITORY_MODE=turso` (libSQL via @libsql/client).
Both implement the same `CommerceRepositories` interface from `packages/domain/src/contracts.ts`.
Azure SQL adapter (`SqlCommerceRepository`) exists via `mssql` but is not wired in `createDatabase()` — only mock and turso are.

## Quality Standards (read .agents/rules/quality-standards.md)

TypeScript strict mode. `verbatimModuleSyntax: true` — all type imports must use `import type`.
Explicit return types. Every API endpoint handles success/validation/not-found/server-error in bilingual EN/ES.
Every frontend view renders loading/empty/error/success states. Run `bun test` and `bun run typecheck` before every commit.

## Agents

Primary agents (switch via Tab key):
- **eclick-developer** (Build mode) — default agent, full tool access.
- **eclick-architect** (Plan mode) — architecture analysis, read-only by default.

Subagents (invoke via @mention):
- `@eclick-reviewer` — pre-merge code review. Read-only.
- `@eclick-qe` — QA testing of running features. Writes reports only.
- `@eclick-designer` — design and UX review. Read-only.
- `@eclick-docs` — documentation writing.
- `@eclick-debugger` — root-cause investigation. Read-only.

## Skills

Skills live in `.agents/skills/<name>/SKILL.md`. Agents invoke them via the skill tool.

## Domain Vocabulary

| Term | Meaning |
|------|---------|
| Client | Customer entity (`codigo_cliente`, `nombre`, `apellido`, `paz_y_salvo`, etc.) |
| Order | Sales transaction with status lifecycle |
| Payment | Record of payment against an order |
| generado | Order status: created, pending processing |
| proceso | Order status: being processed |
| entregado | Order status: delivered |
| facturado | Order status: invoiced |
| cancelado | Order status: cancelled |
| Product | Item in the catalog |
| Inventory | Stock record (`cant_ventas`, `cant_bodega`, `cant_reservado`) |
| paz_y_salvo | Client standing field — `true` allows order creation, `false` blocks it |
| Mock mode | In-memory `MockCommerceRepository`, no DB needed |
| Turso mode | libSQL database via `@libsql/client` |
| SQL mode | Azure SQL adapter via `mssql` (code exists, not wired in `createDatabase()`) |
| monthlyRuleApplies | Explicit flag for `canRemainInProcess()` — extends 48h deadline if `true` |

## Completion Protocol

Report status using one of: **DONE** (evidence included), **DONE_WITH_CONCERNS** (list concerns),
**BLOCKED** (state blocker and what was tried), **NEEDS_CONTEXT** (state exactly what is needed).
Escalate after 3 failed attempts or uncertain security-sensitive changes.
