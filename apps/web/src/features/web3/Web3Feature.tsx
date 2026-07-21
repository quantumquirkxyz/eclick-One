import { useEffect, useState } from "react";
import { collectorApi, complianceApi, type AgentHealth, type AgentMetrics, type AgentActivityEntry, type AgentInfo } from "../../services/agent/agent";
import { Skeleton, SkeletonCard, SkeletonPage, SkeletonPageTitle, SkeletonTable, SkeletonText } from "../../components/Skeleton";
import { useI18n } from "../../i18n";

function useAgent<H, M, A>(
  api: { health(): Promise<H | null>; metrics(): Promise<M | null>; activity(count?: number): Promise<A | null>; info(): Promise<AgentInfo | null> },
  intervalMs = 5000,
) {
  const [health, setHealth] = useState<H | null>(null);
  const [metrics, setMetrics] = useState<M | null>(null);
  const [activity, setActivity] = useState<A | null>(null);
  const [info, setInfo] = useState<AgentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    const [nextHealth, nextMetrics, nextActivity, nextInfo] = await Promise.all([
      api.health(),
      api.metrics(),
      api.activity(10),
      info ? Promise.resolve(info) : api.info(),
    ]);
    setHealth(nextHealth);
    setMetrics(nextMetrics);
    setActivity(nextActivity);
    if (!info) setInfo(nextInfo);
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
    const interval = setInterval(load, intervalMs);
    return () => clearInterval(interval);
  }, []);

  return { health, metrics, activity, info, isLoading, reload: load };
}

function AgentCard({
  name,
  health,
  metrics,
  activity,
  info,
  icon,
}: {
  name: string;
  health: AgentHealth | null;
  metrics: AgentMetrics | null;
  activity: readonly AgentActivityEntry[] | null;
  info: AgentInfo | null;
  icon: string;
}) {
  const isOnline = health !== null && health.status === "ok";

  return (
    <section className="panel">
      <h3>
        {icon} {name}
        <span className={`badge ${isOnline ? "badge-success" : "badge-neutral"}`} style={{ marginLeft: 8 }}>
          {isOnline ? "Online" : "Offline"}
        </span>
      </h3>
      {info && <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{info.description}</p>}
      {info && <p className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>Wallet: <code>{info.wallet}</code></p>}

      {metrics && (
        <div className="metrics mini-metrics" style={{ marginTop: 12 }}>
          <div className="metric"><p>Actions</p><strong>{metrics.totalActions}</strong></div>
          <div className="metric"><p>Errors</p><strong>{metrics.totalErrors}</strong></div>
          <div className="metric"><p>Orders</p><strong>{metrics.ordersProcessed}</strong></div>
          <div className="metric"><p>Avg (ms)</p><strong>{metrics.avgResponseTimeMs}</strong></div>
          <div className="metric"><p>Uptime</p><strong>{Math.floor(metrics.uptimeSeconds / 60)}m</strong></div>
        </div>
      )}

      {activity && activity.length > 0 && (
        <div className="agent-activity-list" style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Recent Activity</p>
          {activity.map((entry, i) => (
            <div key={i} className={`agent-entry agent-${entry.type}`}>
              <span className="agent-entry-icon">
                {entry.type === "action" ? "→" : entry.type === "error" ? "✗" : "ℹ"}
              </span>
              <span className="agent-entry-msg">{entry.message}</span>
            </div>
          ))}
        </div>
      )}

      {!isOnline && <p className="text-muted" style={{ marginTop: 12 }}>Agent is not reachable</p>}
    </section>
  );
}

function ContractInfo() {
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [rpcUrl, setRpcUrl] = useState("");

  useEffect(() => {
    setRpcUrl(import.meta.env.VITE_ONCHAIN_RPC_URL ?? "http://localhost:8545");
    const check = async () => {
      try {
        const response = await fetch("/api/v1/health");
        if (response.ok) {
          const data = await response.json();
          if (data.blockNumber) setBlockNumber(BigInt(data.blockNumber));
        }
      } catch {}
    };
    void check();
  }, []);

  const orderManagerAddress = import.meta.env.VITE_ORDER_MANAGER_ADDRESS ?? "0x5FbDB2...";

  return (
    <section className="panel">
      <h3>Smart Contracts</h3>
      <dl style={{ fontSize: 13, lineHeight: 2 }}>
        <dt style={{ fontWeight: 700, color: "#64748b" }}>OrderManager</dt>
        <dd><code>{orderManagerAddress}</code></dd>
        <dt style={{ fontWeight: 700, color: "#64748b", marginTop: 8 }}>RPC URL</dt>
        <dd><code>{rpcUrl}</code></dd>
        <dt style={{ fontWeight: 700, color: "#64748b", marginTop: 8 }}>Chain ID</dt>
        <dd><code>31337 (Anvil)</code></dd>
        <dt style={{ fontWeight: 700, color: "#64748b", marginTop: 8 }}>Last Block</dt>
        <dd><code>{blockNumber?.toString() ?? "—"}</code></dd>
      </dl>
    </section>
  );
}

