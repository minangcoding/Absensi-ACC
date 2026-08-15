import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { UserRole } from "@/types/database";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Memuat...
      </div>
    );
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (!profile.status_aktif) {
    return <Navigate to="/login" replace state={{ nonaktif: true }} />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/"} replace />;
  }

  return <Outlet />;
}
