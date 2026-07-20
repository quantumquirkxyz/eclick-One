import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

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

  if (isLoading) {
    return <div className="resource-state"><p className="text-muted">Loading...</p></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <div className="resource-state"><p className="text-muted">You do not have permission to access this page.</p></div>;
  }

  return <>{children}</>;
}
