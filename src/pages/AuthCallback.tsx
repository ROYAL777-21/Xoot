import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSafeRedirectPath } from "@/lib/auth-security";
import { sanitiseSearchParam } from "@/lib/sanitise";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const nextPath = useMemo(() => getSafeRedirectPath(searchParams.get("next")), [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const completeAuth = async () => {
      try {
        const code = sanitiseSearchParam(searchParams.get("code"));
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Missing auth session");

        if (!cancelled) navigate(nextPath, { replace: true });
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    void completeAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate, nextPath, searchParams]);

  return (
    <div className="min-h-screen gradient-hero grid place-items-center p-6">
      <Card className="w-full max-w-md rounded-3xl border-border p-8 text-center shadow-warm">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-sage-deep">
          {status === "loading" ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
        </div>
        <h1 className="font-display text-3xl font-bold">
          {status === "loading" ? "Finishing secure sign-in" : "Sign-in needs attention"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {status === "loading"
            ? "We are confirming your Zoot session and returning you to the right place."
            : "The sign-in link could not be completed. Start again from the secure sign-in page."}
        </p>
        {status === "error" && (
          <Button asChild className="mt-6 rounded-full gradient-warm">
            <Link to="/auth">Back to sign-in</Link>
          </Button>
        )}
      </Card>
    </div>
  );
};

export default AuthCallback;
