import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkRateLimit } from "@/lib/rate-limit";

type Factor = { id: string; friendly_name?: string; status: string };

export function AdminMfaVerification({ redirectTo }: { redirectTo: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const active = useRef(true);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [factor, setFactor] = useState<Factor | null>(null);
  const [incomplete, setIncomplete] = useState<Factor[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [issue, setIssue] = useState("");
  const owner = user?.id;
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const isCurrent = useCallback(() => active.current && currentOwner.current === owner, [owner]);

  useEffect(() => {
    active.current = true;
    setLoading(true); setFactor(null); setIncomplete([]); setQr(null); setCode(""); setIssue("");
    let current = true;
    void (async () => {
      try {
        const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assurance.error) throw assurance.error;
        if (!current || !isCurrent()) return;
        if (assurance.data.currentLevel === "aal2") { navigate(redirectTo, { replace: true }); return; }
        const factors = await supabase.auth.mfa.listFactors();
        if (factors.error) throw factors.error;
        if (!current || !isCurrent()) return;
        setFactor(factors.data.totp.find(item => item.status === "verified") ?? null);
        setIncomplete(factors.data.all.filter(item => item.factor_type === "totp" && item.status === "unverified"));
      } catch {
        if (current) setIssue("We could not check two-step verification. Refresh this page to try again.");
      } finally { if (current) setLoading(false); }
    })();
    return () => { current = false; active.current = false; };
  }, [navigate, owner, redirectTo, isCurrent]);

  const enroll = async () => {
    if (working || !owner || !isCurrent()) return;
    setWorking(true); setIssue("");
    try {
      // Only unfinished factors can be replaced. Verified authenticators stay intact.
      for (const old of incomplete) {
        if (!isCurrent()) return;
        const removed = await supabase.auth.mfa.unenroll({ factorId: old.id });
        if (removed.error) throw removed.error;
      }
      if (!isCurrent()) return;
      const response = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Xoot authenticator" });
      if (response.error) throw response.error;
      if (!isCurrent()) return;
      setFactor({ id: response.data.id, status: "unverified" });
      setIncomplete([]);
      setQr(response.data.totp.qr_code);
    } catch {
      if (isCurrent()) setIssue("We could not start two-step verification. Please try again.");
    } finally { if (isCurrent()) setWorking(false); }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (working || !factor || !owner || !isCurrent() || !/^\d{6}$/.test(code)) return;
    if (!checkRateLimit("admin-mfa", 5, 60_000)) { setIssue("Please wait a minute before trying another code."); return; }
    setWorking(true); setIssue("");
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challenge.error) throw challenge.error;
      if (!isCurrent()) return;
      const verified = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.data.id, code });
      if (verified.error) throw verified.error;
      if (!isCurrent()) return;
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error || assurance.data.currentLevel !== "aal2") throw new Error("Verification incomplete");
      if (!isCurrent()) return;
      const currentUser = await supabase.auth.getUser();
      if (currentUser.error || currentUser.data.user?.id !== owner) throw new Error("Account changed");
      if (isCurrent()) { setQr(null); setCode(""); navigate(redirectTo, { replace: true }); }
    } catch {
      if (isCurrent()) { setCode(""); setIssue("We could not verify that code. Use the latest code from your authenticator app."); }
    } finally { if (isCurrent()) setWorking(false); }
  };

  return <div className="xoot-auth-form" aria-labelledby="admin-mfa-heading">
    <span className="xoot-auth-kicker">Secure admin access</span>
    <h2 id="admin-mfa-heading">Two-step verification</h2>
    {loading ? <p role="status"><Loader2 className="animate-spin" /> Checking your sign-in…</p> : <>
      {issue && <p className="xoot-auth-error" role="alert">{issue}</p>}
      {!factor && !issue.startsWith("We could not check") && <>
        <p className="xoot-auth-lede">Protect this account with an authenticator app before opening the admin page.</p>
        <Button className="xoot-auth-primary" disabled={working} onClick={() => void enroll()}>{working ? "Preparing…" : incomplete.length ? "Restart unfinished setup" : "Set up two-step verification"}</Button>
      </>}
      {factor && <form className="xoot-auth-form" onSubmit={verify}>
        {qr && <><p className="xoot-auth-lede">Scan this QR code with your authenticator app, then enter its six-digit code. Keep the QR code and your codes private.</p><img className="xoot-auth-mfa-qr" src={qr} alt="Private authenticator setup QR code" /></>}
        {!qr && <p className="xoot-auth-lede">Enter the current code from your authenticator app.</p>}
        <label className="xoot-auth-field"><span>Authenticator code</span><Input name="authenticator-code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="xoot-auth-code" required /></label>
        <Button type="submit" className="xoot-auth-primary" disabled={working || !/^\d{6}$/.test(code)}>{working ? "Verifying…" : "Verify and continue"}</Button>
      </form>}
      <p className="xoot-auth-security"><ShieldCheck /> Verification keeps admin access protected.</p>
    </>}
  </div>;
}
