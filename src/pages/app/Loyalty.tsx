import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Gift, Loader2, Sparkles, Trophy, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";
import { invokeOpsWorkflow } from "@/lib/ops-workflow";
import { useZootCred } from "@/hooks/useZootCred";

const TARGET = 10;

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value)) : "No expiry";

const reasonLabel = (reason: string) =>
  reason
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const Loyalty = () => {
  const { user } = useAuth();
  const zootCred = useZootCred();
  const [loyalty, setLoyalty] = useState<{ points: number; free_credits: number; total_bookings: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("loyalty_points").select("*").eq("user_id", user.id).single();
    if (data) setLoyalty(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const redeem = async () => {
    if (!user || !loyalty || loyalty.free_credits < 1) return;
    try {
      await invokeOpsWorkflow({ action: "redeem_loyalty_credit" });
      toast.success("Free credit applied to your next booking!");
      await Promise.all([refresh(), zootCred.refresh()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reward redemption failed");
    }
  };

  if (loading || zootCred.loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const total = loyalty?.total_bookings ?? 0;
  const progress = total % TARGET;
  const tier = total >= 30 ? "Gold" : total >= 15 ? "Silver" : "Bronze";
  const tierColor = tier === "Gold" ? "text-primary" : tier === "Silver" ? "text-sage-deep" : "text-muted-foreground";

  return (
    <div className="container max-w-5xl py-8 lg:py-12">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
          <Gift className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-primary">Zoot Rewards</span>
        </div>
        <h1 className="font-display text-4xl font-bold md:text-5xl">Earn while you book</h1>
        <p className="mt-2 text-muted-foreground">Rewards, ZootCred, referral credits, and free-clean milestones stay on-platform.</p>
      </div>

      <Card className="mb-6 rounded-3xl border-0 p-8 text-primary-foreground shadow-warm gradient-warm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm opacity-90">Available free cleans</p>
            <p className="font-display text-6xl font-bold">{loyalty?.free_credits ?? 0}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-background/20 px-3 py-1.5 text-sm font-bold backdrop-blur-sm">
            <Trophy className="h-4 w-4" /> {tier} tier
          </div>
        </div>
        <Button onClick={redeem} disabled={!loyalty?.free_credits} variant="secondary" className="rounded-full">
          <Sparkles className="mr-1 h-4 w-4" /> Redeem a free clean
        </Button>
      </Card>

      <Card className="mb-6 rounded-3xl p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">Next free clean</h3>
          <span className="text-sm text-muted-foreground">{progress} / {TARGET}</span>
        </div>
        <Progress value={(progress / TARGET) * 100} className="h-3" />
        <p className="mt-3 text-sm text-muted-foreground">{TARGET - progress} more booking{TARGET - progress === 1 ? "" : "s"} to earn another free clean.</p>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl p-5">
          <p className="font-display text-3xl font-bold">{formatZAR(zootCred.availableBalance)}</p>
          <p className="text-sm text-muted-foreground">Available ZootCred</p>
        </Card>
        <Card className="rounded-2xl p-5">
          <p className="font-display text-3xl font-bold">{formatZAR(zootCred.pendingBalance)}</p>
          <p className="text-sm text-muted-foreground">Pending ZootCred</p>
        </Card>
        <Card className="rounded-2xl p-5">
          <p className="font-display text-3xl font-bold">{loyalty?.points ?? 0}</p>
          <p className="text-sm text-muted-foreground">Points balance</p>
        </Card>
        <Card className="rounded-2xl p-5">
          <p className={`font-display text-3xl font-bold capitalize ${tierColor}`}>{tier}</p>
          <p className="text-sm text-muted-foreground">Current tier</p>
        </Card>
      </div>

      <Card className="rounded-3xl p-6 shadow-card">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">ZootCred transaction history</h2>
            <p className="mt-1 text-sm text-muted-foreground">Calculated from ledger rows. Wallet columns are not used.</p>
          </div>
          <WalletCards className="h-6 w-6 text-primary" />
        </div>

        {zootCred.error ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
            {zootCred.error}
          </div>
        ) : zootCred.entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No ZootCred ledger entries yet. Completed bookings and eligible credits will appear here.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {zootCred.entries.map((entry) => (
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
                  {entry.amount >= 0 ? "+" : "-"}{formatZAR(entry.displayAmount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Loyalty;
