import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Repeat, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string; name: string; cadence: string; hours_per_visit: number;
  monthly_price: number; savings_pct: number; perks: string[]; popular: boolean;
};

const Plans = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data: p } = await supabase.from("subscription_plans").select("*").order("monthly_price");
    setPlans((p ?? []) as Plan[]);
    if (user) {
      const { data: s } = await supabase.from("user_subscriptions").select("plan_id").eq("user_id", user.id).eq("status", "active").maybeSingle();
      setActiveId(s?.plan_id ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  const subscribe = async (planId: string) => {
    if (!user) return;
    if (activeId) {
      await supabase.from("user_subscriptions").update({ status: "cancelled" }).eq("user_id", user.id).eq("status", "active");
    }
    const { error } = await supabase.from("user_subscriptions").insert({ user_id: user.id, plan_id: planId, status: "active" });
    if (error) return toast.error(error.message);
    toast.success("Subscribed! Your first visit is being scheduled.");
    refresh();
  };

  const cancel = async () => {
    if (!user) return;
    await supabase.from("user_subscriptions").update({ status: "cancelled" }).eq("user_id", user.id).eq("status", "active");
    toast("Subscription cancelled");
    refresh();
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container py-8 lg:py-12 max-w-6xl">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-3">
          <Repeat className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">Save more with a plan</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">Subscription plans</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">Same Zooter every visit. Lock in pricing. Cancel anytime.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p) => {
          const isActive = activeId === p.id;
          return (
            <Card key={p.id} className={`p-7 rounded-3xl relative ${p.popular ? "border-primary border-2 shadow-warm" : "border-border"}`}>
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Most popular
                </span>
              )}
              <h3 className="font-display text-2xl font-bold">{p.name}</h3>
              <p className="text-sm text-muted-foreground capitalize mb-4">{p.cadence} · {p.hours_per_visit}h per visit</p>
              <div className="mb-1">
                <span className="font-display text-5xl font-bold">${Number(p.monthly_price).toFixed(0)}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              {p.savings_pct > 0 && <p className="text-sm text-sage-deep font-semibold mb-5">Save {p.savings_pct}% vs one-off</p>}
              <ul className="space-y-2 mb-6">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-sage-deep mt-0.5 shrink-0" /> {perk}
                  </li>
                ))}
              </ul>
              {isActive ? (
                <Button onClick={cancel} variant="outline" className="w-full rounded-xl">Cancel subscription</Button>
              ) : (
                <Button onClick={() => subscribe(p.id)} className={`w-full rounded-xl ${p.popular ? "gradient-warm" : ""}`}>
                  Subscribe
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Plans;