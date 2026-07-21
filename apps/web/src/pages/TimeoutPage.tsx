import { ErrorState } from "../components/ErrorState";
import { AppError } from "../services/api/client";

export function TimeoutPage() {
  return <ErrorState error={new AppError("Timeout", 408, "NETWORK_TIMEOUT")} onRetry={() => window.location.assign("/app")} variant="full-page" />;
}
