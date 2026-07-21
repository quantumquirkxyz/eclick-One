FROM oven/bun:1.3.14-debian AS deps
WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/agents/package.json apps/agents/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile --filter @eclick-one/api --linker=hoisted

FROM oven/bun:1.3.14-debian AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages ./packages
RUN mkdir -p node_modules/@eclick-one \
  && ln -sfn ../../packages/domain node_modules/@eclick-one/domain \
  && ln -sfn ../../packages/db node_modules/@eclick-one/db \
  && ln -sfn ../../packages/shared node_modules/@eclick-one/shared

USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1:3000/api/v1/health'); if (!r.ok) process.exit(1)"

CMD ["bun", "apps/api/src/server.ts"]
