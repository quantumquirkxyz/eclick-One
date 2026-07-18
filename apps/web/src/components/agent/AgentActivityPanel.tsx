import { useEffect, useState } from "react";
import { collectorApi, type AgentActivityEntry } from "../../services/agent/agent";
import { useI18n } from "../../i18n";

export function AgentActivityPanel() {
  const { t } = useI18n();
  const [activity, setActivity] = useState<readonly AgentActivityEntry[]>([]);
  const [online, setOnline] = useState(false);

  const load = async () => {
    const health = await collectorApi.health();
    setOnline(health !== null && health.status === "ok");
    const entries = await collectorApi.activity(20);
    setActivity(entries ?? []);
  };

  useEffect(() => {
    void load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const icon = (type: AgentActivityEntry["type"]) => {
    switch (type) {
      case "action": return { symbol: "→", cls: "agent-action" };
      case "error": return { symbol: "✗", cls: "agent-error" };
      case "info": return { symbol: "ℹ", cls: "agent-info" };
    }
  };

  return (
    <section className="panel">
      <h3>
        {t("dashboard.agentActivity")}
        <span className={`agent-status ${online ? "online" : "offline"}`}>
          {online ? t("dashboard.agentRunning") : t("dashboard.agentOffline")}
        </span>
      </h3>
      {activity.length === 0 ? (
        <p className="text-muted">{online ? "No recent activity" : "Agent is not reachable"}</p>
      ) : (
        <div className="agent-activity-list">
          {activity.map((entry, index) => {
            const { symbol, cls } = icon(entry.type);
            return (
              <div key={index} className={`agent-entry ${cls}`}>
                <span className="agent-entry-icon">{symbol}</span>
                <span className="agent-entry-msg">{entry.message}</span>
                <span className="agent-entry-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
