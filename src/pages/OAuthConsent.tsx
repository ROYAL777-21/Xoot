import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Details = {
  authorization_id?: string;
  redirect_url?: string;
  client?: { id?: string; name?: string; uri?: string };
  redirect_uri?: string;
  scope?: string;
};

/**
 * Xoot's own consent screen for Supabase Auth's OAuth 2.1 server.
 * Never auto-approve third-party clients or treat signing in as authorisation.
 */
export default function OAuthConsent() {
  const { user, loading: authLoading } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const authorizationId = new URLSearchParams(loc.search).get("authorization_id");
  const [details,setDetails] = useState<Details|null>(null);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);

  useEffect(()=>{
    if(authLoading) return;
    if(!authorizationId || !/^[A-Za-z0-9_-]{8,256}$/.test(authorizationId)){
      setError("This authorisation request is missing or invalid.");
      setLoading(false);
      return;
    }
    if(!user){
      navigate("/auth",{
        replace:true,
        state:{from:{pathname:"/oauth/consent",search:loc.search}},
      });
      return;
    }
    if(!isSupabaseConfigured){
      setError("Xoot sign-in is not configured for this environment.");
      setLoading(false);
      return;
    }
    let cancelled=false;
    void supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({data,error})=>{
      if(cancelled)return;
      if(error||!data){
        setError("This request is no longer valid. Return to your assistant and reconnect.");
      }else if(!("authorization_id" in data) && "redirect_url" in data && data.redirect_url){
        // Supabase indicates prior consent; it generated the trusted redirect itself.
        window.location.assign(data.redirect_url);
      }else{
        setDetails(data as Details);
      }
      setLoading(false);
    }).catch(()=>{
      if(!cancelled){setError("Could not load the authorisation details.");setLoading(false);}
    });
    return ()=>{cancelled=true;};
  },[authorizationId,authLoading,user,navigate,loc.search]);

  async function decide(approve:boolean){
    if(!authorizationId||busy)return;
    setBusy(true);setError("");
    try{
      const outcome=approve
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId);
      if(outcome.error || !outcome.data?.redirect_url) throw new Error("Consent could not be saved");
      window.location.assign(outcome.data.redirect_url);
    }catch{
      setError("Could not complete authorisation. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-background p-5">
      <SEO title="Connect Xoot to your assistant" description="Review and control AI assistant access to your Xoot account." canonical="/oauth/consent" noIndex />
      <Card className="w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-5">
        <h1 className="font-display text-2xl font-bold">Connect your Xoot account</h1>
        {loading ? <p role="status">Checking this connection…</p> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {details && !loading ? (
          <>
            <p><strong>{details.client?.name ?? "An external assistant"}</strong> is requesting access to your Xoot account.</p>
            <p className="text-sm text-muted-foreground">
              This connection can use your approved Xoot permissions to prepare a cleaning quote
              with a saved address and create a payment-pending booking draft only after you
              confirm the service, time, and total. It cannot view gate codes or charge your card.
              Payments are authorised on Xoot's secure checkout.
            </p>
            <div className="rounded-xl bg-muted p-4 text-sm">
              <p className="font-semibold mb-2">Access request</p>
              <p>App: {details.client?.name ?? "External client"}</p>
              <p>Permissions: {details.scope || "Basic account connection"}</p>
              <p className="break-all">Return to: {details.redirect_uri ?? "Registered application"}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Only approve an app you recognise. You may decline and continue using Xoot normally.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={()=>void decide(true)} disabled={busy}>Approve connection</Button>
              <Button variant="outline" onClick={()=>void decide(false)} disabled={busy}>Deny</Button>
            </div>
          </>
        ) : null}
        <p className="text-xs text-muted-foreground">Xoot · Your home. Handled.</p>
      </Card>
    </main>
  );
}
