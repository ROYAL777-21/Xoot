import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { GraduationCap, CheckCircle2, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";

const Training = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<any[]>([]);
  const [done, setDone] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);
  const [answers, setAnswers] = useState<number[]>([]);

  const load = async () => {
    const [{ data: mods }, { data: comps }] = await Promise.all([
      supabase.from("training_modules").select("*").order("required", { ascending: false }),
      user ? supabase.from("zooter_training_completions").select("*").eq("user_id", user.id) : Promise.resolve({ data: [] as any[] }),
    ]);
    setModules(mods ?? []);
    const m: Record<string, any> = {};
    (comps ?? []).forEach((c: any) => { m[c.module_id] = c; });
    setDone(m);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const open = (m: any) => { setActive(m); setAnswers(new Array((m.quiz_questions ?? []).length).fill(-1)); };

  const submit = async () => {
    if (!active || !user) return;
    const qs = active.quiz_questions ?? [];
    const correct = qs.reduce((s: number, q: any, i: number) => s + (answers[i] === q.correct ? 1 : 0), 0);
    const score = qs.length ? Math.round((correct / qs.length) * 100) : 100;
    const passed = score >= (active.pass_score ?? 80);
    await supabase.from("zooter_training_completions").upsert({
      user_id: user.id, module_id: active.id, score, passed, completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,module_id" });
    if (passed) toast.success(`Passed with ${score}%! Module unlocked.`);
    else toast.error(`${score}% — try again, you need ${active.pass_score}%.`);
    setActive(null);
    load();
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const requiredDone = modules.filter((m) => m.required).every((m) => done[m.id]?.passed);
  const passedCount = Object.values(done).filter((c: any) => c.passed).length;

  return (
    <div className="container py-8 lg:py-12 max-w-5xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-3 border border-accent/20">
          <GraduationCap className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">Training</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">Standards & training</h1>
        <p className="text-muted-foreground mt-2">Pass required modules to be activated. Each completed module raises your tier and your share.</p>
      </div>

      <Card className="p-5 rounded-3xl gradient-sage text-primary-foreground border-0 mb-8 flex items-center gap-4 shadow-warm">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-background/20 backdrop-blur">
          <Trophy className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="font-display text-xl font-bold">{passedCount} / {modules.length} modules passed</p>
          <p className="text-sm opacity-90">{requiredDone ? "All required modules complete — you're activation-ready." : "Complete all required modules to be activated."}</p>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {modules.map((m) => {
          const c = done[m.id];
          return (
            <Card key={m.id} className="p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-display text-lg font-bold flex items-center gap-2">
                    {m.title}
                    {c?.passed && <CheckCircle2 className="h-4 w-4 text-sage-deep" />}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-muted text-muted-foreground inline-block mt-1">{m.category}</span>
                  {m.required && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-primary/15 text-primary ml-1.5">Required</span>}
                </div>
                {c && <span className="text-xs text-muted-foreground">{c.score}%</span>}
              </div>
              <p className="text-sm text-muted-foreground mb-3">{m.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{m.duration_min} min · pass {m.pass_score}%</span>
                <Button size="sm" variant={c?.passed ? "outline" : "default"} className="rounded-full" onClick={() => open(m)}>
                  {c?.passed ? "Retake" : "Start"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{active?.title}</DialogTitle>
            <DialogDescription>Pick the best answer for each question.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
            {(active?.quiz_questions ?? []).map((q: any, qi: number) => (
              <div key={qi}>
                <p className="font-medium text-sm mb-2">{qi + 1}. {q.q}</p>
                <div className="space-y-1.5">
                  {q.a.map((opt: string, oi: number) => (
                    <label key={oi} className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer text-sm ${answers[qi] === oi ? "border-primary bg-primary/5" : "border-border"}`}>
                      <input type="radio" name={`q${qi}`} className="accent-primary" checked={answers[qi] === oi}
                        onChange={() => { const a = [...answers]; a[qi] = oi; setAnswers(a); }} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={submit} disabled={answers.some((a) => a === -1)} className="gradient-warm">Submit answers</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Training;