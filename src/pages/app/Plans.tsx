import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Check, Loader2, Sparkles, Crown, Gift, Star, Users, Mail, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";

type Plan = {
  id: string; name: string; cadence: string; hours_per_visit: number;
  monthly_price: number; savings_pct: number; discount_pct: number; perks: string[]; popular: boolean;
};

const Plans = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [gam, setGam] = useState<{ positive_reviews_count: number; successful_referrals_count: number; free_bookings_earned: number; free_bookings_redeemed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2 | 3>(0);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    const { data: p } = await supabase.from("subscription_plans").select("*").order("monthly_price").limit(1).maybeSingle();
    setPlan(p as Plan | null);
    if (user) {
      const { data: s } = await supabase.from("user_subscriptions").select("plan_id").eq("user_id", user.id).eq("status", "active").maybeSingle();
      setActiveId(s?.plan_id ?? null);
      const { data: g } = await supabase.from("gamification_progress").select("*").eq("user_id", user.id).maybeSingle();
      if (g) setGam(g);
      else {
        await supabase.from("gamification_progress").insert({ user_id: user.id });
        setGam({ positive_reviews_count: 0, successful_referrals_count: 0, free_bookings_earned: 0, free_bookings_redeemed: 0 });
      }
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  const subscribe = async () => {
    if (!user || !plan) return;
    const { error } = await supabase.from("user_subscriptions").insert({ user_id: user.id, plan_id: plan.id, status: "active" });
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: user.id, kind: "care_plus_active", title: "Welcome to Care+ 💎",
      body: "Your 15% off, priority booking, and free replacement Zooter are live. Let's lock in your first visit.",
      link: "/app",
    });
    toast.success("Care+ activated! Your first visit is being scheduled.");
    refresh();
  };

  const startCancellation = async () => {
    if (!user || !activeId) return;
    setSubmitting(true);
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("subscription_cancellation_requests").insert({
      user_id: user.id, subscription_id: activeId, reason, token,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: user.id, kind: "care_plus_cancel_request",
      title: "Confirm your Care+ cancellation",
      body: "Open this notification and confirm to finalise. We've also emailed you the link — it expires in 24 hours.",
      link: `/app/plans?confirm=${token}`,
    });
    toast.success("Confirmation email sent. Open it to finalise the cancellation.");
    setCancelStep(3);
  };

  // Handle confirmation if URL contains ?confirm=token
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("confirm");
    if (!token || !user) return;
    (async () => {
      const { data: req } = await supabase.from("subscription_cancellation_requests")
        .select("*").eq("token", token).eq("user_id", user.id).maybeSingle();
      if (!req || req.confirmed || new Date(req.expires_at) < new Date()) {
        toast.error("This cancellation link is invalid or expired.");
        return;
      }
      await supabase.from("subscription_cancellation_requests").update({ confirmed: true, confirmed_at: new Date().toISOString() }).eq("id", req.id);
      await supabase.from("user_subscriptions").update({ status: "cancelled" }).eq("id", req.subscription_id);
      await supabase.from("notifications").insert({
        user_id: user.id, kind: "care_plus_cancelled",
        title: "Care+ cancelled", body: "Your Care+ membership has ended. You can re-subscribe anytime.",
      });
      toast("Care+ cancelled. We'll miss you.");
      url.searchParams.delete("confirm");
      window.history.replaceState({}, "", url.toString());
      refresh();
    })();
    // eslint-disable-next-line
  }, [user]);

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!plan) return <div className="grid place-items-center py-20 text-muted-foreground">No subscription plan available.</div>;

  const isActive = activeId === plan.id;
  const reviewsToFreeClean = Math.max(0, 10 - (gam?.positive_reviews_count ?? 0));
  const referralsToFreeClean = Math.max(0, 5 - (gam?.successful_referrals_count ?? 0));

  return (
    <div className="container py-8 lg:py-12 max-w-5xl">
      {/* Premium hero */}
      <div className="relative mb-12 rounded-[2.5rem] overflow-hidden gradient-warm p-10 md:p-16 shadow-warm text-primary-foreground">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary-glow/30 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 backdrop-blur px-4 py-1.5 mb-5">
            <Crown className="h-3.5 w-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Care+ membership</span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight mb-4">Reliable home help, every time.</h1>
          <p className="text-lg opacity-95 max-w-xl">Same trusted Zooter every visit. 15% off every booking. Free replacements when life happens. Cancel only via emailed confirmation — your money is protected.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 mb-12">
        {/* Plan card */}
        <Card className={`relative p-8 rounded-3xl border-2 ${isActive ? "border-sage-deep" : "border-primary"} shadow-warm`}>
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Most popular
          </span>
          <h2 className="font-display text-3xl font-bold">{plan.name}</h2>
          <p className="text-sm text-muted-foreground capitalize mb-5">{plan.cadence} · cancel anytime via email</p>
          <div className="mb-1">
            <span className="font-display text-6xl font-bold">{formatZAR(plan.monthly_price)}</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <p className="text-sm text-sage-deep font-semibold mb-6">{plan.discount_pct}% off every on-demand booking</p>
          <ul className="space-y-3 mb-7">
            {plan.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm">
                <span className="grid place-items-center h-5 w-5 rounded-full bg-sage/15 shrink-0 mt-0.5"><Check className="h-3 w-3 text-sage-deep" /></span>
                {perk}
              </li>
            ))}
          </ul>
          {isActive ? (
            <Button onClick={() => setCancelStep(1)} variant="outline" className="w-full rounded-2xl h-12">Cancel subscription</Button>
          ) : (
            <Button onClick={subscribe} className="w-full rounded-2xl h-14 gradient-warm shadow-warm font-semibold text-base">
              <Crown className="h-4 w-4 mr-2" /> Activate Care+
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> No lock-in. Cancellation requires email confirmation (anti-fraud).</p>
        </Card>

        {/* Gamification */}
        <Card className="p-8 rounded-3xl bg-gradient-to-br from-accent-soft via-card to-card border-accent/30">
          <div className="flex items-center gap-2 mb-1"><Gift className="h-5 w-5 text-sage-deep" /><h3 className="font-display text-2xl font-bold">Earn free cleans</h3></div>
          <p className="text-sm text-muted-foreground mb-6">Care+ rewards loyalty. Earn a 100% free clean by:</p>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1"><Star className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">10 reviews above 4/5 stars</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full gradient-warm transition-all duration-500" style={{ width: `${Math.min(100, ((gam?.positive_reviews_count ?? 0) / 10) * 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{gam?.positive_reviews_count ?? 0} / 10 — {reviewsToFreeClean} more</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">5 successful referrals</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full gradient-sage transition-all duration-500" style={{ width: `${Math.min(100, ((gam?.successful_referrals_count ?? 0) / 5) * 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{gam?.successful_referrals_count ?? 0} / 5 — {referralsToFreeClean} more</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-card border border-border p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">Free cleans available</p><p className="font-display text-3xl font-bold">{(gam?.free_bookings_earned ?? 0) - (gam?.free_bookings_redeemed ?? 0)}</p></div>
            <Crown className="h-8 w-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Friction-cancel modal */}
      <Dialog open={cancelStep > 0} onOpenChange={(o) => !o && setCancelStep(0)}>
        <DialogContent className="rounded-3xl max-w-md">
          {cancelStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /> Are you sure?</DialogTitle>
                <DialogDescription>You'll lose all of this if you cancel:</DialogDescription>
              </DialogHeader>
              <ul className="space-y-2 text-sm">
                {plan.perks.map((p) => (<li key={p} className="flex items-start gap-2"><span className="text-destructive">✕</span> {p}</li>))}
              </ul>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setCancelStep(0)} className="rounded-full">Keep my Care+</Button>
                <Button variant="ghost" onClick={() => setCancelStep(2)} className="text-destructive hover:text-destructive hover:bg-destructive/10">Continue cancelling</Button>
              </DialogFooter>
            </>
          )}
          {cancelStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Help us improve</DialogTitle>
                <DialogDescription>Tell us why you're cancelling, and type "CANCEL" to continue.</DialogDescription>
              </DialogHeader>
              <Label className="text-xs">Reason (optional)</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What could we have done better?" />
              <Label className="text-xs mt-3">Type CANCEL to confirm</Label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="CANCEL" />
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setCancelStep(1)} className="rounded-full">Back</Button>
                <Button onClick={startCancellation} disabled={confirmText !== "CANCEL" || submitting} variant="destructive" className="rounded-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4 mr-1" /> Send email confirmation</>}
                </Button>
              </DialogFooter>
            </>
          )}
          {cancelStep === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Check your email</DialogTitle>
                <DialogDescription>We've sent a confirmation link (and an in-app notification). Open it within 24 hours to finalise. Until then, your Care+ stays active.</DialogDescription>
              </DialogHeader>
              <DialogFooter><Button onClick={() => setCancelStep(0)} className="rounded-full">Got it</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Plans;
