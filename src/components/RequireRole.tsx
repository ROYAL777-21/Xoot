import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type Role = "admin" | "user" | "zooter";

export const RequireRole = ({ role, children }: { role: Role; children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasRole, setHasRole] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) {
      setHasRole(null);
      return;
    }
    if (!user) { setHasRole(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", role)
      .maybeSingle()
      .then(({ data }) => setHasRole(!!data));
  }, [loading, user, role]);

  if (loading || hasRole === null) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (!hasRole) {
    if (role === "zooter") return <Navigate to="/zooter/apply" replace />;
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
};
