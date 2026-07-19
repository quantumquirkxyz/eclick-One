# AI Agent Development Skill

## Description

AI agent development workflow for the Agentic Commerce Network.
Covers creating, testing, and deploying autonomous agents.

## Workflow

### 1. Plan
- Review `.agents/rules/agent-architecture.md`
- Review `.context/11-ai-agents.md`
- Check existing agents in `apps/agents/src/`
- Determine agent role, triggers, and actions

### 2. Develop
- Create agent file: `apps/agents/src/<name>-agent.ts`
- Use shared utilities: `AgentActivity`, `AgentHttpServer`, `contract-abi.ts`, `order-hash.ts`
- Implement event polling loop with deduplication
- Implement action with retry logic
- Add dev script to `apps/agents/package.json`

### 3. Test (Local)
- Start Anvil: `bun run dev:anvil`
- Deploy contracts: `bun run dev:deploy`
- Authorize collector: `cast send ... addCollector ...`
- Start API: `bun run dev:api`
- Start agent: `bun --cwd apps/agents dev:<name>`
- Verify: `curl http://localhost:<PORT>/health`

### 4. Verify
- Check agent activity: `curl /activity`
- Check agent metrics: `curl /metrics`
- Create an order via API: `POST /api/v1/orders`
- Record a payment: `POST /api/v1/payments`
- Verify agent reacts (logs show action taken)

### 5. Document
- Add agent info to `.context/11-ai-agents.md`
- Add agent env vars to `.env.example`
- Add agent to `bun run dev:agents` or similar orchestration

## Key Agent Patterns

### Event Polling
```typescript
const events = await publicClient.getContractEvents({
  address: orderManagerAddress,
  abi: orderManagerAbi,
  eventName: 'PaymentRecorded',
  fromBlock: lastProcessedBlock + 1n,
  toBlock: 'latest',
});
```

### Retry with Backoff
```typescript
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try { return await action(); }
  catch (e) {
    if (attempt === maxRetries) throw e;
    await sleep(baseDelayMs * 2 ** (attempt - 1) + jitter);
  }
}
```

### Deduplication
```typescript
const key = `${event.blockNumber}-${event.logIndex}`;
if (processed.has(key)) continue;
processed.add(key);
```

## Key Commands

```bash
bun --cwd apps/agents dev              # Collector Agent
bun --cwd apps/agents dev:compliance   # Compliance Agent
curl http://localhost:3100/health       # Collector health
curl http://localhost:3101/health       # Compliance health
```
