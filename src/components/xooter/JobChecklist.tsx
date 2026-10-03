import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Circle, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

type ChecklistTask = {
  id: string;
  task_key: string;
  label: string;
  position: number;
  completed_at: string | null;
};

const TASK_HINTS: Record<string, string> = {
  confirm_arrival: "Let the customer know you have the visit in hand.",
  start_work: "Tap this when you begin the visit.",
  final_walkthrough: "Do a quick last look before you leave.",
  completion_photos: "Add the before and after proof in the booking screen.",
};

export const JobChecklist = ({ jobId, bookingId, readOnly = false }: { jobId: string; bookingId: string; readOnly?: boolean }) => {
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await (supabase.from("xooter_job_checklist" as any) as any)
      .select("id,task_key,label,position,completed_at")
      .eq("job_id", jobId)
      .eq("booking_id", bookingId)
      .order("position");
    if (error) {
      console.warn("Checklist lookup failed", error.message);
      setTasks([]);
    } else {
      setTasks((data ?? []) as ChecklistTask[]);
    }
    setLoading(false);
  }, [bookingId, jobId]);

  useEffect(() => { void load(); }, [load]);

  const completed = useMemo(() => tasks.filter((task) => Boolean(task.completed_at)).length, [tasks]);
  const nextTask = tasks.find((task) => !task.completed_at);

  const toggle = async (task: ChecklistTask) => {
    if (readOnly || saving) return;
    setSaving(task.task_key);
    haptic(task.completed_at ? "selection" : "success");
    try {
      const { data, error } = await supabase.functions.invoke("xooter-job-checklist", {
        body: { jobId, taskKey: task.task_key, complete: !task.completed_at },
      });
      if (error) throw error;
      const saved = data?.task as ChecklistTask | undefined;
      if (saved) setTasks((current) => current.map((item) => item.id === saved.id ? { ...item, ...saved } : item));
      else await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the checklist");
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <Card className="rounded-3xl p-5"><Loader2 className="h-5 w-5 animate-spin text-primary" /></Card>;
  if (tasks.length === 0) return null;

  return (
    <Card className="rounded-3xl p-5 border-primary/15 bg-primary/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Visit checklist
          </p>
          <h2 className="mt-1 font-display text-xl font-bold">{completed} of {tasks.length} steps complete</h2>
        </div>
        {nextTask && !readOnly ? <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Next: {nextTask.label}</span> : null}
      </div>
      <div className="mt-4 space-y-2">
        {tasks.map((task) => {
          const done = Boolean(task.completed_at);
          return (
            <div key={task.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${done ? "border-sage/40 bg-sage/10" : nextTask?.id === task.id ? "border-primary/35 bg-background shadow-sm" : "border-border bg-background/70"}`}>
              <button type="button" disabled={readOnly || saving === task.task_key} onClick={() => void toggle(task)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background transition-transform active:scale-95 disabled:cursor-default" aria-label={`${done ? "Uncheck" : "Complete"} ${task.label}`}>
                {saving === task.task_key ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : done ? <Check className="h-4 w-4 text-sage-deep" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${done ? "text-sage-deep line-through decoration-sage-deep/50" : ""}`}>{task.label}</p>
                {!done && <p className="text-xs text-muted-foreground">{TASK_HINTS[task.task_key]}</p>}
              </div>
              {!readOnly && nextTask?.id === task.id && !done ? <Button size="sm" className="rounded-full animate-pulse" onClick={() => void toggle(task)} disabled={saving !== null}>Tick it off</Button> : null}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Progress updates the customer’s booking view as you complete each step.</p>
    </Card>
  );
};
