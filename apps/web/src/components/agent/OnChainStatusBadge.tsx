import { useEffect, useState } from "react";
import { fetchOnChainStatus, formatOnChainStatus } from "../../services/agent/agent";
import { useI18n } from "../../i18n";

export function OnChainStatusBadge({ orderCode }: { orderCode: string }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<{ onChain: boolean; status: number | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOnChainStatus(orderCode).then((result) => {
      if (mounted) {
        setStatus(result);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) {
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [orderCode]);

  if (loading) return <span className="badge badge-neutral">...</span>;
  if (!status || !status.onChain) return <span className="badge badge-neutral">{t("dashboard.noOnChain")}</span>;

  const isSettled = status.status === 3 || status.status === 4 || status.status === 5;
  const isActive = status.status === 2;

  return (
    <span className={`badge ${isSettled ? "badge-success" : isActive ? "badge-warning" : "badge-info"}`} title={formatOnChainStatus(status.status)}>
      {t("dashboard.onChain")}: {formatOnChainStatus(status.status)}
    </span>
  );
}
