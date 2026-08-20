import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase, GraduationCap, Loader2, ShieldCheck, Sparkles, Star, Wallet } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [xooter, setXooter] = useState<any>(null);
  const [app, setApp] = useState<any>(null);
  const [stats, setStats] = useState({ open_jobs: 0, week_earnings: 0, completion_rate: 100 });
  const [trainingSummary, setTrainingSummary] = useState({ points: 0, passed: 0, available: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: z }, { data: a }] = await Promise.all([
        supabase.from("xooters").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("xooter_applications").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setXooter(z);
      setApp(a);

      const [{ data: modules }, { data: completions }] = await Promise.all([
        supabase.from("training_modules").select("*"),
        supabase.from("xooter_training_completions").select("*").eq("user_id", user.id).eq("passed", true),
      ]);
      const passedIds = new Set((completions ?? []).map((completion: any) => completion.module_id));
      const trainingPoints = (modules ?? [])
        .filter((module: any) => passedIds.has(module.id))
        .reduce((sum: number, module: any) => sum + Number(module.rank_points ?? (module.required ? 40 : 25)), 0);
      setTrainingSummary({ points: trainingPoints, passed: passedIds.size, available: (modules ?? []).length });

      if (z) {
        const [{ count: openJobs }, { data: earn }] = await Promise.all([
          supabase.from("xooter_jobs").select("id", { count: "exact", head: true }).eq("xooter_id", z.id).eq("state", "offered"),
          supabase.from("xooter_earnings").select("net_amount").eq("xooter_id", z.id).gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()),
        ]);
        const week = (earn ?? []).reduce((sum: number, earning: any) => sum + Number(earning.net_amount), 0);
        setStats({ open_jobs: openJobs ?? 0, week_earnings: week, completion_rate: 100 });
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const status = app?.status ?? "draft";
  const statusBadge: Record<string, { text: string; cls: string }> = {
    draft: { text: "Application incomplete", cls: "bg-muted text-muted-foreground" },
    submitted: { text: "Under review", cls: "bg-primary/15 text-primary" },
    approved: { text: "Verified Xooter", cls: "bg-accent/15 text-accent-ink" },
    rejected: { text: "Application rejected", cls: "bg-destructive/15 text-destructive" },
  };

  return (
    <div className="container py-8 lg:py-12 max-w-6xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-3 border border-accent/20">
          <Sparkles className="h-3 w-3 text-accent-ink" />
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[status].cls}`}>{statusBadge[status].text}</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">Hi {app?.full_name?.split(" ")[0] ?? "there"}</h1>
        <p className="text-muted-foreground mt-2">{xooter ? "Here's your day at a glance." : "Complete your application to start receiving jobs."}</p>
      </div>

      {!xooter && status !== "approved" && (
        <Card className="p-6 rounded-3xl gradient-warm text-primary-foreground border-0 mb-8 shadow-warm">
          <p className="font-display text-2xl font-bold mb-1">Finish verification</p>
          <p className="text-sm opacity-90 mb-4">
            {status === "submitted"
              ? "Your application is in the trust review queue. We'll notify you when each verification area is reviewed."
              : "Upload your ID, proof of address, banking and consent to a background check."}
          </p>
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/xooter/kyc">{status === "submitted" ? "View status" : "Continue application"} <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat icon={Briefcase} label="Open job offers" value={stats.open_jobs.toString()} accent="primary" />
        <Stat icon={Wallet} label="This week net" value={`R${stats.week_earnings.toFixed(0)}`} accent="sage" />
        <Stat icon={GraduationCap} label="Training points" value={trainingSummary.points.toString()} accent="sage" />
        <Stat icon={Star} label="Rating" value={xooter ? Number(xooter.rating).toFixed(2) : "-"} accent="primary" />
      </div>

      <h2 className="font-display text-2xl font-bold mb-4">Get the most out of Xoot</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Tile to="/xooter/jobs" icon={Briefcase} title="Browse jobs" body="Accept the matches that fit your schedule." />
        <Tile to="/xooter/training" icon={GraduationCap} title="Training" body={`${trainingSummary.passed}/${trainingSummary.available} modules passed. Optional badges help with premium matching.`} />
        <Tile to="/xooter/earnings" icon={Wallet} title="Earnings" body="See gross, commission and net for every booking." />
        <Tile to="/xooter/kyc" icon={ShieldCheck} title="Verification" body="Re-upload documents or check review status." />
        <Tile to="/xooter/profile" icon={Star} title="Profile" body="Update your bio, photo and service tags." />
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, accent }: any) => (
  <Card className="p-5 rounded-2xl">
    <div className={`grid h-10 w-10 place-items-center rounded-xl mb-3 ${accent === "primary" ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent-ink"}`}>
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-display text-3xl font-bold mt-1">{value}</p>
  </Card>
);

const Tile = ({ to, icon: Icon, title, body }: any) => (
  <Link to={to} className="block">
    <Card className="p-5 rounded-2xl hover:shadow-warm transition-shadow h-full">
      <Icon className="h-5 w-5 text-primary mb-3" />
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </Card>
  </Link>
);

export default Dashboard;
