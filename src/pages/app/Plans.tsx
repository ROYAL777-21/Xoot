import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Check, Loader2, Sparkles, Crown, Gift, Star, Users, AlertTriangle, ShieldCheck, CalendarClock, HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";

type Plan = {
  id: string;
  name: string;
  cadence: string;
  hours_per_visit: number;
  monthly_price: number;
  savings_pct: number;
  discount_pct: number;
  perks: string[];
  popular: boolean;
};

const homeCareBenefits = [
  "Priority support",
  "Favourite contractors and preferred team booking",
  "Lower service fees on on-demand bookings",
  "Recurring schedule lock",
  "Emergency booking priority",
  "Free cancellation windows",
  "Loyalty rewards and birthday perks",
  "Seasonal home-care tips",
];

const contractorValue = [
  "Guaranteed client flow",
  "Verified badge and public trust signals",
  "Ratings, reliability score, and repeat-client count",
  "Priority algorithm ranking for strong performance",
  "Recurring schedules and performance bonuses",
];

const customerValue = [
  "Booking protection",
  "Support and replacement cover",
  "Reliability guarantees",
  "Easy scheduling and saved home preferences",
  "HomeCare+ benefits and loyalty rewards",
];

const Plans = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [gam, setGam] = useState<{ positive_reviews_count: number; successful_referrals_count: number; free_bookings_earned: number; free_bookings_redeemed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);

  const refresh = async () => {
    const { data: p } = await supabase.from("subscription_plans").select("*").order("monthly_price").limit(1).maybeSingle();
    setPlan(p as Plan | null);
    if (user) {
      const { data: s } = await supabase.from("user_subscriptions").select("id, plan_id").eq("user_id", user.id).eq("status", "active").maybeSingle();
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
      user_id: user.id,
      kind: "homecare_plus_active",
      title: "Welcome to HomeCare+",
      body: "Priority support, favourite contractors, schedule lock, and loyalty rewards are live.",
      link: "/app",
    });
    toast.success("HomeCare+ activated");
    refresh();
  };

  const cancel = async () => {
    if (!user || !activeId) return;
    const { data: sub } = await supabase.from("user_subscriptions").select("id").eq("user_id", user.id).eq("plan_id", activeId).eq("status", "active").maybeSingle();
    if (!sub) return;
    const { error } = await supabase.from("user_subscriptions").update({ status: "cancelled" }).eq("id", sub.id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({ user_id: user.id, kind: "homecare_plus_cancelled", title: "HomeCare+ cancelled", body: "Your membership has ended. Your saved home profile remains available." });
    setCancelOpen(false);
    toast("HomeCare+ cancelled");
    refresh();
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!plan) return <div className="grid place-items-center py-20 text-muted-foreground">No subscription plan available.</div>;

  const isActive = activeId === plan.id;
  const reviewsToFreeClean = Math.max(0, 10 - (gam?.positive_reviews_count ?? 0));
  const referralsToFreeClean = Math.max(0, 5 - (gam?.successful_referrals_count ?? 0));
  const freeCleans = (gam?.free_bookings_earned ?? 0) - (gam?.free_bookings_redeemed ?? 0);

  return (
    <div className="container py-8 lg:py-12 max-w-6xl">
      <div className="relative mb-10 rounded-[2.5rem] overflow-hidden gradient-warm p-10 md:p-16 shadow-warm text-primary-foreground">
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 backdrop-blur px-4 py-1.5 mb-5">
            <Crown className="h-3.5 w-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">HomeCare+ membership</span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight mb-4">Convenience continuity for your home.</h1>
          <p className="text-lg opacity-95 max-w-2xl">HomeCare+ turns Zoot into your saved home-care ecosystem: trusted people, protected bookings, recurring rhythms, and lower-friction support.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6 mb-10">
        <Card className={`relative p-8 rounded-3xl border-2 ${isActive ? "border-sage-deep" : "border-primary"} shadow-warm`}>
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Sparkles className="h-3 w-3" /> Membership ecosystem</span>
          <h2 className="font-display text-3xl font-bold">HomeCare+</h2>
          <p className="text-sm text-muted-foreground capitalize mb-5">{plan.cadence} home-care continuity</p>
          <div className="mb-1"><span className="font-display text-6xl font-bold">{formatZAR(plan.monthly_price)}</span><span className="text-muted-foreground">/month</span></div>
          <p className="text-sm text-sage-deep font-semibold mb-6">{plan.discount_pct}% off every on-demand booking plus priority care</p>
          <ul className="space-y-3 mb-7">
            {homeCareBenefits.map((perk) => <li key={perk} className="flex items-start gap-3 text-sm"><span className="grid place-items-center h-5 w-5 rounded-full bg-sage/15 shrink-0 mt-0.5"><Check className="h-3 w-3 text-sage-deep" /></span>{perk}</li>)}
          </ul>
          {isActive ? <Button onClick={() => setCancelOpen(true)} variant="outline" className="w-full rounded-2xl h-12">Cancel HomeCare+</Button> : <Button onClick={subscribe} className="w-full rounded-2xl h-14 gradient-warm shadow-warm font-semibold text-base"><Crown className="h-4 w-4 mr-2" /> Activate HomeCare+</Button>}
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Leaving means losing protection, easy scheduling, and favourite-contractor continuity.</p>
        </Card>

        <Card className="p-8 rounded-3xl bg-gradient-to-br from-accent-soft via-card to-card border-accent/30">
          <div className="flex items-center gap-2 mb-1"><Gift className="h-5 w-5 text-sage-deep" /><h3 className="font-display text-2xl font-bold">Earn free cleans</h3></div>
          <p className="text-sm text-muted-foreground mb-6">HomeCare+ rewards good habits and referrals.</p>
          <div className="space-y-4">
            <ProgressLine icon={Star} label="10 reviews above 4/5 stars" value={gam?.positive_reviews_count ?? 0} max={10} suffix={`${reviewsToFreeClean} more`} />
            <ProgressLine icon={Users} label="5 successful referrals" value={gam?.successful_referrals_count ?? 0} max={5} suffix={`${referralsToFreeClean} more`} />
          </div>
          <div className="mt-6 rounded-2xl bg-card border border-border p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Free cleans available</p><p className="font-display text-3xl font-bold">{freeCleans}</p></div><Crown className="h-8 w-8 text-primary" /></div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <ValueCard icon={CalendarClock} title="What customers keep on-platform" items={customerValue} />
        <ValueCard icon={HeartHandshake} title="What contractors build on-platform" items={contractorValue} />
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader><DialogTitle className="font-display text-2xl flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /> Cancel HomeCare+?</DialogTitle><DialogDescription>You will lose priority support, favourite-contractor continuity, schedule lock, lower service fees, and loyalty boosts.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setCancelOpen(false)} className="rounded-full">Keep HomeCare+</Button><Button variant="destructive" onClick={cancel} className="rounded-full">Cancel membership</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ProgressLine = ({ icon: Icon, label, value, max, suffix }: any) => (
  <div>
    <div className="flex items-center gap-2 mb-1"><Icon className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">{label}</span></div>
    <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full gradient-warm transition-all duration-500" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
    <p className="text-xs text-muted-foreground mt-1">{value} / {max} - {suffix}</p>
  </div>
);

const ValueCard = ({ icon: Icon, title, items }: any) => (
  <Card className="p-6 rounded-3xl">
    <div className="flex items-center gap-2 mb-4"><Icon className="h-5 w-5 text-primary" /><h3 className="font-display text-xl font-bold">{title}</h3></div>
    <ul className="space-y-2">{items.map((item: string) => <li key={item} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-sage-deep mt-0.5" />{item}</li>)}</ul>
  </Card>
);

export default Plans;
