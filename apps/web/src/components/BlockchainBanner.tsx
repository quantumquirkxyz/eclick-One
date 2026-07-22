import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { fetchBlockchainStatus, type BlockchainStatus } from "../services/api/blockchain";

export function BlockchainBanner() {
  const { t } = useI18n();
  const [status, setStatus] = useState<BlockchainStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const nextStatus = await fetchBlockchainStatus();
      if (mounted) {
        setStatus(nextStatus);
      }
    };
    void load();
    const interval = setInterval(load, 10_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (status?.mode === "connected") {
    return null;
  }

  const copy = status?.mode === "unavailable"
    ? t("errors.blockchainUnavailableBanner")
    : t("errors.blockchainOfflineBanner");

  return (
    <div className="offline-banner blockchain-banner" role="status" aria-live="polite">
      <AlertTriangle size={18} />
      <span>{copy}</span>
    </div>
  );
}
