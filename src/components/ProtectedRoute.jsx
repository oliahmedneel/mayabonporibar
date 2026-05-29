import { Navigate, Outlet, useLocation } from "react-router-dom";
import { USER_ROLES, useAuth } from "../context/AuthContext";

const ROLE_LEVELS = Object.freeze({
  [USER_ROLES.VISITOR]: 0,
  [USER_ROLES.GENERAL_MEMBER]: 1,
  [USER_ROLES.EXECUTIVE]: 2,
  [USER_ROLES.ADMIN]: 3,
});

function roleCanAccess(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(userRole);
}

function roleMeetsMinimum(userRole, minimumRole) {
  if (!minimumRole) {
    return true;
  }

  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[minimumRole];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  minimumRole,
  requireActiveMember = true,
  redirectTo = "/login",
}) {
  const location = useLocation();
  const { loading, isAuthenticated, isActiveMember, role } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-md border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          Loading...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (requireActiveMember && !isActiveMember) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (!roleCanAccess(role, allowedRoles) || !roleMeetsMinimum(role, minimumRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children || <Outlet />;
}

export function MemberRoute({ children }) {
  return (
    <ProtectedRoute
      allowedRoles={[
        USER_ROLES.GENERAL_MEMBER,
        USER_ROLES.EXECUTIVE,
        USER_ROLES.ADMIN,
      ]}
    >
      {children}
    </ProtectedRoute>
  );
}

export function CommitteeRoute({ children }) {
  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.EXECUTIVE, USER_ROLES.ADMIN]}>
      {children}
    </ProtectedRoute>
  );
}
