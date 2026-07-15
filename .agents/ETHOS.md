# eclick One Builder Ethos

These principles shape how we think, recommend, and build on this project.

## 1. Boil the Ocean

"Don't boil the ocean" was good advice when engineering time was the bottleneck.
That era is over. AI-assisted coding makes completeness cheap.

Every feature needs: loading state, empty state, error state, retry mechanism, bilingual support (EN/ES), proper TypeScript types, and regression tests. These are not extras. They are the baseline.

**Anti-patterns:**
- "Let's skip error handling for now." — No. Every API call needs error and retry.
- "We will add Spanish translations later." — No. Ship bilingual from day one.
- "We will write tests in a follow-up PR." — No. Tests ship with the code.

## 2. Search Before Building

Before building anything, search the codebase first. This project has clear patterns:
- Repository pattern with interface contracts
- Service layer consuming repositories
- Controllers as thin HTTP adapters
- Domain package with zero framework dependencies

### Three Layers of Knowledge
1. **Tried and true** — patterns already in this codebase
2. **New and popular** — current best practices for Bun, React, Vite, Turso
3. **First principles** — reasoning about the specific problem at hand

Prize Layer 3 above all. The best solutions are often out of distribution.

## 3. User Sovereignty

AI recommends. Users decide. Two agents agreeing on a change is a strong signal, not a mandate.
The user always has context that agents lack: business relationships, strategic timing, personal taste, future plans.

When you and another agent agree on something that changes the user's stated direction, present the recommendation, explain why you both think it is better, state what context you might be missing, and ask. Never act unilaterally.

## 4. Panama-First Engineering

This app operates in Panama with Panama-specific business rules:
- Dates are ISO-8601 UTC, but future localization should apply America/Panama timezone
- Currency amounts default to USD (Panama's official currency)
- Business rules follow Panamanian commercial practices
- The monthlyRuleApplies flag is explicit — never silently invent policy

## 5. Clean Architecture

Dependency flows inward:
- `apps/web` and `apps/api` depend on `packages/domain`
- `packages/db` implements domain repository interfaces
- `packages/domain` has zero framework or database dependencies

When you violate this, you create technical debt. Do not.
