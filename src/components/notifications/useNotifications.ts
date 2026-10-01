import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { loadNotificationCount, loadNotificationPage, markAllNotificationsRead, markNotificationRead, NOTIFICATION_PAGE_SIZE, type NotificationRecord } from "./notification-data";

type Scope = { owner: string | null; mounted: boolean; busy: boolean; dirty: boolean; pages: number; lifecycle: number };
type State = { scope: Scope; items: NotificationRecord[]; count: number | null; loading: boolean; more: boolean; busy: boolean; error: string | null; pageError: string | null; actionError: string | null };
const initial = (scope: Scope): State => ({ scope, items: [], count: null, loading: true, more: false, busy: false, error: null, pageError: null, actionError: null });

/** Each rendered identity gets its own scope, including A → B → A and auth-pending. */
export function useNotifications(feed = true) {
  const { user, loading: authLoading } = useAuth();
  const owner = authLoading ? null : user?.id ?? null;
  const scopeRef = useRef<Scope>({ owner, mounted: false, busy: false, dirty: false, pages: 1, lifecycle: 0 });
  if (scopeRef.current.owner !== owner) scopeRef.current = { owner, mounted: false, busy: false, dirty: false, pages: 1, lifecycle: 0 };
  const scope = scopeRef.current;
  const [state, setState] = useState(() => initial(scope));
  const stateRef = useRef(state); stateRef.current = state;
  const current = useCallback(() => scopeRef.current === scope && scope.mounted && owner !== null, [scope, owner]);
  const refresh = useCallback(async () => {
    if (!current() || !owner) return;
    if (scope.busy) { scope.dirty = true; return; }
    scope.busy = true; scope.dirty = false;
    const lifecycle = scope.lifecycle;
    const active = () => current() && scope.lifecycle === lifecycle;
    setState(previous => ({ ...(previous.scope === scope ? previous : initial(scope)), busy: true, error: null }));
    try {
      const pages = async () => {
        const items: NotificationRecord[] = []; let more = false;
        if (feed) for (let page = 0; page < scope.pages; page++) {
          if (!active()) return { items, more };
          const next = await loadNotificationPage(owner, items[items.length - 1]);
          items.push(...next); more = next.length === NOTIFICATION_PAGE_SIZE;
          if (!more) break;
        }
        return { items, more };
      };
      // Keep the lock until both requests settle, even if one fails first.
      const [countResult, pageResult] = await Promise.allSettled([loadNotificationCount(owner), pages()]);
      if (countResult.status === "rejected" || pageResult.status === "rejected") throw new Error("Refresh failed");
      const count = countResult.value, result = pageResult.value;
      if (active()) setState(previous => ({ ...previous, scope, ...result, count, loading: false, busy: false, error: null, pageError: null }));
    } catch {
      if (active()) setState(previous => ({ ...(previous.scope === scope ? previous : initial(scope)), loading: false, busy: false, error: "Notifications could not be refreshed. Please try again." }));
    } finally { scope.busy = false; if (current() && scope.dirty) void refresh(); }
  }, [current, owner, scope, feed]);
  useEffect(() => {
    scope.mounted = true; void refresh();
    if (!owner) return () => { scope.mounted = false; scope.lifecycle++; };
    const channel = supabase.channel(`notifications-${owner}`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const changed = () => { if (!current()) return; clearTimeout(timer); timer = setTimeout(() => { if (current()) void refresh(); }, 150); };
    for (const event of ["INSERT", "UPDATE"] as const) channel.on("postgres_changes", { event, schema: "public", table: "notifications", filter: `user_id=eq.${owner}` }, changed);
    channel.subscribe();
    return () => { scope.mounted = false; scope.lifecycle++; clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [scope, owner, refresh, current]);
  const loadMore = async () => {
    const visible = stateRef.current;
    if (!current() || !owner || scope.busy || visible.scope !== scope || !visible.more) return;
    const lifecycle = scope.lifecycle;
    const active = () => current() && scope.lifecycle === lifecycle;
    scope.busy = true; setState(previous => ({ ...previous, busy: true, pageError: null }));
    try {
      const next = await loadNotificationPage(owner, visible.items[visible.items.length - 1]);
      if (active()) {
        scope.pages++;
        setState(previous => ({ ...previous, items: [...previous.items, ...next.filter(item => !previous.items.some(existing => existing.id === item.id))], more: next.length === NOTIFICATION_PAGE_SIZE, busy: false }));
      }
    } catch { if (active()) setState(previous => ({ ...previous, busy: false, pageError: "Older notifications could not be loaded. Please try again." })); }
    finally { scope.busy = false; if (current() && scope.dirty) void refresh(); }
  };
  const markRead = async (id?: string): Promise<boolean> => {
    if (!current() || !owner || scope.busy) return false;
    const lifecycle = scope.lifecycle;
    const active = () => current() && scope.lifecycle === lifecycle;
    scope.busy = true; setState(previous => ({ ...previous, busy: true, actionError: null }));
    let confirmed = false;
    try {
      if (id) await markNotificationRead(owner, id); else await markAllNotificationsRead(owner);
      confirmed = active();
    } catch { if (active()) setState(previous => ({ ...previous, actionError: "Notifications could not be marked read. Please try again." })); }
    finally {
      scope.busy = false;
      if (current()) {
        setState(previous => ({ ...previous, busy: false }));
        if (confirmed || scope.dirty) void refresh();
      }
    }
    return confirmed && active();
  };
  const visible = state.scope === scope ? state : initial(scope);
  return { ...visible, owner, authLoading, refresh, loadMore, markRead, isCurrent: current };
}
