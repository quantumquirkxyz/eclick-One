# Smart Contract Development Skill

## Description

Solidity smart contract development workflow for the Agentic Commerce Network.
Covers writing, testing, deploying, and verifying contracts.

## Workflow

### 1. Plan
- Review `.agents/rules/smart-contracts.md`
- Review `.context/10-smart-contracts.md`
- Check existing contracts in `apps/contracts/src/`
- Check existing tests in `apps/contracts/test/`

### 2. Develop
- Write Solidity contracts in `apps/contracts/src/`
- Follow patterns from `OrderManager.sol` and `PaymentLedger.sol`
- Events must be emitted for every state change
- Use `require()` with descriptive error strings
- Add NatSpec comments for public functions

### 3. Test
- Write Forge tests in `apps/contracts/test/`
- Cover: valid/invalid state transitions, access control, re-entrancy, duplicates, edge cases
- Run: `forge test`

### 4. Deploy
- Update `script/Deploy.s.sol` if needed
- Run: `forge script script/Deploy.s.sol --broadcast --rpc-url <RPC>`
- Record deployed addresses
- Update `.env` with new contract addresses

### 5. Configure
- Owner must add collector addresses: `cast send <ADDR> "addCollector(address)" <COLLECTOR> --private-key <KEY>`
- Verify collector is authorized: `cast call <ADDR> "isCollector(address)" <COLLECTOR>`

### 6. Test Integration
- Verify API can connect: `bun run dev:api`
- Verify agents can connect: `bun --cwd apps/agents dev`
- Check on-chain status: `curl /api/v1/orders/:code/onchain`

## Key Commands

```bash
forge build              # Compile contracts
forge test               # Run tests
forge coverage           # Coverage report
forge script --broadcast # Deploy
anvil                    # Local chain
cast send                # Write to contract
cast call                # Read from contract
```
