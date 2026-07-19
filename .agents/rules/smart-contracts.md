# Smart Contract Rules

## Tooling

- Build system: Foundry (forge, anvil, cast)
- Language: Solidity ^0.8.27 (tested with 0.8.28)
- Tests: Forge test framework
- Local chain: Anvil (chain ID 31337)
- Contracts: OrderManager.sol, PaymentLedger.sol

## Contract Conventions

### State Machine

Order status transitions MUST follow the domain rules defined in
`.agents/rules/domain-rules.md`. The contract mirrors the off-chain lifecycle:

```
None (0) → Generated (1) → InProcess (2) → Delivered (3) → Invoiced (5)
                              ↘ Cancelled (4)
```

Every valid transition emits an `OrderStatusTransitioned` event.

### Access Control

- **Owner**: deployer account. Can add/remove collectors, manage the contract.
- **Collector**: authorized by owner. Can transition order states.
- **Public**: anyone can create orders and record payments.

Use a `mapping(address => bool) public isCollector` pattern.
Events: `CollectorAdded`, `CollectorRemoved`.

### Event Standards

Every function that changes state MUST emit an event. Events are the primary
interface for AI agents to detect and react to state changes.

| Event | Indexed params | Purpose |
|-------|---------------|---------|
| `OrderCreated` | orderId | Agent discovers new orders |
| `OrderStatusTransitioned` | orderId | Compliance Agent validates |
| `PaymentRecorded` | orderId | Collector Agent reacts |
| `CollectorAdded/Removed` | collector | Security auditing |

### Error Handling

Use `require()` with descriptive error strings (not custom errors).
```
require(status == OrderStatus.Generated, "Order already in process");
```

## Deployment

### Local Development

```bash
anvil                           # Start local chain
forge script script/Deploy.s.sol --broadcast --rpc-url http://localhost:8545
cast send <ORDER_MANAGER> "addCollector(address)" <COLLECTOR_ADDR> \
  --private-key <DEPLOYER_KEY> --rpc-url http://localhost:8545
```

### Environment Variables

Set in `.env`:
- `ONCHAIN_RPC_URL` — Anvil RPC endpoint
- `ONCHAIN_CHAIN_ID` — Chain ID (31337)
- `ONCHAIN_ORDER_MANAGER_ADDRESS` — Deployed OrderManager address
- `ONCHAIN_PAYMENT_LEDGER_ADDRESS` — Deployed PaymentLedger address
- `ONCHAIN_COLLECTOR_PRIVATE_KEY` — Collector agent wallet private key

### Production

When deploying to a production chain (Sepolia, Base, etc.):
1. Use a `.env.production` file
2. Test on testnet first
3. Use a multisig for owner operations
4. Verify contracts on Etherscan/Blockscout
5. Update contract addresses in all agent configs

## Testing

### Coverage Requirements

- Every state transition in both directions (valid and invalid)
- Access control: owner, collector, unauthorized
- Re-entrancy protection (all state changes happen before external calls)
- Duplicate prevention (e.g., same payment recorded twice)
- Edge cases: zero addresses, maximum amounts, overflow

### Running Tests

```bash
forge test
forge test --match-contract OrderManager -vvv   # Verbose for a specific contract
forge coverage                                    # Coverage report
```

## Dual-Write Compatibility

Contracts MUST be designed to work alongside off-chain storage:
- The Bun API writes to both DB and contract
- Contract reverts are non-fatal (API catches and logs)
- The API never depends on contract state for core functionality
- Agent-sourced state changes (via contract) are synced back to off-chain DB
