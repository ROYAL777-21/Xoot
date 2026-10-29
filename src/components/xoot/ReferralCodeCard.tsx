import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Handshake } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

function OwnerCode({ ownerId }: { ownerId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState("loading");
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let current = true;
    setCode(null); setState("loading"); setNotice("");
    void (async () => {
      try {
        const { data, error } = await supabase.from("referrals").select("code").eq("user_id", ownerId).maybeSingle();
        if (!current) return;
        if (error || !data || !/^[A-Z0-9_-]{4,32}$/i.test(data.code)) { setState("unavailable"); return; }
        setCode(data.code); setState("ready");
      } catch { if (current) setState("unavailable"); }
    })();
    return () => { current = false; };
  }, [ownerId, retry]);
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`https://xoot.co.za/app/book?ref=${encodeURIComponent(code)}`);
      setNotice("Link copied");
    } catch { setNotice("Copy is unavailable on this device. You can select and copy your code instead."); }
  };
  return <>
    <h3>Your code</h3>
    {state === "loading" ? <p role="status">Loading your code…</p> : code ? <>
      <code className="xoot-referral-code">{code}</code>
      <button type="button" className="xoot-source-button" onClick={() => { void copy(); }}><Copy size={17} aria-hidden="true" />Copy invite link</button>
      <p>We check eligibility with the booking quote. Rewards follow a qualifying completed, paid visit.</p>
    </> : <><p role="status">Your referral code could not be loaded.</p><button type="button" className="xoot-source-button xoot-source-button-outline" onClick={() => setRetry(value => value + 1)}>Try again</button></>}
    {notice && <p role="status">{notice}</p>}
  </>;
}

/** A server-issued code is display/share data only. Eligibility stays on the server. */
export function ReferralCodeCard() {
  const { user, loading } = useAuth();
  return <aside className="xoot-card xoot-referral-card" aria-label="Your referral code">
    <span className="xoot-referral-card-icon"><Handshake size={26} aria-hidden="true" /></span>
    {loading ? <p role="status">Loading your account…</p> : user ? <OwnerCode key={user.id} ownerId={user.id} /> : <>
      <h3>Your code is waiting</h3>
      <p>Sign in to find your own code and share a little more time at home.</p>
      <Link className="xoot-source-button" to="/auth">Get your code</Link>
    </>}
  </aside>;
}
