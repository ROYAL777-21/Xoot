import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Gift, Sparkles, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { applyZootCredLedger, routeNotificationChannel } from "@/lib/operations";
import { formatZAR } from "@/lib/format";

const TARGET = 10;

const Loyalty = () => {
  const { user } = useAuth();
  const [loyalty, setLoyalty] = useState<{ points: number; free_credits: number; total_bookings: number } | null>(null);
  const [zootCred, setZootCred] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    const [{ data }, { data: ledger }] = await Promise.all([
      supabase.from("loyalty_points").select("*").eq("user_id", user.id).single(),
      (supabase as any).from("zootcred_ledger").select("amount, direction, status").eq("user_id", user.id).in("status", ["available", "redeemed"]),
    ]);
    if (data) setLoyalty(data);
    setZootCred(applyZootCredLedger((ledger ?? []).map((row: any) => ({ amount: Number(row.amount), direction: row.direction }))));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  const redeem = async () => {
    if (!user || !loyalty || loyalty.free_credits < 1) return;
    await supabase.from("loyalty_points").update({ free_credits: loyalty.free_credits - 1 }).eq("user_id", user.id);
    await (supabase as any).from("zootcred_ledger").insert({
      user_id: user.id,
      amount: 1,
      direction: "debit",
      reason: "redemption",
      status: "redeemed",
      meta: { redemption_type: "free_clean_credit" },
    });
    await (supabase as any).from("integration_outbox").insert(routeNotificationChannel("zootcred_update").map((channel) => ({
      source_table: "zootcred_ledger",
      event_type: "zootcred_update",
      channel,
      owner: "Retention & Loyalty Agent",
      stack_tool: "Zoot in-app notification",
      payload: { redemption_type: "free_clean_credit" },
      created_by: user.id,
    })));
    toast.success("Free credit applied to your next booking!");
    refresh();
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const total = loyalty?.total_bookings ?? 0;
  const progress = total % TARGET;
  const tier = total >= 30 ? "Gold" : total >= 15 ? "Silver" : "Bronze";
  const tierColor = tier === "Gold" ? "text-primary" : tier === "Silver" ? "text-sage-deep" : "text-muted-foreground";

  return (
    <div className="container py-8 lg:py-12 max-w-4xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
          <Gift className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-primary">Zoot Rewards</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">Earn while you book</h1>
        <p className="text-muted-foreground mt-2">Rewards, ZootCred, referral credits, and free-clean milestones stay on-platform.</p>
      </div>

      <Card className="p-8 rounded-3xl gradient-warm text-primary-foreground shadow-warm border-0 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm opacity-90">Available free cleans</p>
            <p className="font-display text-6xl font-bold">{loyalty?.free_credits ?? 0}</p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full bg-background/20 backdrop-blur px-3 py-1.5 text-sm font-bold`}>
            <Trophy className="h-4 w-4" /> {tier} tier
          </div>
        </div>
        <Button onClick={redeem} disabled={!loyalty?.free_credits} variant="secondary" className="rounded-full">
          <Sparkles className="h-4 w-4 mr-1" /> Redeem a free clean
        </Button>
      </Card>

      <Card className="p-6 rounded-3xl mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-xl font-bold">Next free clean</h3>
          <span className="text-sm text-muted-foreground">{progress} / {TARGET}</span>
        </div>
        <Progress value={(progress / TARGET) * 100} className="h-3" />
        <p className="text-sm text-muted-foreground mt-3">{TARGET - progress} more booking{TARGET - progress === 1 ? "" : "s"} to earn another free clean.</p>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-2xl">
          <p className="text-3xl font-display font-bold">{formatZAR(zootCred)}</p>
          <p className="text-sm text-muted-foreground">ZootCred ledger</p>
        </Card>
        <Card className="p-5 rounded-2xl">
          <p className="text-3xl font-display font-bold">{loyalty?.points ?? 0}</p>
          <p className="text-sm text-muted-foreground">Points balance</p>
        </Card>
        <Card className="p-5 rounded-2xl">
          <p className="text-3xl font-display font-bold">{loyalty?.total_bookings ?? 0}</p>
          <p className="text-sm text-muted-foreground">Lifetime bookings</p>
        </Card>
        <Card className="p-5 rounded-2xl">
          <p className={`text-3xl font-display font-bold capitalize ${tierColor}`}>{tier}</p>
          <p className="text-sm text-muted-foreground">Current tier</p>
        </Card>
      </div>
    </div>
  );
};

export default Loyalty;
