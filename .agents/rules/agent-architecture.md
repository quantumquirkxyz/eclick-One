# AI Agent Architecture Rules

## Agent Design Principles

1. **Non-fatal failures**: Agent crash or unavailability must never break the core app.
2. **Idempotent actions**: Processing the same event twice produces the same result.
3. **Observable**: Every action is logged with AgentActivity (structured logs + metrics).
4. **Recoverable**: Transient failures retry with exponential backoff.
5. **Permissioned**: Agents must be authorized by the contract owner to perform on-chain actions.

## Agent Structure

```
apps/agents/src/
  agent-activity.ts      Structured logging + metrics (AgentActivity)
  agent-http.ts          HTTP server template (AgentHttpServer)
  contract-abi.ts        Shared ABI definitions for OrderManager + PaymentLedger
  order-hash.ts          Deterministic order ID generation
  collector-agent.ts      Collector Agent implementation
  compliance-agent.ts     Compliance Agent implementation
```

## Shared Utilities

### AgentActivity

Structured logging with metrics tracking:
- Levels: `info`, `action`, `error`
- Metrics: ordersProcessed, ordersFailed, avgResponseTimeMs, uptimeSeconds
- Max 1000 entries, auto-eviction of oldest
- Returned via `/activity` and `/metrics` HTTP endpoints

### AgentHttpServer

Every agent MUST expose:
| Endpoint | Purpose |
|----------|---------|
| `GET /health` | `{ status, agent, wallet, uptime }` |
| `GET /activity?count=N` | Recent activity entries |
| `GET /metrics` | `AgentMetrics` object |
| `GET /info` | `{ name, wallet, description }` |

### Order Hashing

Order IDs are deterministic: `keccak256(abi.encodePacked(orderCode, clientCode, productCode))`.
The same hash function is used in both Solidity (`OrderHash.sol`) and TypeScript (`order-hash.ts`).

## Agent Lifecycle

### Startup
1. Read environment variables
2. Connect to RPC via viem
3. Get wallet from private key (Collector) or empty (read-only agents)
4. Start HTTP server
5. Begin polling for events

### Event Loop
1. Poll for new events since last processed block
2. Filter to unprocessed events (tracked by blockNumber + logIndex)
3. For each event:
   a. Validate state
   b. Execute action (contract call + API call for sync)
   c. Log activity
   d. Update processed event tracker
4. Sleep for `AGENT_POLL_INTERVAL` ms (default 2000)
5. Repeat

### Shutdown
On SIGINT/SIGTERM:
1. Print final metrics
2. Exit cleanly

## Retry Strategy

```typescript
const retryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};
```

Use exponential backoff with jitter. Max 3 attempts per action.

## Existing Agents

### Collector Agent
- **Port**: 3100
- **Wallet**: Contract-authorized collector address
- **Role**: Monitor `PaymentRecorded` events, transition orders to Delivered
- **Action**: `transitionToDelivered()` on contract + `PATCH /api/v1/orders/:code/status` on API
- **Auth**: Requires `addCollector()` by owner

### Compliance Agent
- **Port**: 3101
- **Wallet**: None (read-only)
- **Role**: Validate all state transitions against domain rules
- **Action**: No on-chain actions; reports violations/warnings via logs
- **Extra**: Periodic reconciliation of on-chain vs off-chain order states

## Creating a New Agent

1. Add a new file in `apps/agents/src/` named `<name>-agent.ts`
2. Extend the common agent pattern (AgentHttpServer, AgentActivity, event polling)
3. Add a `dev:<name>` script in `apps/agents/package.json`
4. Add the agent to `bun run dev:agents` or create a new orchestration script
5. Add agent info to `.context/11-ai-agents.md`
6. Document agent environment variables in `.env.example`

## Agent Config (.env)

| Variable | Purpose |
|----------|---------|
| `ONCHAIN_RPC_URL` | RPC endpoint |
| `ONCHAIN_CHAIN_ID` | Chain ID |
| `ONCHAIN_ORDER_MANAGER_ADDRESS` | Contract address |
| `ONCHAIN_PAYMENT_LEDGER_ADDRESS` | Contract address |
| `ONCHAIN_COLLECTOR_PRIVATE_KEY` | Agent wallet key |
| `AGENT_PORT` | Agent HTTP server port |
| `AGENT_API_BASE_URL` | Bun API URL |
| `AGENT_POLL_INTERVAL` | Event poll interval (ms) |