function OnChainOrderLookup() {
  const { t } = useI18n();
  const [orderCode, setOrderCode] = useState("");
  const [result, setResult] = useState<{ status: number; isPaid: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async () => {
    if (!orderCode.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`/api/v1/orders/${encodeURIComponent(orderCode.trim())}/onchain`);
      if (!response.ok) {
        setError(`Status ${response.status}`);
        return;
      }
      const data = await response.json();
      if (data.onChain && data.status !== null) {
        setResult({ status: data.status, isPaid: false });
      } else {
        setError("Not found on-chain");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h3>On-chain Order Lookup</h3>
      <div className="inline-form">
        <input
          type="text"
          placeholder="Order code (e.g. PA-SYN-0001)"
          value={orderCode}
          onChange={(e) => setOrderCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
        />
        <button className="primary-button" onClick={lookup} disabled={loading}>
          {loading ? "..." : "Lookup"}
        </button>
      </div>
      {result && (
        <div style={{ marginTop: 12 }}>
          <p>Status: <strong>{["None", "Generated", "In Process", "Delivered", "Cancelled", "Invoiced"][result.status] ?? result.status}</strong></p>
        </div>
      )}
      {error && <p className="text-error" style={{ marginTop: 8 }}>{error}</p>}
    </section>
  );
}

export function Web3Feature() {
  const { t } = useI18n();
  const collector = useAgent<AgentHealth, AgentMetrics, readonly AgentActivityEntry[]>(collectorApi, 3000);
  const compliance = useAgent<AgentHealth, AgentMetrics, readonly AgentActivityEntry[]>(complianceApi, 3000);
  const isLoading = collector.isLoading || compliance.isLoading;

  const anyOnline = (collector.health?.status === "ok") || (compliance.health?.status === "ok");

  if (isLoading) {
    return <Web3LoadingSkeleton title={t("nav.web3")} description={t("common.loading")} />;
  }

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>Web3 + AI Agents</h2>
          <p>
            {anyOnline
              ? "Agentic Commerce Network — agents are online and monitoring on-chain activity"
              : "Agentic Commerce Network — no agents detected (start anvil + agents to see them)"}
          </p>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <AgentCard
          name="Collector Agent"
          icon="→"
          health={collector.health}
          metrics={collector.metrics}
          activity={collector.activity}
          info={collector.info}
        />
        <AgentCard
          name="Compliance Agent"
          icon="✓"
          health={compliance.health}
          metrics={compliance.metrics}
          activity={compliance.activity}
          info={compliance.info}
        />
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <ContractInfo />
        <OnChainOrderLookup />
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Architecture: Agentic Commerce Network</h3>
        <div className="architecture-flow" style={{ padding: 16 }}>
          <div className="architecture-node">
            <span>React SPA</span>
            <b>→</b>
          </div>
          <div className="architecture-node">
            <span>Bun API</span>
            <small style={{ color: "#64748b", fontSize: 10 }}>Dual-write</small>
            <b>→</b>
          </div>
          <div className="architecture-node">
            <span>DB</span>
            <small style={{ color: "#64748b", fontSize: 10 }}>Mock / Turso</small>
            <b>→</b>
          </div>
          <div className="architecture-node">
            <span>Smart Contracts</span>
            <small style={{ color: "#64748b", fontSize: 10 }}>Anvil (31337)</small>
            <b>→</b>
          </div>
          <div className="architecture-node">
            <span>AI Agents</span>
            <small style={{ color: "#64748b", fontSize: 10 }}>Collector / Compliance</small>
          </div>
        </div>
      </div>
    </section>
  );
}

function Web3LoadingSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <SkeletonPage title={title} description={description}>
      <SkeletonPageTitle />
      <div className="grid two" style={{ marginTop: 16 }}>
        <SkeletonCard lines={6} />
        <SkeletonCard lines={6} />
      </div>
      <div className="grid two" style={{ marginTop: 16 }}>
        <section className="panel" aria-hidden="true">
          <Skeleton className="skeleton-heading" />
          <SkeletonText lines={5} widths={["42%", "88%", "52%", "72%", "36%"]} className="skeleton-stack-gap" />
        </section>
        <section className="panel" aria-hidden="true">
          <Skeleton className="skeleton-heading" />
          <div className="inline-form">
            <Skeleton className="skeleton-input" />
            <Skeleton className="skeleton-button" />
          </div>
          <Skeleton className="skeleton-inline-status" />
        </section>
      </div>
      <section className="panel" style={{ marginTop: 16 }} aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <div className="architecture-flow" style={{ padding: 16 }}>
          {Array.from({ length: 5 }, (_, index) => (
            <div className="architecture-node" key={index}>
              <Skeleton className="skeleton-node-icon" />
              <Skeleton className="skeleton-node-label" />
              {index < 4 ? <b>→</b> : null}
            </div>
          ))}
        </div>
      </section>
    </SkeletonPage>
  );
}
