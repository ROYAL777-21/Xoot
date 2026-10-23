import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type Role = "admin" | "user" | "xooter";

export const RequireRole = ({ role, children }: { role: Role; children: ReactNode }) => {
  const { user, loading, session } = useAuth();
  const location = useLocation();
  const [result, setResult] = useState<{ owner: string; role: Role; allowed: boolean; mfaRequired: boolean; session: typeof session } | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    const owner = user.id;
    void (async () => {
      try {
        const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", owner).eq("role", role).maybeSingle();
        if (!active) return;
        const allowed = !error && !!data;
        let mfaRequired = false;
        if (allowed && role === "admin") {
          const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (!active) return;
          mfaRequired = !!assurance.error || assurance.data.currentLevel !== "aal2";
        }
        setResult({ owner, role, allowed, mfaRequired, session });
      } catch {
        if (active) setResult({ owner, role, allowed: false, mfaRequired: false, session });
      }
    })();
    return () => { active = false; };
  }, [loading, user, role, session]);

  if (!loading && !user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (loading || !user || result?.owner !== user.id || result.role !== role || result.session !== session) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!result.allowed) {
    if (role === "xooter") return <Navigate to="/xooter/apply" replace />;
    return <Navigate to="/app" replace />;
  }
  if (result.mfaRequired) return <Navigate to="/auth?reauth=admin-mfa" state={{ from: location }} replace />;
  return <>{children}</>;
};
