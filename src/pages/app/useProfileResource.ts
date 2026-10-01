import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Resource<T> = { key: string | null; data: T | null; status: "loading" | "ready" | "error"; error: string | null };

/** Render identity is checked synchronously as well as in effects, including auth-pending. */
export function useProfileResource<T>(load: (owner: string) => Promise<T>, suffix = "") {
  const { user, loading } = useAuth();
  const owner = loading ? null : user?.id ?? null;
  const key = owner ? `${owner}:${suffix}` : null;
  const identity = useRef({ key, version: 0 });
  if (identity.current.key !== key) identity.current = { key, version: identity.current.version + 1 };
  const version = identity.current.version;
  const request = useRef(0);
  const mounted = useRef(false);
  const [state, setState] = useState<Resource<T>>({ key: null, data: null, status: "loading", error: null });
  const isCurrent = useCallback(() => mounted.current && identity.current.key === key && identity.current.version === version && key !== null, [key, version]);
  const refresh = useCallback(async () => {
    if (!owner || !isCurrent()) return;
    const sequence = ++request.current;
    setState({ key, data: null, status: "loading", error: null });
    try {
      const data = await load(owner);
      if (isCurrent() && sequence === request.current) setState({ key, data, status: "ready", error: null });
    } catch {
      if (isCurrent() && sequence === request.current) setState({ key, data: null, status: "error", error: "These details could not be loaded. Please try again." });
    }
  }, [owner, key, load, isCurrent]);
  useEffect(() => { const requests = request; mounted.current = true; return () => { mounted.current = false; ++requests.current; }; }, []);
  useEffect(() => { void refresh(); const requests = request; return () => { ++requests.current; }; }, [refresh]);
  const visible = key !== null && state.key === key ? state : { key, data: null, status: "loading" as const, error: null };
  return { ...visible, owner, authLoading: loading, refresh, isCurrent };
}

export function useConfirmedSave(isCurrent: () => boolean) {
  const scopeRef = useRef({ guard: isCurrent, busy: false });
  if (scopeRef.current.guard !== isCurrent) scopeRef.current = { guard: isCurrent, busy: false };
  const scope = scopeRef.current;
  const mounted = useRef(false);
  const [state, setState] = useState({ scope, saving: false, error: null as string | null });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const submit = async (write: () => Promise<unknown>, onSaved: () => void) => {
    if (scope.busy || !isCurrent() || !mounted.current) return;
    scope.busy = true;
    setState({ scope, saving: true, error: null });
    try {
      await write();
      if (mounted.current && isCurrent()) onSaved();
    } catch (failure) {
      if (mounted.current && isCurrent()) setState({ scope, saving: false, error: failure instanceof Error ? failure.message : "Your changes were not saved. Please try again." });
    } finally {
      scope.busy = false;
      if (mounted.current && isCurrent()) setState(current => ({ ...current, saving: false }));
    }
  };
  return { saving: state.scope === scope && state.saving, error: state.scope === scope ? state.error : null, submit };
}
