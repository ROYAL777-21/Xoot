import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Circle, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user, loading } = useAuth();
  if (loading) return <Card className="rounded-3xl p-5"><p role="status">Loading checklist…</p></Card>;
  if (!user) return <Card className="rounded-3xl p-5"><p role="status">Sign in to view the visit checklist.</p></Card>;
  return <AccountChecklist key={`${user.id}/${jobId}/${bookingId}`} ownerId={user.id} jobId={jobId} bookingId={bookingId} readOnly={readOnly} />;
};

const AccountChecklist = ({ ownerId, jobId, bookingId, readOnly }: { ownerId: string; jobId: string; bookingId: string; readOnly: boolean }) => {
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const mounted = useRef(true);
  const requestVersion = useRef(0);
  const savingNow = useRef(false);

  const load = useCallback(async () => {
    if (!mounted.current) return;
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const { data, error: lookupError } = await supabase.from("xooter_job_checklist")
        .select("id,task_key,label,position,completed_at")
        .eq("job_id", jobId)
        .eq("booking_id", bookingId)
        .order("position");
      if (!mounted.current || version !== requestVersion.current) return;
      if (lookupError) throw lookupError;
      setTasks(data ?? []);
    } catch {
      if (!mounted.current || version !== requestVersion.current) return;
      setTasks([]);
      setError("The visit checklist is unavailable. Try again shortly.");
    } finally {
      if (mounted.current && version === requestVersion.current) setLoading(false);
    }
  }, [bookingId, jobId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; };
  }, [load]);

  const completed = useMemo(() => tasks.filter((task) => Boolean(task.completed_at)).length, [tasks]);
  const nextTask = tasks.find((task) => !task.completed_at);

  const toggle = async (task: ChecklistTask) => {
    if (readOnly || savingNow.current || !mounted.current || loading || error) return;
    savingNow.current = true;
    setSaving(task.task_key);
    setActionError(null);
    haptic(task.completed_at ? "selection" : "success");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!mounted.current) return;
      if (sessionError || sessionData.session?.user.id !== ownerId || !sessionData.session.access_token) {
        setActionError("Sign in again before updating the checklist.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("xooter-job-checklist", {
        body: { jobId, taskKey: task.task_key, complete: !task.completed_at },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      if (!mounted.current) return;
      if (error) throw error;
      const saved = data?.task as ChecklistTask | undefined;
      if (data?.ok && saved) setTasks((current) => current.map((item) => item.id === saved.id ? { ...item, ...saved } : item));
      else await load();
    } catch {
      if (mounted.current) setActionError("The checklist could not be updated. Refresh and try again.");
    } finally {
      savingNow.current = false;
      if (mounted.current) setSaving(null);
    }
  };

  if (loading) return <Card className="rounded-3xl p-5"><p role="status">Loading checklist…</p></Card>;
  if (error) return <Card className="rounded-3xl p-5"><p role="alert">{error}</p><Button variant="outline" onClick={() => void load()}>Try again</Button></Card>;
  if (tasks.length === 0) return <Card className="rounded-3xl p-5"><p role="status">No checklist tasks are available for this visit yet.</p><Button variant="outline" onClick={() => void load()}>Refresh checklist</Button></Card>;

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
              <button type="button" disabled={readOnly || saving !== null} onClick={() => void toggle(task)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background transition-transform active:scale-95 disabled:cursor-default" aria-label={`${done ? "Uncheck" : "Complete"} ${task.label}`}>
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
      {actionError && <div role="alert"><p>{actionError}</p><Button variant="outline" onClick={() => void load()} disabled={saving !== null}>Refresh checklist</Button></div>}
      <p className="mt-3 text-xs text-muted-foreground">Progress updates the customer’s booking view as you complete each step.</p>
    </Card>
  );
};
