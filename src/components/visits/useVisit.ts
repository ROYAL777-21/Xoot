import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadVisit, type VisitData } from "./visit-data";

/** Keyed account/booking boundary. Lifecycle tokens also invalidate StrictMode remount work. */
export function useVisit(id: string, owner: string) {
  const scope = useRef({ mounted: false, lifecycle: 0, request: 0, saving: false, loaded: false });
  const [data, setData] = useState<VisitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const isCurrent = useCallback(() => scope.current.mounted, []);
  const refresh = useCallback(async () => {
    const lifecycle = scope.current.lifecycle, request = ++scope.current.request;
    const active = () => scope.current.mounted && scope.current.lifecycle === lifecycle && scope.current.request === request;
    if (!active()) return;
    if (!scope.current.loaded) setLoading(true); setError(null);
    try {
      const next = await loadVisit(id, owner);
      if (active()) { scope.current.loaded = true; setData(next); return next; }
    } catch { if (active()) { setData(null); setError("This visit could not be loaded. Please try again."); } }
    finally { if (active()) setLoading(false); }
  }, [id, owner]);
  useEffect(() => {
    const lifetime = scope.current;
    lifetime.mounted = true;
    void refresh();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel(`visit:${owner}:${id}`);
    const lifecycle = scope.current.lifecycle;
    const changed = () => {
      if (!scope.current.mounted || scope.current.lifecycle !== lifecycle) return;
      clearTimeout(timer);
      timer = setTimeout(() => { if (scope.current.mounted && scope.current.lifecycle === lifecycle) void refresh(); }, 150);
    };
    for (const table of ["bookings", "messages", "booking_status_events", "xooter_job_checklist", "xooter_jobs", "booking_completion_photos", "post_job_reviews", "payment_records"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `${table === "bookings" ? "id" : "booking_id"}=eq.${id}` }, changed);
    }
    channel.subscribe();
    return () => { lifetime.mounted = false; lifetime.lifecycle++; clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [id, owner, refresh]);

  const authorization = useCallback(async () => {
    const lifecycle = scope.current.lifecycle;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (!scope.current.mounted || lifecycle !== scope.current.lifecycle) throw new Error("Visit account changed");
    const session = sessionData.session;
    if (sessionError || session?.user.id !== owner || !session.access_token) throw new Error("Sign in again before saving.");
    return { Authorization: `Bearer ${session.access_token}` };
  }, [owner]);
  const invoke = useCallback(async <T,>(name: string, body: Record<string, unknown>): Promise<T> => {
    const headers = await authorization();
    const lifecycle = scope.current.lifecycle;
    const result = await supabase.functions.invoke(name, { body, headers });
    if (!scope.current.mounted || lifecycle !== scope.current.lifecycle) throw new Error("Visit account changed");
    if (result.error || (name !== "create-payment-session" && (result.data?.error || result.data?.success === false))) throw new Error("This action could not be completed. Please retry or contact support.");
    return result.data as T;
  }, [authorization]);
  const act = async (work: () => Promise<string | null>) => {
    if (!scope.current.mounted || scope.current.saving) return;
    const lifecycle = scope.current.lifecycle;
    scope.current.saving = true; setBusy(true); setActionMessage(null);
    try {
      const message = await work();
      if (scope.current.mounted && lifecycle === scope.current.lifecycle) setActionMessage(message);
    } catch (failure) {
      if (scope.current.mounted && lifecycle === scope.current.lifecycle) setActionMessage(failure instanceof Error ? failure.message : "Unable to save. Please retry.");
    } finally {
      if (scope.current.mounted && lifecycle === scope.current.lifecycle) { scope.current.saving = false; setBusy(false); }
    }
  };
  return { data, loading, error, busy, actionMessage, refresh, invoke, authorization, isCurrent, act, setData };
}
