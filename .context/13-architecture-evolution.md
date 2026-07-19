# Architecture Evolution: Agentic Commerce Network

## The Journey

eclick One started as an academic e-commerce operations app for Panama. It
has evolved into an Agentic Commerce Network — a decentralized platform where
AI agents manage commerce operations and smart contracts provide trust.

## Phase 1: Centralized MVC (Original)

```
Browser → REST API → Controllers → Services → DB (mock/SQL)
```

- Single source of truth: the database
- All business logic in TypeScript domain layer
- 14 REST endpoints for full CRUD
- Bilingual UI (EN/ES)

## Phase 2: Dual-Write (Current)

```
Browser → REST API → Services → DB (off-chain)
                              → Smart Contract (on-chain)
                                        │
                                   AI Agents (event listeners)
```

- Two sources of truth: DB for queries, chain for immutability
- Smart contract mirrors the order state machine
- Dual-write is non-fatal (on-chain failure doesn't break the app)
- Agents react to on-chain events and sync back to off-chain

## Phase 3: Agentic Commerce Network (Vision)

```
Agent A (Seller)                Agent B (Buyer)
     │                               │
     └─────────── Protocol ──────────┘
                        │
              ┌─────────▼─────────┐
              │  Smart Contracts   │
              │  (source of truth) │
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐
              │  Off-chain Indexer │
              │  (fast queries)    │
              └───────────────────┘
```

- Agents discover each other via AgentRegistry
- Negotiate terms within domain rule bounds
- Execute agreements via smart contracts
- Settle payments automatically
- Humans only in the loop for overrides and governance

## Architecture Decisions

### Why Dual-Write Instead of Migrating to Full On-Chain?

| Factor | Decision | Rationale |
|--------|----------|-----------|
| Query speed | Off-chain DB | Complex joins, analytics, reporting are slow on-chain |
| Cost | Off-chain DB | Gas costs for every read operation are prohibitive |
| Migration path | Dual-write | Existing API works unchanged, on-chain is additive |
| Verifiability | On-chain | Critical state transitions have an immutable record |
| Autonomy | On-chain events | Agents can react to events without polling a central DB |

### Why Polling Instead of WebSocket Subscriptions?

Anvil (local development chain) does not support `eth_subscribe` in all
configurations. Polling is simpler, more portable, and reliable for local
development. Production deployment on a real chain (Sepolia, Base, etc.)
should use WebSocket subscriptions for lower latency.

## Key Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Order creation latency | <100ms | <200ms with dual-write |
| Agent reaction time | ~2s (poll interval) | <500ms (WebSocket) |
| On-chain availability | Optional | Required for production |
| Number of agents | 2 | 5+ |
| State verification | Manual | Automated (Compliance Agent) |

## Open Questions

1. **Production chain**: Which L2 to deploy on? Base? Polygon? Scroll?
2. **Agent incentives**: How do agents get compensated for their work?
3. **Agent discovery**: How do agents find each other? Central registry or P2P?
4. **Human override**: How do humans halt or override agent decisions?
5. **Upgradeability**: How to upgrade smart contracts when business rules change?
6. **Cross-chain**: Should this work across multiple chains?
