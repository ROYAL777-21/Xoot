import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Gift, Handshake, Loader2, Sparkles, WalletCards } from "lucide-react";
import { formatZARDecimal } from "@/lib/format";
import { useXootCred } from "@/hooks/useXootCred";
import { ReferralCodeCard } from "@/components/xoot/ReferralCodeCard";
import { HandoffFlowerField } from "@/components/xoot/HeroArtwork";
import { CarePlusMark } from "@/components/care-plus/CarePlusMark";
import "@/styles/gift-care-handoff.css";
import "@/styles/referrals-reviews-handoff.css";
import "@/styles/rewards-handoff.css";

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value)) : "No expiry";

const reasonLabel = (reason: string) =>
  reason
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const LoadingRewards = () => <div className="grid place-items-center py-20" role="status" aria-label="Loading your rewards"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

const LoyaltyAccount = ({ accountId }: { accountId: string }) => {
  const xootCred = useXootCred();
  const [loyalty, setLoyalty] = useState<{ points: number; free_credits: number; total_bookings: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setLoyalty(null);
    setError(null);
    try {
      const { data, error: readError } = await supabase.from("loyalty_points")
        .select("points,free_credits,total_bookings").eq("user_id", accountId).maybeSingle();
      if (readError) throw readError;
      if (requestRef.current === request) setLoyalty(data);
    } catch {
      if (requestRef.current === request) setError("Your rewards could not be refreshed. Try again shortly.");
    } finally {
      if (requestRef.current === request) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    const requests = requestRef;
    void refresh();
    return () => { ++requests.current; };
  }, [refresh]);

  if (loading || xootCred.loading) return <LoadingRewards />;
  if (error) return <div className="container max-w-5xl py-8"><Card className="rounded-3xl p-6">
    <p role="alert">{error}</p><Button className="mt-4" onClick={() => void refresh()}>Retry rewards</Button>
  </Card></div>;

  const total = loyalty?.total_bookings ?? 0;
  return (
    <div className="container max-w-5xl py-8 lg:py-12 xoot-rewards-page">
      <header className="xoot-rewards-heading"><span className="xoot-label">Looked after</span>
        <h1>Rewards</h1><p>Your points, credits and a little more time at home.</p>
      </header>
      <section className="xoot-rewards-bloom-card" aria-label="Your rewards history">
        <HandoffFlowerField className="xoot-rewards-bloom" items={[{size:72,palette:"mist",left:"0",top:"0",opacity:1}]}/>
        <h2>{total} booking{total===1?"":"s"} recorded</h2>
        <p>A little thank-you, at your own pace. Your available rewards are below.</p>
      </section>
      <div className="xoot-rewards-stats">
        <Card className="xoot-rewards-stat"><Sparkles size={22} aria-hidden="true"/><strong>{loyalty?.points ?? 0}</strong><span>Points balance</span></Card>
        <Card className="xoot-rewards-stat"><WalletCards size={22} aria-hidden="true"/><strong>{xootCred.error ? "Unavailable" : formatZARDecimal(xootCred.availableBalance)}</strong><span>Available XootCred</span></Card>
        <Card className="xoot-rewards-stat"><WalletCards size={22} aria-hidden="true"/><strong>{xootCred.error ? "Unavailable" : formatZARDecimal(xootCred.pendingBalance)}</strong><span>Pending XootCred</span></Card>
      </div>
      <section className="xoot-rewards-actions" aria-label="Make the most of Xoot">
        <h2>Make the most of Xoot</h2>
        <Link to="/app/book"><CalendarCheck size={22} aria-hidden="true"/><span><strong>Plan your next visit</strong><small>Choose a time that works for you.</small></span></Link>
        <a href="#refer"><Handshake size={22} aria-hidden="true"/><span><strong>Refer a neighbour</strong><small>Your own invite link, ready to share.</small></span></a>
        <Link to="/app/plans"><CarePlusMark/><span><strong>Explore Care+</strong><small>See the membership and its benefits.</small></span></Link>
      </section>
      <Card className="xoot-rewards-credit-card">
        <Gift size={24} aria-hidden="true"/><h2>Available free cleans</h2><strong>{loyalty?.free_credits ?? 0}</strong>
        <Button disabled aria-describedby="free-clean-availability" variant="secondary" className="rounded-full">
          <Sparkles className="mr-1 h-4 w-4" /> Redeem a free clean
        </Button>
        <p id="free-clean-availability" className="mt-3 text-sm">Free-clean redemption is not available yet.</p>
      </Card>

      <Card className="rounded-3xl p-6 shadow-card">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">XootCred transaction history</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your earned credits and how you've used them.</p>
          </div>
          <WalletCards className="h-6 w-6 text-primary" />
        </div>

        {xootCred.error ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
            {xootCred.error}
            <Button className="mt-3 block" variant="outline" onClick={() => void xootCred.refresh()}>Retry XootCred</Button>
          </div>
        ) : xootCred.entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No XootCred ledger entries yet. Completed bookings and eligible credits will appear here.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {xootCred.entries.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{reasonLabel(entry.reason)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(entry.createdAt)}{entry.expiresAt ? ` - expires ${formatDate(entry.expiresAt)}` : ""}
                  </p>
                  {entry.isPending && <p className="mt-1 text-xs font-semibold text-primary">Pending completion</p>}
                  {entry.isExpired && <p className="mt-1 text-xs font-semibold text-muted-foreground">Expired or cancelled</p>}
                </div>
                <p className={`font-display text-2xl font-bold ${entry.amount >= 0 ? "text-sage-deep" : "text-destructive"}`}>
                  {entry.amount >= 0 ? "+" : "-"}{formatZARDecimal(entry.displayAmount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const Loyalty = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingRewards />;
  if (!user) return <div className="container py-8">Sign in to see your rewards</div>;
  return <><LoyaltyAccount key={user.id} accountId={user.id} /><section id="refer" className="container max-w-3xl pb-8" aria-label="Refer and earn"><ReferralCodeCard /></section></>;
};

export default Loyalty;
