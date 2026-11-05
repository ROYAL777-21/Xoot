import { supabase } from "@/integrations/supabase/client";

/**
 * Cached reader for the signed-in user's `user_roles` rows.
 *
 * Notification deep links are role-routed (see `notification-routing.ts`), and three separate
 * surfaces needed the same lookup on every tap: the bell, the push-tap layer, and the push
 * registration prompt. One cached loader instead of three ad-hoc queries, because a role that
 * loads differently in two of them is a route that opens for one and not the other — the kind
 * of drift this repo has shipped before.
 *
 * The cache is short (60s): a freshly approved Xooter should not wait a session for their
 * notification taps to route to the Xooter portal. On any error the caller gets `["user"]` —
 * the least-privilege answer, which leaves deep links unrewritten rather than guessing.
 */

const CACHE_TTL_MS = 60_000;

let cache: { userId: string | null; roles: string[]; loadedAt: number } = {
  userId: null,
  roles: [],
  loadedAt: 0,
};

export const loadCurrentUserRoles = async (userId: string | null | undefined): Promise<string[]> => {
  if (!userId) return [];

  const now = Date.now();
  if (cache.userId === userId && now - cache.loadedAt < CACHE_TTL_MS) return cache.roles;

  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw error;
    const roles = (data ?? []).map((row) => String(row.role)).filter(Boolean);
    cache = { userId, roles, loadedAt: now };
    return roles;
  } catch {
    // Least-privilege fallback: treat as a plain user, never as admin/xooter.
    return ["user"];
  }
};

/** Test hook — the cache is module state and tests need to reset it between cases. */
export const resetUserRoleCache = () => {
  cache = { userId: null, roles: [], loadedAt: 0 };
};
