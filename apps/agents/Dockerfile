FROM oven/bun:1.3.14-debian AS deps
WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/agents/package.json apps/agents/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile --filter @eclick-one/agents --linker=hoisted

FROM oven/bun:1.3.14-debian AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    AGENT_PORT=3100 \
    COMPLIANCE_AGENT_PORT=3101 \
    AGENT_API_BASE_URL=http://api:3000 \
    ONCHAIN_RPC_URL=http://anvil:8545

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/agents ./apps/agents
COPY packages ./packages

USER bun
EXPOSE 3100 3101
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "const port = process.env.AGENT_HEALTH_PORT ?? process.env.AGENT_PORT ?? '3100'; const r = await fetch('http://127.0.0.1:' + port + '/health'); if (!r.ok) process.exit(1)"

CMD ["bun", "apps/agents/src/collector-agent.ts"]
