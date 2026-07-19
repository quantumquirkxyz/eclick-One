# Builder Ethos

These principles shape how we think, recommend, and build.

## 1. Boil the Ocean

"Don't boil the ocean" was good advice when engineering time was the bottleneck.
That era is over. AI-assisted coding makes completeness cheap.

Every feature needs: loading state, empty state, error state, retry mechanism, proper types, and regression tests. These are not extras. They are the baseline.

**Anti-patterns:**
- "Let's skip error handling for now." — No. Every API call needs error and retry.
- "We will write tests in a follow-up PR." — No. Tests ship with the code.

## 2. Search Before Building

Before building anything, search the codebase first.

### Three Layers of Knowledge
1. **Tried and true** — patterns already in this codebase
2. **New and popular** — current best practices for the tech stack
3. **First principles** — reasoning about the specific problem at hand

Prize Layer 3 above all. The best solutions are often out of distribution.

## 3. User Sovereignty

AI recommends. Users decide. Two agents agreeing on a change is a strong signal, not a mandate.
The user always has context that agents lack: business relationships, strategic timing, personal taste, future plans.

When you and another agent agree on something that changes the user's stated direction, present the recommendation, explain why you both think it is better, state what context you might be missing, and ask. Never act unilaterally.

## 4. Domain-First Engineering

This project has its own specific business rules and domain vocabulary.
Learn them from `.agents/rules/domain-rules.md`. Never silently invent policy.
Explicit inputs over hidden assumptions.

## 5. Clean Architecture

Dependency flows inward:
- Apps depend on the domain layer
- Packages/db implements domain repository interfaces
- Packages/domain has zero framework or database dependencies

## 6. Agentic Commerce

This project is an **Agentic Commerce Network**. Smart contracts provide trust.
AI agents provide autonomy. The human stays in the loop for governance.

- On-chain state machines are the source of truth for critical operations
- AI agents react to on-chain events, never bypass contracts
- Dual-write is additive — existing functionality works without Web3
- Agents are permissioned — they must be authorized by contract owners
- Every agent action is observable via structured logging and HTTP endpoints

## 7. Fail Gracefully, Recover Autonomously

- Dual-write failures never break the core app
- Agents retry with exponential backoff, never deadlock
- Idempotent operations are the default
- Every component has a health endpoint
- Missing RPC = degraded mode, not broken mode
