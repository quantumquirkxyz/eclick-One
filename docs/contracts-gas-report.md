# Smart Contract Gas Report

Generated from `forge test --gas-report` on July 21, 2026 after adding fuzz and invariant coverage for issue `#31`.

## OrderManager

| Function | Avg Gas |
|----------|---------|
| `addCollector` | 26,665 |
| `removeCollector` | 24,188 |
| `createOrder` | 172,663 |
| `transitionToInProcess` | 27,912 |
| `transitionToDelivered` | 27,068 |
| `transitionToInvoiced` | 26,890 |
| `cancelOrder` | 27,828 |
| `recordPayment` | 52,239 |
| Deployment | 2,307,622 |

## PaymentLedger

| Function | Avg Gas |
|----------|---------|
| `recordPayment` | 170,027 |
| `getPayment` | 17,275 |
| `getOrderPayments` | 29,398 |
| `getOrderPaymentCount` | 2,799 |
| `getPaymentCount` | 2,506 |
| Deployment | 1,206,927 |

## Notes

- Gas reporting is enabled in `apps/contracts/foundry.toml`.
- Values above were captured from the July 21, 2026 Foundry gas report after the new fuzz and invariant suites passed.
