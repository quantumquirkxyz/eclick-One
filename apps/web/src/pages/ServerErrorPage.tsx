import { ErrorState } from "../components/ErrorState";
import { AppError } from "../services/api/client";

export function ServerErrorPage() {
  return <ErrorState error={new AppError("Server error", 500, "SERVER_ERROR")} onRetry={() => window.location.assign("/app")} variant="full-page" />;
}
