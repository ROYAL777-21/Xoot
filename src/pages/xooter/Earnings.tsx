import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Wallet, Loader2, TrendingUp, Star, Trophy, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatZAR, formatZARDecimal } from "@/lib/format";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import {
  COMMISSION_BANDS,
  applyBoost,
  boostIsActive,
  commissionBandFor,
  impliedSubtotalCents,
  nextBandValueFor,
} from "@/lib/xooter-commission";
import { BoostCelebration } from "@/components/xooter/BoostCelebration";
import type { XooterBoost } from "@/lib/xooter-boost-announcement";

/** The best active boost right now, in bps, or 0. */
const activeBoostBps = (boosts: XooterBoost[]) =>
  boosts.filter((b) => boostIsActive(b)).reduce((best, b) => Math.max(best, b.bps), 0);

/*
 * ⚠️ REMOVED 2026-08-10: a private tier table that promised pay the platform does not give.
 *
 *   const TIER_THRESHOLDS = { new: 0, established: 25, veteran: 100 };
 *   const TIER_SHARE = { new: 65, established: 80, veteran: 96 };
 *
 * This screen told a Xooter "You currently keep {tierShare}% of every booking", so at 100 jobs it
 * promised **96%** — a 4% commission, against a confirmed 20% floor. The real ladder gives 75% at
 * 75 jobs and 80% at 200. A Xooter who reached 100 jobs expecting 96% would have found 75%.
 *
 * It also progressed on job count alone, while the ladder the founder specified turns on
 * `reliability_score` — ratings, punctuality, quality of work — with job count only as a minimum
 * sample. So the screen was coaching people toward the wrong behaviour as well as the wrong number.
 *
 * The rank, the share and the next step now all come from `xooter-commission.ts`, which is the
 * same module `create-booking` uses to strike the rate. One answer, and the one that pays.
 */

const Earnings = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [xooter, setXooter] = useState<any>(null);
  const [boosts, setBoosts] = useState<XooterBoost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: z } = await supabase.from("xooters").select("*").eq("user_id", user.id).maybeSingle();
      setXooter(z);
      if (z) {
        const { data } = await supabase.from("xooter_earnings").select("*").eq("xooter_id", z.id).order("created_at", { ascending: false });
        setItems(data ?? []);

        // Boosts are readable by their own Xooter under RLS. A failure here must not take the
        // earnings page down — the boost is good news, not load-bearing.
        const { data: boostRows, error: boostError } = await supabase
          .from("xooter_commission_boosts")
          .select("id,bps,starts_at,ends_at,reason")
          .eq("xooter_id", z.id);
        if (boostError) console.warn("boost lookup failed", boostError.message);
        setBoosts(
          (boostRows ?? []).map((b: any) => ({
            id: b.id, bps: b.bps, startsAt: b.starts_at, endsAt: b.ends_at, reason: b.reason,
          })),
        );
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const total = items.reduce((s, e) => s + Number(e.net_amount), 0);
  const pending = items.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.net_amount), 0);
  // Prefer the Xooter's own recorded job count over the length of the earnings list, which only
  // covers rows this page happened to load.
  const completedJobs = Number(xooter?.jobs_completed ?? items.length);
  const reliabilityScore = xooter?.reliability_score ?? null;

  const band = commissionBandFor({ reliabilityScore, completedJobs });
  const boostBps = activeBoostBps(boosts);
  const effectiveRateBps = boostBps > 0 ? applyBoost(band.rateBps, boostBps) : band.rateBps;
  // What they keep, which is the number this page is actually about.
  const tierShare = (10000 - effectiveRateBps) / 100;
  const tier = band.label;

  const nextBand = COMMISSION_BANDS.find((b) => b.rateBps < band.rateBps) ?? null;
  const jobsToNext = nextBand ? Math.max(0, nextBand.minCompletedJobs - completedJobs) : 0;
  const scoreToNext =
    nextBand && typeof reliabilityScore === "number"
      ? Math.max(0, nextBand.minScore - reliabilityScore)
      : null;
  const tierProgress = nextBand
    ? Math.min(100, (completedJobs / Math.max(1, nextBand.minCompletedJobs)) * 100)
    : 100;

  /*
   * What the next band is worth in rands, quoted against this Xooter's *own* last 30 days.
   *
   * "Reach Silver and keep R44 more a month" is the sentence that motivates; "30% instead of 32.5%"
   * is the mechanism behind it. But the basis has to be real work, not an invented typical week —
   * a platform quoting someone a made-up figure about their own earnings is the same defect class
   * as the 96% tier this screen used to promise.
   *
   * So: sum the last 30 days of net pay, reverse it to the subtotal it came from, and price the
   * band change on that. A Xooter with nothing in the window gets **no figure at all** rather than
   * a fabricated one — which is the correct outcome for someone who has not worked yet, since any
   * number would be a guess dressed as a projection.
   */
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30NetCents = Math.round(
    items
      .filter((e) => new Date(e.created_at).getTime() >= thirtyDaysAgo)
      .reduce((s, e) => s + Number(e.net_amount), 0) * 100,
  );
  // Reversed at the band rate, not the boosted one: a boost is temporary and the history was
  // mostly struck without it, so using it here would overstate the subtotal and the reward with it.
  const last30SubtotalCents = impliedSubtotalCents(last30NetCents, band.rateBps);
  const nextBandGainCents = nextBand
    ? nextBandValueFor(last30SubtotalCents, band.rateBps, nextBand.rateBps).extraCents
    : 0;

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
    { icon: Star, label: `${Number(xooter?.rating ?? 0).toFixed(2)}★`, color: "bg-accent/15 text-accent-ink", earned: (xooter?.rating ?? 0) >= 4.5 },
    { icon: Target, label: `${tierShare}% share`, color: "bg-primary/10 text-primary", earned: true },
    { icon: TrendingUp, label: tier, color: "bg-sage/15 text-accent-ink", earned: true },
  ];

  return (
    <div className="container py-8 lg:py-12 max-w-6xl">
      <BoostCelebration boosts={boosts} currentRateBps={band.rateBps} />
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">Earnings</h1>
      <p className="text-muted-foreground mb-8">
        You currently keep <span className="font-bold text-foreground">{tierShare}%</span> of every booking
        {boostBps > 0 && <span className="font-semibold text-primary"> — boosted</span>}.
        {" "}Your rate improves as your reliability score does: ratings, turning up on time, and the
        quality of the work.
      </p>

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
          {nextBand && (
            <>
              <Progress value={tierProgress} className="h-1.5 mt-3" />
              <p className="text-xs text-muted-foreground mt-1.5">
                {jobsToNext > 0 ? `${jobsToNext} more jobs` : "Job count reached"}
                {scoreToNext !== null && scoreToNext > 0 ? `, and ${scoreToNext} more reliability points` : ""}
                {" to "}{nextBand.label}
              </p>
              {nextBandGainCents > 0 && (
                <p className="text-xs font-semibold text-sage-deep mt-1">
                  Worth about {formatZAR(nextBandGainCents / 100)} more a month at your current pace.
                </p>
              )}
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
                  <p className={`text-[10px] uppercase font-bold ${e.status === "paid" ? "text-brand" : "text-muted-foreground"}`}>{e.status}</p>
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
