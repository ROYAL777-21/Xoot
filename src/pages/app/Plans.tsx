import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CalendarClock, Check, Crown, Heart, Home, Loader2, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { formatZAR, formatZARDecimal } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { useXootCred } from "@/hooks/useXootCred";
import { useHouseholdOperatingLayer } from "@/hooks/useHouseholdOperatingLayer";

type Plan = {
  id: string;
  name: string;
  cadence: string;
  monthly_price: number;
};

const carePlusHighlights = [
  "Home Memory for pets, access, parking, fragile areas, allergies and product preferences",
  "Favourite Xooter rebooking when a trusted Xooter is available",
  "Earlier access to high-demand slots and recurring schedules",
  "Priority replacement support when a Xooter becomes unavailable",
  "R30 welcome add-on credit for completed bookings",
  "1.5x XootCred on completed bookings",
  "Smart home reminders and property profiles",
  "Priority support for booking issues, cancellations and service concerns",
];

const valueCards = [
  {
    title: "Memory",
    body: "Your home notes travel with the booking, from pets and parking to room priorities and product preferences.",
    icon: Home,
  },
  {
    title: "Continuity",
    body: "Save a trusted Xooter and rebook from real booking history when availability allows.",
    icon: Heart,
  },
  {
    title: "Priority",
    body: "Earlier slot access, priority support handling and prioritised replacement matching without unsupported guarantees.",
    icon: CalendarClock,
  },
  {
    title: "Loyalty",
    body: "Earn boosted XootCred and use your welcome add-on credit only after completed, verified bookings.",
    icon: WalletCards,
  },
];

