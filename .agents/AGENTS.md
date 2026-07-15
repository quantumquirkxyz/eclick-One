---
description: "Build and operate this project. Permanent rules for all agents. Read before any task."
---

# Project Rules

This is a web application monorepo. The structure, commands, and conventions below define how all agents operate.

## Structure

```
apps/
  api/       REST API: routes → controllers → services → repositories
  web/       Frontend SPA
packages/
  domain/    Entities, pure business rules, repository interfaces
  db/        Repository implementations (mock, SQL adapters)
  shared/    Utilities, config helpers
docs/         Database contract, architecture decisions
.context/     Technical reference for agents
```

## Commands (adjust to match your project)

```bash
bun run dev           # Start both frontend + API concurrently
bun run dev:web       # Frontend only
bun run dev:api       # API only
bun run typecheck     # TypeScript check across all packages
bun test              # Run all tests
bun run build         # Build all packages
```

## Architecture Rules (read .agents/rules/architecture.md)

Dependency flows INWARD. The domain layer has ZERO framework or database dependencies.
Services consume repository interfaces. Changing the repository mode must NOT change any service code.

## Domain Rules (read .agents/rules/domain-rules.md)

Order lifecycle, entity invariants, business validation rules. All domain logic lives in the domain layer.

## Bilingual UI (read .agents/rules/bilingual.md)

If the project supports multiple languages: browser language detected on first load, persisted in localStorage.
Every UI string in all supported locales. No hardcoded strings in JSX.

## Repository Pattern (read .agents/rules/repository-pattern.md)

Repository interface in the domain layer. Multiple implementations (mock, SQL) that implement the same contract.
Repository mode selected at startup via environment variable.

## Quality Standards (read .agents/rules/quality-standards.md)

TypeScript strict mode. No `any`. Explicit return types. Every endpoint handles success/validation/not-found/server-error.
Every frontend view renders loading/empty/error/success states. Run tests and typecheck before every commit.

## Agents

Primary agents (switch via Tab key):
- **developer** (Build mode) — default agent, full tool access.
- **architect** (Plan mode) — architecture analysis, read-only by default.

Subagents (invoke via @mention):
- `@reviewer` — pre-merge code review. Read-only.
- `@qa` — QA testing of running features. Writes reports only.
- `@designer` — design and UX review. Read-only.
- `@docs` — documentation writing.
- `@debugger` — root-cause investigation. Read-only.

## Skills

Skills live in `.agents/skills/<name>/SKILL.md`. Agents invoke them via the skill tool.

## Subagent Invocation Rules

- Primary agents delegate to subagents via @mention for specialized tasks.
- `@architect` handles architecture and planning before implementation.
- `@reviewer` reviews all code before shipping.
- `@qa` tests all UI and flow changes after implementation.
- `@designer` reviews all UI changes before shipping.
- `@docs` updates or generates documentation after shipping.
- `@debugger` handles all bug investigations.

## Domain Vocabulary

| Term | Meaning |
|------|---------|
| Client/Customer | Person or entity that places orders |
| Order | Transaction with status lifecycle |
| Payment | Record of payment against an order |
| Product | Item in the catalog |
| Inventory | Stock record |
| Mock mode | In-memory repositories, no DB needed |
| SQL mode | Production database adapter |
| monthlyRuleApplies | Explicit flag for billing/policy exception |

## Completion Protocol

Report status using one of: **DONE** (evidence included), **DONE_WITH_CONCERNS** (list concerns),
**BLOCKED** (state blocker and what was tried), **NEEDS_CONTEXT** (state exactly what is needed).
Escalate after 3 failed attempts or uncertain security-sensitive changes.
