import { AlertTriangle, Ban, Clock3, CloudOff, RefreshCcw, ServerCrash, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useI18n } from "../i18n";
import { AppError, normalizeAppError } from "../services/api/client";

type ErrorStateVariant = "full-page" | "inline" | "toast";

export interface ErrorStateProps {
  error: AppError | Error;
  onRetry: () => void;
  variant?: ErrorStateVariant;
}

export function ErrorState({ error, onRetry, variant = "inline" }: ErrorStateProps) {
  const { t } = useI18n();
  const appError = normalizeAppError(error);
  const presentation = describeError(appError, t);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!shouldAutoRetry(appError)) {
      return;
    }
    const retryOnReconnect = () => onRetry();
    window.addEventListener("online", retryOnReconnect);
    return () => window.removeEventListener("online", retryOnReconnect);
  }, [appError, onRetry]);

  if (variant === "toast") {
    return (
      <div className="error-toast" role="alert">
        <presentation.icon size={18} />
        <div>
          <strong>{presentation.title}</strong>
          <p>{presentation.description}</p>
        </div>
        <button className="secondary-button" onClick={onRetry}>
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const content = (
    <section className={`error-state${variant === "full-page" ? " error-state-full-page" : ""}`} role="alert">
      <div className="error-state-icon" aria-hidden="true">
        <presentation.icon size={30} strokeWidth={1.8} />
      </div>
      <div className="error-state-copy">
        <h2>{presentation.title}</h2>
        <p>{presentation.description}</p>
        {appError.message && appError.message !== presentation.description ? <small>{appError.message}</small> : null}
      </div>
      <div className="error-state-actions">
        <button className="primary-button" onClick={onRetry}>
          <RefreshCcw size={16} />
          {t("common.retry")}
        </button>
        <Link className="secondary-button" to="/app">
          {t("errors.goHome")}
        </Link>
      </div>
    </section>
  );

  if (variant === "full-page") {
    return <main className="system-state-page">{content}</main>;
  }
  return content;
}

function shouldAutoRetry(error: AppError): boolean {
  return error.code === "NETWORK_OFFLINE" || error.code === "NETWORK_TIMEOUT" || error.code === "NETWORK_UNAVAILABLE";
}

function describeError(error: AppError, t: (key: any) => string): { icon: LucideIcon; title: string; description: string } {
  if (error.status === 403) {
    return { icon: Ban, title: t("errors.forbiddenTitle"), description: t("errors.forbiddenDescription") };
  }
  if (error.status === 404) {
    return { icon: AlertTriangle, title: t("notFound.title"), description: t("notFound.copy") };
  }
  if (error.status === 408 || error.code === "NETWORK_TIMEOUT") {
    return { icon: Clock3, title: t("errors.timeoutTitle"), description: t("errors.timeoutDescription") };
  }
  if (error.code === "NETWORK_OFFLINE" || error.code === "NETWORK_UNAVAILABLE" || error.status === 0) {
    return { icon: CloudOff, title: t("errors.offlineTitle"), description: t("errors.offlineDescription") };
  }
  if (error.status >= 500 || error.code === "RUNTIME_ERROR") {
    return { icon: ServerCrash, title: t("errors.serverTitle"), description: t("errors.serverDescription") };
  }
  return { icon: AlertTriangle, title: t("errors.genericTitle"), description: t("errors.genericDescription") };
}
