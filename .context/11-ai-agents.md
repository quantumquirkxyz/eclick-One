# AI Agents Reference

## Overview

AI agents are autonomous processes with their own crypto wallets that monitor
on-chain events and react to maintain the commerce lifecycle. They are the
"autonomous workforce" of the Agentic Commerce Network.

## Agent Architecture

```
              ┌──────────────────┐
              │   Smart Contract │
              │  OrderManager    │
              └────────┬─────────┘
                       │ events
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Collector │ │Compliance│ │  Future  │
   │  Agent    │ │  Agent   │ │  Agents  │
   └──────────┘ └──────────┘ └──────────┘
        │              │
        ▼              ▼
   ┌──────────┐ ┌──────────┐
   │ Bun API  │ │ Bun API  │
   │ (sync)   │ │ (verify) │
   └──────────┘ └──────────┘
```

## Agent Base Structure

All agents share a common architecture:

```
apps/agents/src/
  agent-activity.ts    # Structured logging + metrics
  agent-http.ts        # HTTP server (health, activity, metrics, info)
  contract-abi.ts      # Shared ABI definitions
  order-hash.ts        # Consistent order ID hashing
  collector-agent.ts   # Collector Agent implementation
  compliance-agent.ts  # Compliance Agent implementation
```

### Shared Utilities

**AgentActivity**: Structured logging with metrics tracking.
- Levels: `info`, `action`, `error`
- Metrics: ordersProcessed, ordersFailed, avgResponseTimeMs, uptimeSeconds
- Max 1000 entries, auto-eviction

**AgentHttpServer**: Express-like HTTP server for agent status.
| Endpoint | Returns |
|----------|---------|
| `GET /health` | `{ status, agent, wallet, uptime }` |
| `GET /activity?count=N` | Recent activity entries |
| `GET /metrics` | `AgentMetrics` object |
| `GET /info` | `{ name, wallet, description }` |

## Collector Agent

**Role**: Automates the order delivery process when payment is received.

**Port**: 3100

**Wallet**: Account #1 on Anvil (`0x7099797...`)

**Behavior**:
1. Polls for `PaymentRecorded` events on OrderManager
2. When a payment is detected on an InProcess order:
   a. Calls `transitionToDelivered()` on the smart contract
   b. Calls `PATCH /api/v1/orders/:code/status` on the Bun API
3. Logs every action with timing metrics
4. Retries with exponential backoff (2s, 4s, 8s; max 3 attempts)
5. Deduplicates events via block number + log index

**Retry Strategy**: Exponential backoff with jitter
- Max retries: 3
- Base delay: 1000ms
- Max delay: 10000ms

## Compliance Agent

**Role**: Validates all order state transitions against business rules.

**Port**: 3101

**Wallet**: None (read-only, does not sign transactions)

**Behavior**:
1. Polls for `OrderStatusTransitioned` events
2. Validates each transition against the allowed state machine:
   - Generated → InProcess, Cancelled ✓
   - InProcess → Delivered, Cancelled, Invoiced ✓
   - Delivered → Invoiced ✓
   - All others → VIOLATION
3. Periodically reconciles on-chain vs off-chain order states
4. Reports: `compliant`, `violation`, `warning`

**State Transition Rules (hardcoded)**:
```
Generated → [InProcess, Cancelled]
InProcess → [Delivered, Cancelled, Invoiced]
Delivered → [Invoiced]
```

## Future Agents

| Agent | Role | Triggers | Action |
|-------|------|----------|--------|
| Forecaster | Predict demand, suggest re-orders | Daily cycle | POST inventory suggestions |
| Negotiator | Negotiate terms with clients | New client / renewal | Propose optimized order terms |
| Preference Analyst | Detect product preferences | On-demand | GET /preference, cache results |
| Dispute Resolver | Handle order disputes | Cancelled orders | Evaluate, recommend resolution |

## Agent Lifecycle

1. **Start**: Agent reads env vars, connects to RPC, starts HTTP server
2. **Listen**: Polls for events every `AGENT_POLL_INTERVAL` ms (default 2000)
3. **React**: Processes events, calls contract functions + API endpoints
4. **Log**: Records activity with timestamps and metrics
5. **Shutdown**: On SIGINT/SIGTERM, prints final metrics, exits cleanly

## Development

```bash
# Run Collector Agent
bun --cwd apps/agents dev

# Run Compliance Agent
bun --cwd apps/agents dev:compliance

# Both agents
bun run dev:agents
```

## Agent Principles

1. **Non-fatal failures**: Agent unavailability never breaks the core app
2. **Idempotent actions**: Repeated event processing is safe (deduplication)
3. **Observable**: Every action is logged with context
4. **Recoverable**: Retry with backoff on transient failures
5. **Permissioned**: Collector agent must be authorized by contract owner
