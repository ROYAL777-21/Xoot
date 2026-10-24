import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { getSafeRedirectPath } from "@/lib/auth-security";
import { enableNativeQuickUnlock } from "@/lib/native-auth";
import { importOptionalNativePlugin, isOptionalNativePlatform } from "@/lib/optional-capacitor";
import { sanitiseSearchParam } from "@/lib/sanitise";

type NativeListenerHandle = { remove: () => Promise<void> | void };
type CapacitorAppUrlOpen = { url?: string };
type CapacitorAppModule = {
  App?: {
    getLaunchUrl: () => Promise<{ url?: string } | null>;
    addListener: (event: "appUrlOpen", callback: (event: CapacitorAppUrlOpen) => void) => Promise<NativeListenerHandle>;
  };
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const nextPath = useMemo(() => getSafeRedirectPath(searchParams.get("next")), [searchParams]);

  useEffect(() => {
    let cancelled = false;
    let completed = false;
    let appUrlOpenHandle: NativeListenerHandle | null = null;

    const getCallbackParams = (rawUrl?: string) => {
      if (!rawUrl) return searchParams;
      try {
        return new URL(rawUrl).searchParams;
      } catch {
        return searchParams;
      }
    };

    const completeAuth = async (rawUrl?: string, nativeCallback = false) => {
      if (completed) return;
      try {
        const callbackParams = getCallbackParams(rawUrl);
        if (callbackParams.has("error") || callbackParams.has("error_code")) throw new Error("Authentication callback failed");
        const code = sanitiseSearchParam(callbackParams.get("code"));
        const redirectPath = getSafeRedirectPath(callbackParams.get("next"), nextPath);
        const isNativePendingCallback = isOptionalNativePlatform() && !code;
        // getSession waits for the client's URL detection. A successful automatic
        // PKCE exchange removes code from the actual URL; do not consume it twice.
        const initial = await supabase.auth.getSession();
        if (cancelled) return;
        if (initial.error) throw initial.error;
        let session = initial.data.session;
        const remainingCode = new URL(window.location.href).searchParams.get("code");
        if (code && (nativeCallback || remainingCode === code)) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          const refreshed = await supabase.auth.getSession();
          if (refreshed.error) throw refreshed.error;
          session = refreshed.data.session;
        }

        if (!session && isNativePendingCallback) return;
        if (!session) throw new Error("Missing auth session");

        completed = true;
        await enableNativeQuickUnlock();
        if (!cancelled) navigate(redirectPath, { replace: true });
      } catch {
        if (!cancelled) {
          if (window.location.pathname === "/auth/callback") window.history.replaceState(window.history.state, "", "/auth/callback");
          setStatus("error");
        }
      }
    };

    const registerNativeCallback = async () => {
      if (!isOptionalNativePlatform()) return;

      try {
        const CapacitorApp = (await importOptionalNativePlugin<CapacitorAppModule>("@capacitor/app"))?.App ?? null;
        if (!CapacitorApp) return;
        const launch = await CapacitorApp.getLaunchUrl();
        if (launch?.url) void completeAuth(launch.url, true);
        appUrlOpenHandle = await CapacitorApp.addListener("appUrlOpen", (event: CapacitorAppUrlOpen) => {
          if (event?.url) void completeAuth(event.url, true);
        });
      } catch {
        // Browser builds and test environments do not expose Capacitor App listeners.
      }
    };

    void completeAuth(window.location.href);
    void registerNativeCallback();

    return () => {
      cancelled = true;
      void appUrlOpenHandle?.remove();
    };
  }, [navigate, nextPath, searchParams]);

  return (
    <div className="min-h-screen gradient-hero grid place-items-center p-6">
      <SEO
        title="Finishing Xoot sign-in"
        description="Xoot is completing a secure authentication callback."
        canonical="/auth/callback"
        noIndex
      />
      <Card className="w-full max-w-md rounded-3xl border-border p-8 text-center shadow-warm">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
          {status === "loading" ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
        </div>
        <h1 className="font-display text-3xl font-bold">
          {status === "loading" ? "Finishing secure sign-in" : "Sign-in needs attention"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {status === "loading"
            ? "We are confirming your Xoot session and returning you to the right place."
            : "The sign-in link could not be completed. Start again from the secure sign-in page."}
        </p>
        {status === "error" && (
          <Button asChild className="mt-6 rounded-full">
            <Link to="/auth?mode=signin">Back to sign-in</Link>
          </Button>
        )}
      </Card>
    </div>
  );
};

export default AuthCallback;
