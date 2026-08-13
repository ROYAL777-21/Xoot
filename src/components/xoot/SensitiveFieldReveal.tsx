import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

export type SensitiveAccessField =
  | "gate_code"
  | "alarm_code"
  | "access_instructions"
  | "parking_instructions"
  | "pet_notes";

type SensitiveFieldRevealProps = {
  bookingId: string;
  field: SensitiveAccessField;
  label: string;
  withinWindow: boolean;
  className?: string;
};

type SensitiveAccessResponse = {
  success?: boolean;
  error?: string;
  data?: {
    field?: string;
    value?: string | null;
    expires_in_seconds?: number;
  };
};

const REVEAL_SECONDS = 30;

export const SensitiveFieldReveal = ({
  bookingId,
  field,
  label,
  withinWindow,
  className,
}: SensitiveFieldRevealProps) => {
  const [value, setValue] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasWarned, setHasWarned] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  };

  const clearReveal = () => {
    clearTimers();
    setValue(null);
    setRemaining(0);
  };

  useEffect(() => () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  }, []);

  const startRevealTimer = (seconds: number) => {
    clearReveal();
    setRemaining(seconds);

    intervalRef.current = window.setInterval(() => {
      setRemaining((current) => Math.max(current - 1, 0));
    }, 1000);

    timeoutRef.current = window.setTimeout(() => {
      clearReveal();
    }, seconds * 1000);
  };

  const reveal = async () => {
    setError("");
    if (!hasWarned) setHasWarned(true);
    setLoading(true);
    haptic("selection");

    try {
      const { data, error } = await supabase.functions.invoke("get-sensitive-access", {
        body: { booking_id: bookingId, field },
      });
      if (error) throw error;

      const result = data as SensitiveAccessResponse | null;
      if (result?.success === false) throw new Error(result.error ?? "Sensitive access locked");

      startRevealTimer(Math.min(Number(result?.data?.expires_in_seconds ?? REVEAL_SECONDS), REVEAL_SECONDS));
      const nextValue = result?.data?.value ?? "";
      setValue(nextValue || "Not provided");
      haptic("success");
    } catch (caught) {
      clearReveal();
      haptic("warning");
      setError(caught instanceof Error ? caught.message : "Sensitive access is locked right now");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-background/72 p-3", className)}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <LockKeyhole className={cn("h-3.5 w-3.5", withinWindow ? "text-sage-deep" : "text-muted-foreground")} />
            Access information - viewing is logged
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
            withinWindow ? "bg-sage/15 text-sage-deep" : "bg-muted text-muted-foreground",
          )}
        >
          {withinWindow ? "Window open" : "Locked"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="min-h-10 flex-1 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-sm">
          {value ? (
            <span className="wrap-break-word font-semibold text-foreground">{value}</span>
          ) : (
            <span className="select-none font-display tracking-[0.24em] text-muted-foreground blur-[1px]">••••••</span>
          )}
        </div>
        {value ? (
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={clearReveal} aria-label={`Hide ${label}`}>
            <EyeOff className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-xl" disabled={loading} onClick={() => void reveal()} aria-label={`Reveal ${label}`}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {!hasWarned && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          First reveal warning: this field is logged for client safety and trust review.
        </p>
      )}
      {value && <p className="mt-2 text-[11px] font-medium text-sage-deep">Auto-hides in {remaining}s.</p>}
      {error && <p className="mt-2 text-[11px] font-medium text-destructive">{error}</p>}
    </div>
  );
};
