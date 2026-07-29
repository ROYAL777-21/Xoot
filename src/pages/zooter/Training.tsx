import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Award, BadgeCheck, CheckCircle2, Crown, Flame, GraduationCap, Loader2, Sparkles, Target, Trophy, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { captureAnalyticsEvent } from "@/lib/analytics";

type QuizQuestion = {
  q: string;
  a: string[];
  correct: number;
};

type TrainingModule = {
  id: string;
  title: string;
  description: string;
  duration_min: number;
  category: string;
  badge_color?: string | null;
  quiz_questions?: QuizQuestion[] | null;
  required?: boolean | null;
  pass_score?: number | null;
  rank_points?: number | null;
  badge_label?: string | null;
};

type Completion = {
  module_id: string;
  score: number;
  passed: boolean;
  completed_at?: string | null;
};

const tiers = [
  { name: "Starter", min: 0 },
  { name: "Verified", min: 120 },
  { name: "Preferred", min: 220 },
  { name: "Elite", min: 340 },
  { name: "Signature", min: 480 },
];

const getQuestions = (module?: TrainingModule | null): QuizQuestion[] =>
  Array.isArray(module?.quiz_questions) ? module.quiz_questions : [];

const getRankPoints = (module: TrainingModule) => Number(module.rank_points ?? (module.required ? 40 : 25));

const getTierProgress = (points: number) => {
  const current = [...tiers].reverse().find((tier) => points >= tier.min) ?? tiers[0];
  const next = tiers.find((tier) => tier.min > points) ?? null;
  const previousMin = current.min;
  const nextMin = next?.min ?? Math.max(points, tiers[tiers.length - 1].min);
  const progress = next ? ((points - previousMin) / (nextMin - previousMin)) * 100 : 100;
  return { current, next, progress: Math.min(100, Math.max(0, progress)) };
};

