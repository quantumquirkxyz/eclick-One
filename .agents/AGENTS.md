---
description: "Build and operate this project. Permanent rules for all agents. Read before any task."
---

# Project Rules

This is an **Agentic Commerce Network** monorepo — a decentralized e-commerce operations
platform with on-chain smart contracts and autonomous AI agents. The structure, commands,
and conventions below define how all agents operate.

## Structure

```
apps/
  api/        REST API: routes → controllers → services → repositories + dual-write on-chain
  web/        Frontend SPA with Web3 dashboard
  agents/     AI agent processes (Collector, Compliance)
  contracts/  Solidity smart contracts (Foundry)
packages/
  domain/     Entities, pure business rules, repository interfaces
  db/         Repository implementations (mock, Turso, Azure SQL)
  shared/     Utilities, config helpers
docs/         Database contract, architecture decisions
.context/     Technical reference for agents (read before any change)
.agents/      Agent system definitions, rules, skills
```

## Commands

```bash
bun run dev           # Start both frontend + API concurrently (mock mode)
bun run dev:full      # Full stack: Anvil → deploy → API → agents → web
bun run dev:web       # Frontend only
bun run dev:api       # API only
bun run dev:anvil     # Local blockchain (Anvil)
bun run dev:deploy    # Deploy smart contracts
bun --cwd apps/agents dev           # Collector Agent
bun --cwd apps/agents dev:compliance # Compliance Agent
bun run typecheck     # TypeScript check across all packages
bun test              # Run all Bun tests
forge test            # Run all Forge (Solidity) tests
bun run build         # Build all packages
```

## Architecture Rules (read .agents/rules/architecture.md)

Dependency flows INWARD. The domain layer has ZERO framework or database dependencies.
Services consume repository interfaces. The API adds an on-chain dual-write layer.
AI agents are standalone processes that listen to smart contract events.

## Domain Rules (read .agents/rules/domain-rules.md)

Order lifecycle, entity invariants, business validation rules. All domain logic lives in the domain layer.
The smart contract state machine mirrors these rules on-chain.

## Bilingual UI (read .agents/rules/bilingual.md)

Browser language detected on first load, persisted in localStorage.
Every UI string in EN and ES. No hardcoded strings in JSX.

## Repository Pattern (read .agents/rules/repository-pattern.md)

Repository interface in the domain layer. Multiple implementations (mock, Turso, Azure SQL).
Repository mode selected at startup via environment variable.

## Smart Contracts (read .agents/rules/smart-contracts.md)

OrderManager and PaymentLedger contracts manage the order lifecycle on-chain.
Built with Foundry (forge + anvil). Events power the AI agent system.

## AI Agents (read .agents/rules/agent-architecture.md)

Autonomous processes with crypto wallets that monitor on-chain events and act.
Collector Agent transitions orders on payment. Compliance Agent validates state transitions.

## Quality Standards (read .agents/rules/quality-standards.md)

TypeScript strict mode. No `any`. Explicit return types. Every endpoint handles
success/validation/not-found/server-error. Every frontend view renders
loading/empty/error/success states.

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
Available skills cover the full lifecycle: planning → spec → design → development →
review → QA → security → ship → deploy → docs → retro.

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
| Order | Transaction with status lifecycle (on-chain state machine) |
| Payment | Record of payment against an order |
| Product | Item in the catalog |
| Inventory | Stock record |
| Mock mode | In-memory repositories, no DB needed |
| Dual-write | Writing to both off-chain DB and on-chain contract |
| On-chain | Data stored on the blockchain (Anvil local) |
| Collector Agent | AI agent that transitions orders on payment |
| Compliance Agent | AI agent that validates state transitions |
| OrderManager | Smart contract for order state machine |
| PaymentLedger | Smart contract for append-only payment records |

## Completion Protocol

Report status using one of: **DONE** (evidence included), **DONE_WITH_CONCERNS** (list concerns),
**BLOCKED** (state blocker and what was tried), **NEEDS_CONTEXT** (state exactly what is needed).
Escalate after 3 failed attempts or uncertain security-sensitive changes.
