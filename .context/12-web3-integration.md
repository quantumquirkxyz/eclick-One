# Web3 Integration Reference

## Overview

The Web3 integration adds an immutable, event-driven layer to the existing
commerce platform. Every order and payment operation writes to both the
off-chain database and on-chain smart contracts.

## Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│ Frontend │────▶│ Bun API  │────▶│ Smart Contract│
│ (React)  │     │ (viem)   │     │ (OrderManager)│
└──────────┘     └──────────┘     └──────┬───────┘
                                          │ events
                                    ┌─────▼──────┐
                                    │ AI Agents  │
                                    │ (polling)  │
                                    └────────────┘
```

## Dual-Write Flow

### Create Order
1. `POST /api/v1/orders` — validates input, checks domain rules
2. Writes order to off-chain database (mock/Turso)
3. Calls `OrderManager.createOrder()` on-chain (non-fatal)
4. Returns order to client

### Record Payment
1. `POST /api/v1/payments` — validates amount, checks order state
2. Writes payment to off-chain database
3. Calls `OrderManager.recordPayment()` on-chain
4. Emits `PaymentRecorded` event → Collector Agent reacts

### Transition Status
1. `PATCH /api/v1/orders/:code/status` — validates transition
2. Updates off-chain order status
3. Calls corresponding contract function (on-chain)
4. Emits `OrderStatusTransitioned` event → Compliance Agent reacts

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ONCHAIN_RPC_URL` | For Web3 | `http://localhost:8545` | Anvil RPC endpoint |
| `ONCHAIN_CHAIN_ID` | For Web3 | `31337` | Chain ID (Anvil local) |
| `ONCHAIN_ORDER_MANAGER_ADDRESS` | For Web3 | — | Deployed OrderManager address |
| `ONCHAIN_PAYMENT_LEDGER_ADDRESS` | For Web3 | — | Deployed PaymentLedger address |
| `ONCHAIN_COLLECTOR_PRIVATE_KEY` | For agents | — | Collector agent wallet private key |
| `AGENT_PORT` | For agents | `3100` | Collector agent HTTP port |
| `COMPLIANCE_AGENT_PORT` | For agents | `3101` | Compliance agent HTTP port |
| `AGENT_API_BASE_URL` | For agents | `http://localhost:3000` | Bun API URL for sync |
| `AGENT_POLL_INTERVAL` | For agents | `2000` | Event poll interval (ms) |

## On-Chain Order Status

The frontend displays on-chain order status via:
- `GET /api/v1/orders/:code/onchain` — returns `{ onChain: bool, status: number | null }`

Status mapping:
| Number | Label | Off-chain equivalent |
|--------|-------|---------------------|
| 0 | None | — |
| 1 | Generated | generado |
| 2 | In Process | proceso |
| 3 | Delivered | entregado |
| 4 | Cancelled | cancelado |
| 5 | Invoiced | facturado |

## Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `OnChainStatusBadge` | `components/agent/` | Shows on-chain status per order |
| `AgentActivityPanel` | `components/agent/` | Real-time agent activity feed |
| `Web3Feature` | `features/web3/` | Full Web3 dashboard page |
| `agent.ts` | `services/agent/` | Agent API client + helpers |

## Vite Proxy Configuration

```
/api/*           → http://localhost:3000 (Bun API)
/agent/*         → http://localhost:3100 (Collector Agent)
/agent-compliance/* → http://localhost:3101 (Compliance Agent)
```

## Development Modes

### Mock Mode (no Web3)
- No RPC connection needed
- No smart contracts required
- API works with all existing functionality
- On-chain status returns `{ onChain: false }`

### Full Mode (with Web3 + Agents)
- Anvil running on port 8545
- Contracts deployed and configured
- Collector Agent running on port 3100
- Compliance Agent running on port 3101
- Dual-write active

## Testing

To test the Web3 integration:
1. Start Anvil: `bun run dev:anvil`
2. Deploy contracts: `bun run dev:deploy`
3. Configure collector: `cast send ... addCollector ...`
4. Start API: `bun run dev:api`
5. Verify: `curl http://localhost:3000/api/v1/orders/PA-SYN-0001/onchain`

## Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| On-chain status always `{ onChain: false }` | No RPC connection | Check ONCHAIN_RPC_URL, is Anvil running? |
| Agent shows offline | Agent not started | Start agent with `bun --cwd apps/agents dev` |
| Contract call reverts | Wrong address or ABI | Re-deploy and update env vars |
| Collector doesn't react | Not authorized | `cast send ... addCollector(...)` as owner |
| Dual-write error logged | RPC unavailable | Non-fatal, API continues without on-chain |