const Plans = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const xootCred = useXootCred();
  const household = useHouseholdOperatingLayer();

  const refresh = useCallback(async () => {
    const { data: p } = await supabase.from("subscription_plans").select("*").order("monthly_price").limit(1).maybeSingle();
    setPlan(p as Plan | null);
    if (user) {
      const { data: s } = await supabase.from("user_subscriptions").select("id, plan_id, status").eq("user_id", user.id).in("status", ["active", "pending_payment"]).maybeSingle();
      setActiveId(s?.plan_id ?? null);
      setSubscriptionStatus(s?.status ?? null);
    } else {
      setActiveId(null);
      setSubscriptionStatus(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const subscribe = async () => {
    if (!user || !plan) return;
    haptic("impact");
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("care-plus-membership", {
        body: { action: "request_membership", planId: plan.id },
      });
      if (error) { haptic("warning"); return toast.error(error.message); }
      const result = data as { already_exists?: boolean; subscription_status?: string } | null;
      haptic("success");
      toast.success(result?.already_exists ? "Care+ request is already recorded" : "Care+ request recorded");
      await Promise.all([refresh(), xootCred.refresh(), household.refresh()]);
    } finally {
      setActionLoading(false);
    }
  };

  const cancel = async () => {
    if (!user || !activeId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke("care-plus-membership", {
        body: { action: "cancel_membership", planId: activeId },
      });
      if (error) { haptic("warning"); return toast.error(error.message); }
      setCancelOpen(false);
      haptic("success");
      toast("Care+ cancelled");
      await Promise.all([refresh(), xootCred.refresh(), household.refresh()]);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!plan) return <div className="grid place-items-center py-20 text-muted-foreground">No Care+ plan available.</div>;

  const isActive = activeId === plan.id && subscriptionStatus === "active";
  const isPending = activeId === plan.id && subscriptionStatus === "pending_payment";

  return (
    <div className="container max-w-6xl py-8 lg:py-12">
      <div className="relative mb-10 overflow-hidden rounded-[2.5rem] bg-[#faf4e8] p-8 shadow-warm dark:bg-card md:p-14">
        <div className="relative grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary">
              <Crown className="h-3.5 w-3.5" />
              <span className="text-xs font-bold uppercase tracking-wider">Care+ membership</span>
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight md:text-6xl">Care+ keeps your home ready.</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Save your home preferences, rebook your favourite Xooter, earn boosted XootCred, and get priority support when your home-care plans need attention.</p>
          </div>
          <Card className="rounded-3xl border-border/70 bg-card/95 p-6 shadow-card">
            <p className="text-sm font-semibold text-sage-deep">Xoot Care+</p>
            <div className="mt-2"><span className="font-display text-6xl font-bold">{formatZAR(plan.monthly_price)}</span><span className="text-muted-foreground">/month</span></div>
            <p className="mt-3 text-sm text-muted-foreground">A household reliability, memory, priority and loyalty layer.</p>
            {isActive ? (
              <Button onClick={() => { haptic("selection"); setCancelOpen(true); }} variant="outline" className="mt-6 h-12 w-full rounded-2xl" disabled={actionLoading}>Cancel Care+</Button>
            ) : isPending ? (
              <Button disabled className="mt-6 h-12 w-full rounded-2xl">Pending payment confirmation</Button>
            ) : (
              <Button onClick={subscribe} className="mt-6 h-12 w-full rounded-2xl font-semibold" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
                Join Care+ for R99/month
              </Button>
            )}
          </Card>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        {valueCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="rounded-3xl p-5 shadow-card">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
              <h2 className="font-display text-2xl font-bold">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Card className="rounded-3xl p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h2 className="font-display text-2xl font-bold">What Care+ includes</h2></div>
          <ul className="space-y-3">
            {carePlusHighlights.map((perk) => <li key={perk} className="flex items-start gap-3 text-sm"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sage/15"><Check className="h-3 w-3 text-sage-deep" /></span>{perk}</li>)}
          </ul>
        </Card>

        <Card className="rounded-3xl border-accent/30 bg-linear-to-br from-accent-soft via-card to-card p-6">
          <div className="mb-5 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-sage-deep" /><h2 className="font-display text-2xl font-bold">Home Memory</h2></div>
          {household.homeMemory ? (
            <div className="space-y-3 text-sm">
              <MemoryRow label="Pets" value={household.homeMemory.petNotes} />
              <MemoryRow label="Preferences" value={household.homeMemory.cleaningPreferences} />
              <MemoryRow label="Fragile areas" value={household.homeMemory.fragileAreas} />
              <MemoryRow label="Products" value={household.homeMemory.favouriteProducts} />
              <MemoryRow label="Parking" value={household.homeMemory.parkingInstructions} />
            </div>
          ) : (
            <div className="rounded-2xl bg-background/75 p-4 text-sm text-muted-foreground">
              Save a household profile to unlock Home Memory details for pets, access, fragile areas and product preferences.
            </div>
          )}
          {household.readyModes.length > 0 && (
            <div className="mt-4 grid gap-2">
              {household.readyModes.slice(0, 3).map((mode) => (
                <div key={mode.id} className="flex items-center justify-between gap-3 rounded-2xl bg-background/75 p-3 text-sm">
                  <span className="font-semibold">{mode.title}</span>
                  <span className="text-xs font-bold text-sage-deep">{mode.readinessScore}% ready</span>
                </div>
              ))}
            </div>
          )}
          {user && (
            <p className="mt-4 text-sm font-semibold text-sage-deep">
              Current XootCred balance: {xootCred.loading ? "Loading..." : xootCred.error ? "Unavailable" : formatZARDecimal(xootCred.availableBalance)}
            </p>
          )}
          <p className="mt-5 text-xs text-muted-foreground">Sensitive access notes stay inside the authenticated app and should not be exposed in push notifications, SMS or email.</p>
        </Card>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl"><Crown className="h-5 w-5 text-primary" /> Cancel Care+?</DialogTitle>
            <DialogDescription>You will lose Care+ priority handling, boosted XootCred, any remaining add-on credit and saved membership prompts. Your saved home profile remains available.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { haptic("selection"); setCancelOpen(false); }} className="rounded-full">Keep Care+</Button>
            <Button variant="destructive" onClick={cancel} className="rounded-full" disabled={actionLoading}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancel membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MemoryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-background/75 p-3">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 font-medium">{value}</p>
  </div>
);

export default Plans;
