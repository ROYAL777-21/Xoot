import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type NotificationRecord = Pick<Tables<"notifications">, "id" | "kind" | "title" | "body" | "link" | "read" | "created_at">;
export const NOTIFICATION_PAGE_SIZE = 20;
const fields = "id,kind,title,body,link,read,created_at";
export async function loadNotificationPage(owner: string, before?: NotificationRecord) {
  let query = supabase.from("notifications").select(fields).eq("user_id", owner)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(NOTIFICATION_PAGE_SIZE);
  if (before) {
    // Both cursor values originate from typed database records, never URL input.
    if (!/^[0-9a-f-]{36}$/i.test(before.id) || !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(before.created_at)) throw new Error("Invalid notification cursor");
    query = query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
  }
  const { data, error } = await query;
  if (error || !data) throw new Error("Notifications could not be loaded.");
  return data;
}
export async function loadNotificationCount(owner: string) {
  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", owner).eq("read", false);
  if (error || count === null) throw new Error("Unread count could not be loaded.");
  return count;
}
export async function markNotificationRead(owner: string, id: string) {
  const { data, error } = await supabase.from("notifications").update({ read: true }).eq("user_id", owner).eq("id", id).select("id").maybeSingle();
  if (error || data?.id !== id) throw new Error("This notification could not be marked read. Please try again.");
}
export async function markAllNotificationsRead(owner: string) {
  const { count, error } = await supabase.from("notifications").update({ read: true }, { count: "exact" }).eq("user_id", owner).eq("read", false);
  if (error || count === null) throw new Error("Notifications could not be marked read. Please try again.");
}
export function formatNotificationTimestamp(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date) : "Time unavailable";
}

/** Compact source-style labels derived exclusively from the record's actual timestamp. */
export function formatNotificationTime(value: string, now = Date.now()) {
  const date = new Date(value), timestamp = date.getTime();
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return "Time unavailable";
  const seconds = (now - timestamp) / 1000;
  if (seconds < 0) {
    const ahead = -seconds;
    if (ahead < 7 * 86400) return ahead < 60 ? "In <1 min" : ahead < 3600 ? `In ${Math.ceil(ahead / 60)} min` : ahead < 86400 ? `In ${Math.ceil(ahead / 3600)} h` : `In ${Math.ceil(ahead / 86400)} days`;
  }
  if (seconds >= 0 && seconds < 60) return "Just now";
  if (seconds >= 0 && seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds >= 0 && seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" });
  if (dayFormat.format(date) === dayFormat.format(new Date(now - 86400_000))) return "Yesterday";
  if (seconds >= 0 && seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} days ago`;
  const yearFormat = new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", year: "numeric" });
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short", ...(yearFormat.format(date) === yearFormat.format(new Date(now)) ? {} : { year: "numeric" }) }).format(date);
}