const Training = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [done, setDone] = useState<Record<string, Completion>>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<TrainingModule | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);

  const load = useCallback(async () => {
    const [{ data: mods }, { data: comps }] = await Promise.all([
      supabase.from("training_modules").select("*").order("required", { ascending: false }).order("category"),
      user ? supabase.from("zooter_training_completions").select("*").eq("user_id", user.id) : Promise.resolve({ data: [] as Completion[] }),
    ]);
    setModules((mods ?? []) as TrainingModule[]);
    const completionMap: Record<string, Completion> = {};
    ((comps ?? []) as Completion[]).forEach((completion) => {
      completionMap[completion.module_id] = completion;
    });
    setDone(completionMap);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [load, user]);

  const open = (module: TrainingModule) => {
    setActive(module);
    setAnswers(new Array(getQuestions(module).length).fill(-1));
  };

  const submit = async () => {
    if (!active || !user) return;
    const questions = getQuestions(active);
    const correct = questions.reduce((sum, question, index) => sum + (answers[index] === question.correct ? 1 : 0), 0);
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 100;
    const passScore = active.pass_score ?? 80;
    const passed = score >= passScore;

    await supabase.from("zooter_training_completions").upsert({
      user_id: user.id,
      module_id: active.id,
      score,
      passed,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,module_id" });

    if (passed) {
      captureAnalyticsEvent("zooter_training_module_completed", {
        module_category: active.category || "general",
        score_band: score >= 90 ? "90_100" : score >= 80 ? "80_89" : "below_80",
        badge_awarded: Boolean(active.badge_label),
      });
      toast.success(`Passed with ${score}%. ${active.badge_label ?? "Skill badge"} unlocked.`);
    } else {
      toast.error(`${score}% - try again; you need ${passScore}%.`);
    }
    setActive(null);
    load();
  };

  const progress = useMemo(() => {
    const requiredModules = modules.filter((module) => module.required);
    const optionalModules = modules.filter((module) => !module.required);
    const completedModules = modules.filter((module) => done[module.id]?.passed);
    const points = completedModules.reduce((sum, module) => sum + getRankPoints(module), 0);
    const maxPoints = modules.reduce((sum, module) => sum + getRankPoints(module), 0);
    const categoryStats = Object.values(
      modules.reduce<Record<string, { category: string; total: number; completed: number; required: number }>>((acc, module) => {
        const key = module.category || "general";
        acc[key] ??= { category: key, total: 0, completed: 0, required: 0 };
        acc[key].total += 1;
        if (module.required) acc[key].required += 1;
        if (done[module.id]?.passed) acc[key].completed += 1;
        return acc;
      }, {}),
    ).sort((a, b) => b.required - a.required || a.category.localeCompare(b.category));
    return {
      requiredModules,
      optionalModules,
      completedModules,
      categoryStats,
      points,
      maxPoints,
      requiredDone: requiredModules.filter((module) => done[module.id]?.passed).length,
      optionalDone: optionalModules.filter((module) => done[module.id]?.passed).length,
      tier: getTierProgress(points),
    };
  }, [done, modules]);

  if (loading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const requiredReady = progress.requiredModules.length > 0 && progress.requiredDone === progress.requiredModules.length;
  const unlockedBadges = progress.completedModules.map((module) => module.badge_label).filter(Boolean).slice(0, 4);
  const activeQuestions = getQuestions(active);

  return (
    <div className="container py-8 lg:py-12 max-w-6xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-3 border border-accent/20">
          <GraduationCap className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">Training rank</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">Standards & skill badges</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Complete the required modules for activation, then add optional badges that help improve matching, client confidence, and premium job readiness.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4 mb-8">
        <Card className="p-5 rounded-3xl gradient-sage text-primary-foreground border-0 shadow-warm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-background/20 backdrop-blur-sm">
              <Trophy className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-2xl font-bold">{progress.tier.current.name} Zooter</p>
                {requiredReady && <span className="rounded-full bg-background/20 px-2.5 py-1 text-[10px] font-bold uppercase">Activation ready</span>}
              </div>
              <p className="text-sm opacity-90">
                {progress.points} ranking points earned{progress.maxPoints ? ` from ${progress.maxPoints} available` : ""}.
                {progress.tier.next ? ` ${progress.tier.next.min - progress.points} points to ${progress.tier.next.name}.` : " Highest tier unlocked."}
              </p>
              <Progress value={progress.tier.progress} className="mt-4 bg-background/25" />
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-3xl">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Momentum</p>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat icon={Target} label="Required" value={`${progress.requiredDone}/${progress.requiredModules.length}`} />
            <MiniStat icon={Sparkles} label="Optional" value={`${progress.optionalDone}/${progress.optionalModules.length}`} />
            <MiniStat icon={Flame} label="Badges" value={String(progress.completedModules.length)} />
          </div>
          {unlockedBadges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {unlockedBadges.map((badge) => (
                <span key={badge} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase text-primary">{badge}</span>
              ))}
            </div>
          )}
        </Card>
      </div>

      {progress.categoryStats.length > 0 && (
        <Card className="mb-8 rounded-3xl p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Learning paths</p>
              <h2 className="font-display text-2xl font-bold">Category coverage</h2>
            </div>
            <p className="text-sm text-muted-foreground">Progress is pulled from your completed module records.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {progress.categoryStats.map((stat) => (
              <div key={stat.category} className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold capitalize">{stat.category.replace(/-/g, " ")}</p>
                  {stat.required > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{stat.required} required</span>}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{stat.completed}/{stat.total} modules passed</p>
                <Progress value={stat.total ? (stat.completed / stat.total) * 100 : 0} className="mt-3 h-1.5" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {modules.length === 0 ? (
        <Card className="p-8 rounded-3xl text-center text-muted-foreground">Training modules will appear here after setup.</Card>
      ) : (
        <div className="space-y-8">
          <ModuleSection title="Required activation modules" subtitle="These modules keep the marketplace consistent and safe." modules={progress.requiredModules} done={done} onOpen={open} />
          <ModuleSection title="Optional ranking boosters" subtitle="These are not mandatory, but they help Zoot match you to higher-intent clients and specialised jobs." modules={progress.optionalModules} done={done} onOpen={open} />
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(openDialog) => !openDialog && setActive(null)}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{active?.title}</DialogTitle>
            <DialogDescription>
              Score {active?.pass_score ?? 80}% or higher to unlock {active?.badge_label ?? "this badge"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
            {activeQuestions.map((question, questionIndex) => (
              <div key={question.q}>
                <p className="font-medium text-sm mb-2">{questionIndex + 1}. {question.q}</p>
                <div className="space-y-1.5">
                  {question.a.map((option, optionIndex) => (
                    <label key={option} className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer text-sm ${answers[questionIndex] === optionIndex ? "border-primary bg-primary/5" : "border-border"}`}>
                      <input
                        type="radio"
                        name={`q${questionIndex}`}
                        className="accent-primary"
                        checked={answers[questionIndex] === optionIndex}
                        onChange={() => {
                          const nextAnswers = [...answers];
                          nextAnswers[questionIndex] = optionIndex;
                          setAnswers(nextAnswers);
                        }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={submit} disabled={answers.some((answer) => answer === -1)} className="gradient-warm">Submit answers</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MiniStat = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) => (
  <div className="rounded-2xl border border-border bg-muted/30 p-3">
    <Icon className="h-4 w-4 text-primary mb-2" />
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-display text-xl font-bold">{value}</p>
  </div>
);

const ModuleSection = ({
  title,
  subtitle,
  modules,
  done,
  onOpen,
}: {
  title: string;
  subtitle: string;
  modules: TrainingModule[];
  done: Record<string, Completion>;
  onOpen: (module: TrainingModule) => void;
}) => {
  if (modules.length === 0) return null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} completion={done[module.id]} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
};

const ModuleCard = ({
  module,
  completion,
  onOpen,
}: {
  module: TrainingModule;
  completion?: Completion;
  onOpen: (module: TrainingModule) => void;
}) => {
  const passed = completion?.passed;
  const rankPoints = getRankPoints(module);

  return (
    <Card className="p-5 rounded-2xl h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            {module.title}
            {passed && <CheckCircle2 className="h-4 w-4 shrink-0 text-sage-deep" />}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-muted text-muted-foreground">{module.category}</span>
            {module.required ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-primary/15 text-primary">Required</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-accent/15 text-sage-deep">Optional</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
            <Crown className="h-3 w-3" /> {rankPoints}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4 flex-1">{module.description}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4">
        <span>{module.duration_min} min</span>
        <span>Pass {module.pass_score ?? 80}%</span>
        {module.badge_label && (
          <span className="inline-flex items-center gap-1 text-sage-deep">
            <Award className="h-3 w-3" /> {module.badge_label}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        {passed ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-sage-deep">
            <BadgeCheck className="h-4 w-4" /> {completion?.score}% passed
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not completed</span>
        )}
        <Button size="sm" variant={passed ? "outline" : "default"} className="rounded-full" onClick={() => onOpen(module)}>
          {passed ? "Retake" : "Start"}
        </Button>
      </div>
    </Card>
  );
};

export default Training;
