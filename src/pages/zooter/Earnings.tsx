import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Wallet, Loader2, TrendingUp } from "lucide-react";

const Earnings = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [zooter, setZooter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: z } = await supabase.from("zooters").select("*").eq("user_id", user.id).maybeSingle();
      setZooter(z);
      if (z) {
        const { data } = await supabase.from("zooter_earnings").select("*").eq("zooter_id", z.id).order("created_at", { ascending: false });
        setItems(data ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const total = items.reduce((s, e) => s + Number(e.net_amount), 0);
  const pending = items.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.net_amount), 0);
  const tierShare = zooter ? Math.round((1 - Number(zooter.commission_rate)) * 100) : 65;

  return (
    <div className="container py-8 lg:py-12 max-w-5xl">
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">Earnings</h1>
      <p className="text-muted-foreground mb-8">You currently earn <span className="font-bold text-foreground">{tierShare}%</span> of every booking. Complete training to unlock higher tiers.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Stat label="Lifetime net" value={`$${total.toFixed(2)}`} icon={Wallet} />
        <Stat label="Pending payout" value={`$${pending.toFixed(2)}`} icon={TrendingUp} />
        <Stat label="Tier" value={zooter?.tier ?? "new"} icon={TrendingUp} />
      </div>

      <Card className="rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-border"><h2 className="font-display text-xl font-bold">Activity</h2></div>
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No earnings yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">Booking {e.booking_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()} · gross ${Number(e.gross_amount).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold">${Number(e.net_amount).toFixed(2)}</p>
                  <p className={`text-[10px] uppercase font-bold ${e.status === "paid" ? "text-sage-deep" : "text-muted-foreground"}`}>{e.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const Stat = ({ label, value, icon: Icon }: any) => (
  <Card className="p-5 rounded-2xl">
    <Icon className="h-5 w-5 text-sage-deep mb-2" />
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-display text-2xl font-bold mt-1 capitalize">{value}</p>
  </Card>
);

export default Earnings;