import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

export function OfflineBanner() {
  const { t } = useI18n();
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <WifiOff size={18} />
      <span>{t("errors.offlineBanner")}</span>
    </div>
  );
}
