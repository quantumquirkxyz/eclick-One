# Smart Contracts Reference

## Overview

The project uses Solidity smart contracts deployed on Anvil (local chain 31337) for
immutable order lifecycle and payment recording. Contracts are built with Foundry.

## Contract Architecture

```
OrderManager.sol ←→ PaymentLedger.sol
     │
     └── emits events → AI Agents listen
     └── state machine → order lifecycle on-chain
     └── access control → owner + collector roles
```

## OrderManager.sol

### State Machine

```
None (0) → Generated (1) → InProcess (2) → Delivered (3) → Invoiced (5)
                              ↘ Cancelled (4)
```

### Events

| Event | Indexed | Data |
|-------|---------|------|
| `OrderCreated` | orderId | orderCode, clientCode, productCode, quantity, amount |
| `OrderStatusTransitioned` | orderId | from, to, triggeredBy |
| `PaymentRecorded` | orderId | amount |
| `CollectorAdded` | collector | — |
| `CollectorRemoved` | collector | — |

### Functions

| Function | Access | Description |
|----------|--------|-------------|
| `createOrder(...)` | public | Create a new order on-chain |
| `transitionToInProcess(id)` | owner/collector | Advance from Generated → InProcess |
| `transitionToDelivered(id)` | owner/collector | Advance from InProcess → Delivered (requires payment) |
| `transitionToInvoiced(id)` | owner/collector | Advance from InProcess/Delivered → Invoiced (requires payment) |
| `cancelOrder(id)` | owner/collector | Cancel Generated or InProcess order |
| `recordPayment(id, amount)` | public | Record payment against an order (amount must match) |
| `addCollector(addr)` | owner | Authorize a collector agent |
| `removeCollector(addr)` | owner | Revoke collector authorization |
| `getOrder(id)` | view | Returns full order struct |
| `getOrderStatus(id)` | view | Returns current status enum |

### Order Struct

```solidity
struct Order {
    OrderStatus status;
    uint256 clientCode;
    uint256 productCode;
    uint256 quantity;
    uint256 amount;
    bool isPaid;
    uint256 createdAt;
    uint256 paidAt;
    bool exists;
}
```

### Access Control

- **Owner**: deployer account, can add/remove collectors
- **Collector**: authorized agent account, can transition order states
- **Public**: anyone can create orders and record payments

## PaymentLedger.sol

### Payment Struct

```solidity
struct Payment {
    bytes32 orderId;
    uint256 amount;
    uint256 timestamp;
    string cardType;
    string ref;
}
```

### Functions

| Function | Access | Description |
|----------|--------|-------------|
| `recordPayment(...)` | public | Append a payment record |
| `getPaymentCount()` | view | Total payments |
| `getPayment(index)` | view | Payment by index |
| `getOrderPayments(id)` | view | All payments for an order |

## Deployment

### Local (Anvil)

```bash
# Start Anvil
anvil

# Deploy
forge script script/Deploy.s.sol --broadcast --rpc-url http://localhost:8545

# Configure collector
cast send <OrderManager> "addCollector(address)" <COLLECTOR_ADDR> \
  --private-key <DEPLOYER_KEY> --rpc-url http://localhost:8545
```

### Deployed Addresses (Anvil local)

- OrderManager: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- PaymentLedger: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- Deployer (Account #0): `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Collector (Account #1): `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

## Testing

All contracts have comprehensive Forge tests:

```bash
forge test
```

Test coverage includes: state transitions, access control, duplicate prevention,
payment validation, collector management. See `test/OrderManager.t.sol`.

## Dual-Write Pattern

The Bun API writes every order/payment operation to BOTH:
1. The off-chain database (mock/Turso) — fast queries, joins, analytics
2. The on-chain smart contract — immutable record, events for agents

The on-chain write is non-fatal: if the RPC is unavailable, the API still succeeds
but logs the error. Agents reconcile state via periodic verification.
