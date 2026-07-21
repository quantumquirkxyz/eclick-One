import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../i18n";
import { ForbiddenPage } from "../../pages/ForbiddenPage";
import { ResourceState } from "../layout/ResourceState";

type AllowedRole = "admin" | "operator" | "viewer" | "agent";

const ROLE_HIERARCHY: Record<AllowedRole, number> = {
  admin: 4,
  operator: 3,
  viewer: 2,
  agent: 1,
};

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: AllowedRole[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const { t } = useI18n();

  if (isLoading) {
    return <ResourceState status="loading" title={t("common.loading")} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
