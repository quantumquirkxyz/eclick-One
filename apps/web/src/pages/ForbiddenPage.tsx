import { ErrorState } from "../components/ErrorState";
import { AppError } from "../services/api/client";

export function ForbiddenPage() {
  return <ErrorState error={new AppError("Forbidden", 403, "FORBIDDEN")} onRetry={() => window.history.back()} variant="full-page" />;
}
