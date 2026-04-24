import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Wallet, Loader2, TrendingUp, Star, Trophy, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatZAR, formatZARDecimal } from "@/lib/format";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";

const TIER_THRESHOLDS = { new: 0, established: 25, veteran: 100 };
const TIER_SHARE: Record<string, number> = { new: 65, established: 80, veteran: 96 };

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
  const tier = (zooter?.tier ?? "new") as keyof typeof TIER_SHARE;
  const tierShare = TIER_SHARE[tier] ?? 65;
  const completedJobs = items.length;
  const nextTier = tier === "new" ? "established" : tier === "established" ? "veteran" : null;
  const nextTierTarget = nextTier ? TIER_THRESHOLDS[nextTier] : null;
  const tierProgress = nextTierTarget ? Math.min(100, (completedJobs / nextTierTarget) * 100) : 100;

  // Chart data — last 8 weeks
  const weekly: { week: string; earnings: number }[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now); start.setDate(now.getDate() - i * 7 - 6); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    const sum = items.filter((e) => { const d = new Date(e.created_at); return d >= start && d < end; })
      .reduce((s, e) => s + Number(e.net_amount), 0);
    weekly.push({ week: `W-${i}`, earnings: Math.round(sum) });
  }

  const dailyMix: { day: string; jobs: number }[] = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, idx) => ({
    day, jobs: items.filter((e) => new Date(e.created_at).getDay() === ((idx + 1) % 7)).length,
  }));

  const badges = [
    { icon: Trophy, label: `${completedJobs} jobs`, color: "bg-primary/10 text-primary", earned: completedJobs > 0 },
    { icon: Star, label: `${Number(zooter?.rating ?? 0).toFixed(2)}★`, color: "bg-accent/15 text-sage-deep", earned: (zooter?.rating ?? 0) >= 4.5 },
    { icon: Target, label: `${tierShare}% share`, color: "bg-primary/10 text-primary", earned: true },
    { icon: TrendingUp, label: tier, color: "bg-sage/15 text-sage-deep", earned: true },
  ];

  return (
    <div className="container py-8 lg:py-12 max-w-6xl">
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">Earnings</h1>
      <p className="text-muted-foreground mb-8">You currently keep <span className="font-bold text-foreground">{tierShare}%</span> of every booking. Complete more jobs and pass training to unlock the next tier.</p>

      {/* Hero stat row */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-6 rounded-3xl gradient-warm text-primary-foreground border-0 shadow-warm">
          <Wallet className="h-6 w-6 mb-3 opacity-90" />
          <p className="text-xs uppercase tracking-wider opacity-90">Lifetime net</p>
          <p className="font-display text-4xl font-bold mt-1">{formatZAR(total)}</p>
        </Card>
        <Card className="p-6 rounded-3xl">
          <TrendingUp className="h-6 w-6 mb-3 text-sage-deep" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending payout</p>
          <p className="font-display text-4xl font-bold mt-1">{formatZAR(pending)}</p>
          <p className="text-xs text-muted-foreground mt-1">Paid out every Friday</p>
        </Card>
        <Card className="p-6 rounded-3xl">
          <Trophy className="h-6 w-6 mb-3 text-primary" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Tier</p>
          <p className="font-display text-4xl font-bold mt-1 capitalize">{tier}</p>
          {nextTier && (
            <>
              <Progress value={tierProgress} className="h-1.5 mt-3" />
              <p className="text-xs text-muted-foreground mt-1.5">{Math.max(0, (nextTierTarget ?? 0) - completedJobs)} jobs to {nextTier}</p>
            </>
          )}
        </Card>
      </div>

      {/* Badges */}
      <Card className="p-5 rounded-3xl mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Achievements</p>
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.label} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${b.color} ${!b.earned ? "opacity-40" : ""}`}>
                <Icon className="h-3.5 w-3.5" />{b.label}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5 rounded-3xl">
          <p className="font-display text-lg font-bold mb-4">Earnings (last 8 weeks)</p>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R${v}`} />
                <Tooltip formatter={(v: number) => formatZAR(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5 rounded-3xl">
          <p className="font-display text-lg font-bold mb-4">Jobs by day of week</p>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={dailyMix}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="jobs" fill="hsl(var(--accent))" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-border"><h2 className="font-display text-xl font-bold">Activity</h2></div>
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No earnings yet. Accept your first job to get started.</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">Booking {e.booking_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString("en-ZA")} · gross {formatZARDecimal(e.gross_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold">{formatZARDecimal(e.net_amount)}</p>
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

export default Earnings;
