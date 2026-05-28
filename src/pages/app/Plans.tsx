import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CalendarClock, Check, Crown, Heart, Home, Loader2, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";
import { buildPendingPaymentRecord, routeNotificationChannel } from "@/lib/operations";
import { haptic } from "@/lib/haptics";
import { mockFavouriteZooter, mockHomeMemoryProfile, mockZootCredBalance } from "@/data/care-plus";

type Plan = {
  id: string;
  name: string;
  cadence: string;
  monthly_price: number;
};

const carePlusHighlights = [
  "Home Memory for pets, access, parking, fragile areas, allergies and product preferences",
  `Favourite Zooter rebooking with Book ${mockFavouriteZooter.name} again`,
  "Earlier access to high-demand slots and recurring schedules",
  "Priority replacement support when a Zooter becomes unavailable",
  "R30 monthly add-on credit for completed bookings",
  "1.5x ZootCred on completed bookings",
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
    body: `Save a trusted Zooter and rebook with a personal action like Book ${mockFavouriteZooter.name} again.`,
    icon: Heart,
  },
  {
    title: "Priority",
    body: "Earlier slot access, priority support handling and prioritised replacement matching without unsupported guarantees.",
    icon: CalendarClock,
  },
  {
    title: "Loyalty",
    body: `Earn ${mockZootCredBalance.multiplier}x ZootCred and use a R${mockZootCredBalance.monthlyAddOnCreditZar} monthly add-on credit with completed bookings.`,
    icon: WalletCards,
  },
];

const Plans = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);

  const refresh = async () => {
    const { data: p } = await supabase.from("subscription_plans").select("*").order("monthly_price").limit(1).maybeSingle();
    setPlan(p as Plan | null);
    if (user) {
      const { data: s } = await (supabase as any).from("user_subscriptions").select("id, plan_id, status").eq("user_id", user.id).in("status", ["active", "pending_payment"]).maybeSingle();
      setActiveId(s?.plan_id ?? null);
      setSubscriptionStatus(s?.status ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  const subscribe = async () => {
    if (!user || !plan) return;
    haptic("impact");
    const { data: payment, error: paymentError } = await (supabase as any).from("payment_records").insert({
      ...buildPendingPaymentRecord({ userId: user.id, amount: Number(plan.monthly_price), kind: "homecare_membership" }),
      meta: { plan_id: plan.id, membership_name: "Care+" },
    }).select("id").single();
    if (paymentError) { haptic("warning"); return toast.error(paymentError.message); }

    const { error } = await (supabase as any).from("user_subscriptions").insert({ user_id: user.id, plan_id: plan.id, status: "pending_payment" });
    if (error) { haptic("warning"); return toast.error(error.message); }
    await (supabase as any).from("admin_review_queue").insert({
      queue_type: "payment",
      subject_table: "payment_records",
      subject_id: payment?.id,
      user_id: user.id,
      priority: "normal",
      summary: "Care+ membership payment pending confirmation",
    });
    await (supabase as any).from("integration_outbox").insert([
      ...routeNotificationChannel("homecare_summary").map((channel) => ({
        source_table: "user_subscriptions",
        source_id: payment?.id,
        event_type: "care_plus_membership_requested",
        channel,
        owner: channel === "brevo_email" ? "Retention & Loyalty Agent" : "Customer Support Agent",
        stack_tool: channel === "brevo_email" ? "Brevo email queue" : "Zoot in-app notification",
        payload: { plan_id: plan.id, payment_record_id: payment?.id },
        created_by: user.id,
      })),
      {
        source_table: "payment_records",
        source_id: payment?.id,
        event_type: "care_plus_payment_authorisation_requested",
        channel: "payment_provider",
        owner: "Finance Operations",
        stack_tool: "Payment provider queue",
        payload: { payment_record_id: payment?.id, amount: Number(plan.monthly_price), currency: "ZAR" },
        status: "needs_approval",
        approval_required: true,
        failure_mode: "Keep membership pending until provider callback or admin confirmation exists.",
        created_by: user.id,
      },
    ]);
    await supabase.from("notifications").insert({
      user_id: user.id,
      kind: "homecare_plus_active",
      title: "Care+ request received",
      body: "Your membership is pending payment confirmation. Home Memory, priority support and ZootCred boost activate after confirmation.",
      link: "/app",
    });
    haptic("success");
    toast.success("Care+ request recorded");
    refresh();
  };

  const cancel = async () => {
    if (!user || !activeId) return;
    const { data: sub } = await supabase.from("user_subscriptions").select("id").eq("user_id", user.id).eq("plan_id", activeId).eq("status", "active").maybeSingle();
    if (!sub) return;
    const { error } = await supabase.from("user_subscriptions").update({ status: "cancelled" }).eq("id", sub.id);
    if (error) { haptic("warning"); return toast.error(error.message); }
    await supabase.from("notifications").insert({ user_id: user.id, kind: "homecare_plus_cancelled", title: "Care+ cancelled", body: "Your membership has ended. Your saved home profile remains available." });
    setCancelOpen(false);
    haptic("success");
    toast("Care+ cancelled");
    refresh();
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
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Save your home preferences, rebook your favourite Zooter, earn boosted ZootCred, and get priority support when your home-care plans need attention.</p>
          </div>
          <Card className="rounded-3xl border-border/70 bg-card/95 p-6 shadow-card">
            <p className="text-sm font-semibold text-sage-deep">Zoot Care+</p>
            <div className="mt-2"><span className="font-display text-6xl font-bold">{formatZAR(plan.monthly_price)}</span><span className="text-muted-foreground">/month</span></div>
            <p className="mt-3 text-sm text-muted-foreground">A household reliability, memory, priority and loyalty layer.</p>
            {isActive ? (
              <Button onClick={() => { haptic("selection"); setCancelOpen(true); }} variant="outline" className="mt-6 h-12 w-full rounded-2xl">Cancel Care+</Button>
            ) : isPending ? (
              <Button disabled className="mt-6 h-12 w-full rounded-2xl">Pending payment confirmation</Button>
            ) : (
              <Button onClick={subscribe} className="mt-6 h-12 w-full rounded-2xl gradient-warm font-semibold shadow-warm"><Crown className="mr-2 h-4 w-4" /> Join Care+ for R99/month</Button>
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

        <Card className="rounded-3xl border-accent/30 bg-gradient-to-br from-accent-soft via-card to-card p-6">
          <div className="mb-5 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-sage-deep" /><h2 className="font-display text-2xl font-bold">Home Memory preview</h2></div>
          <div className="space-y-3 text-sm">
            <MemoryRow label="Pets" value={mockHomeMemoryProfile.petNotes.join(", ")} />
            <MemoryRow label="Room priorities" value={mockHomeMemoryProfile.roomPriorities.join(", ")} />
            <MemoryRow label="Fragile areas" value={mockHomeMemoryProfile.fragileAreas.join(", ")} />
            <MemoryRow label="Add-ons" value={mockHomeMemoryProfile.favouriteAddOns.join(", ")} />
          </div>
          <p className="mt-5 text-xs text-muted-foreground">Sensitive access notes stay inside the authenticated app and should not be exposed in push notifications, SMS or email.</p>
        </Card>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl"><Crown className="h-5 w-5 text-primary" /> Cancel Care+?</DialogTitle>
            <DialogDescription>You will lose Care+ priority handling, boosted ZootCred, monthly add-on credit and saved membership prompts. Your saved home profile remains available.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { haptic("selection"); setCancelOpen(false); }} className="rounded-full">Keep Care+</Button>
            <Button variant="destructive" onClick={cancel} className="rounded-full">Cancel membership</Button>
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
