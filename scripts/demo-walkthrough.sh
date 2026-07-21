#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_URL="${DEMO_API_URL:-http://localhost:3000/api/v1}"
WEB_URL="${DEMO_WEB_URL:-http://localhost}"
COLLECTOR_HEALTH_URL="${DEMO_COLLECTOR_HEALTH_URL:-http://localhost:3100/health}"
COMPLIANCE_HEALTH_URL="${DEMO_COMPLIANCE_HEALTH_URL:-http://localhost:3101/health}"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "demo-walkthrough requires docker compose or docker-compose." >&2
  exit 1
fi

echo "[demo-walkthrough] Starting demo stack..."
"${COMPOSE_CMD[@]}" up -d --build anvil contracts-deploy api web collector-agent compliance-agent

wait_for_url() {
  local url="$1"
  local name="$2"
  for _ in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "[demo-walkthrough] $name is ready at $url"
      return 0
    fi
    sleep 2
  done
  echo "[demo-walkthrough] Timed out waiting for $name at $url" >&2
  return 1
}

wait_for_url "$API_URL/health" "API"
wait_for_url "$WEB_URL" "Frontend"
wait_for_url "$COLLECTOR_HEALTH_URL" "Collector agent"
wait_for_url "$COMPLIANCE_HEALTH_URL" "Compliance agent"

echo "[demo-walkthrough] Running demo seed..."
bun run demo:seed

echo "[demo-walkthrough] Demo smoke checks"
curl -fsS "$API_URL/health" >/dev/null
curl -fsS "$COLLECTOR_HEALTH_URL" >/dev/null
curl -fsS "$COMPLIANCE_HEALTH_URL" >/dev/null

echo
echo "[demo-walkthrough] Demo is ready"
echo "  Frontend: $WEB_URL"
echo "  API:      $API_URL"
echo "  Collector health:  $COLLECTOR_HEALTH_URL"
echo "  Compliance health: $COMPLIANCE_HEALTH_URL"
echo "  Suggested walkthrough:"
echo "    1. Log in with demo.operator@eclick.one / DemoSeedPassword-2026"
echo "    2. Show dashboard metrics and at-risk orders"
echo "    3. Visit Customers and Orders for seeded scenarios"
echo "    4. Visit Web3 dashboard to inspect agent health and on-chain lookup"

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$WEB_URL" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "$WEB_URL" >/dev/null 2>&1 || true
fi

if command -v qrencode >/dev/null 2>&1; then
  echo
  echo "[demo-walkthrough] Frontend QR"
  qrencode -t ANSIUTF8 "$WEB_URL" || true
fi
