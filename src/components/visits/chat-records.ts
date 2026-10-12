import { supabase } from "@/integrations/supabase/client";
import type { VisitData } from "./visit-data";

export type ChatMessage = VisitData["messages"][number];
export const MESSAGE_FIELDS = "id,sender_type,sender_user_id,client_message_id,body,created_at";
export const CHAT_PAGE_SIZE = 100;

export function mergeMessages(...pages: ChatMessage[][]): ChatMessage[] {
  return [...new Map(pages.flat().map(message => [message.id, message])).values()]
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** Composite cursor retains messages sharing a server timestamp. RLS remains authority. */
export async function olderMessages(bookingId: string, before: ChatMessage) {
  if (!/^[\w-]+$/.test(before.id) || !/^[\dT:.+Z-]+$/.test(before.created_at)) throw new Error("Invalid history cursor");
  const result = await supabase.from("messages").select(MESSAGE_FIELDS).eq("booking_id", bookingId)
    .or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(CHAT_PAGE_SIZE + 1);
  if (result.error) throw new Error("History could not be loaded");
  const rows = result.data ?? [];
  return { messages: rows.slice(0, CHAT_PAGE_SIZE).reverse(), hasMore: rows.length > CHAT_PAGE_SIZE };
}

export function chatClosed(status: string, cancelledAt?: string | null) {
  return Boolean(cancelledAt) || ["rated", "cancelled"].includes(status);
}

const dayFormatter = new Intl.DateTimeFormat("en-ZA", { timeZone:"Africa/Johannesburg",day:"numeric",month:"short",year:"numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-ZA", { timeZone:"Africa/Johannesburg",hour:"2-digit",minute:"2-digit",hour12:false });
export function messageTime(value: string, day = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return (day ? dayFormatter : timeFormatter).format(date);
}

/** Only the encrypted pending envelope is persisted, never a draft or decrypted message. */
export const pendingKey = (owner: string, bookingId: string) => `xoot:chat-pending:${owner}:${bookingId}`;
export const attemptKey = (owner: string, bookingId: string, id: string) => `${pendingKey(owner,bookingId)}:attempt:${id}`;
export type PendingMessage = { id: string; envelope: string; flags: string[]; legacy?: boolean };
function parsePending(value: string): PendingMessage {
  const pending = JSON.parse(value);
  if (typeof pending.id !== "string" || !/^[\w-]+$/.test(pending.id) || typeof pending.envelope !== "string" || !pending.envelope.startsWith("xoot:e2ee:v1:") || !Array.isArray(pending.flags) || pending.flags.some((flag: unknown) => typeof flag !== "string")) throw new Error("Pending message journal is unavailable");
  return { id: pending.id, envelope: pending.envelope, flags: pending.flags };
}
const sameAttempt = (a: PendingMessage, b: PendingMessage) => a.id === b.id && a.envelope === b.envelope && JSON.stringify(a.flags) === JSON.stringify(b.flags);
/** Each UUID owns its own durable record: no shared slot or mutable cross-tab index. */
export function readPendingAttempts(owner: string, bookingId: string): PendingMessage[] {
  const base = pendingKey(owner,bookingId), prefix = `${base}:attempt:`, records = new Map<string,PendingMessage>();
  const keys = Array.from({length:localStorage.length},(_,index) => localStorage.key(index)).filter((key): key is string => Boolean(key?.startsWith(prefix)));
  for (const key of keys) {
    const raw = localStorage.getItem(key); if (raw === null) continue;
    const pending = parsePending(raw);
    if (key !== attemptKey(owner,bookingId,pending.id)) throw new Error("Pending attempt identity mismatch");
    records.set(pending.id,pending);
  }
  // Preserve journals from the previous client without deleting its shared slot.
  // A per-ID receipt ignores only that exact legacy ciphertext after acknowledgement.
  const legacyRaw = localStorage.getItem(base);
  if (legacyRaw) {
    const legacy = parsePending(legacyRaw), receipt = localStorage.getItem(`${base}:ack:${legacy.id}`);
    if (!receipt || !sameAttempt(legacy,parsePending(receipt))) {
      const existing = records.get(legacy.id);
      if (existing && !sameAttempt(existing,legacy)) throw new Error("Pending attempt content mismatch");
      records.set(legacy.id,{...legacy,legacy:true});
    }
  }
  return [...records.values()];
}
export function readPending(owner: string, bookingId: string): PendingMessage | null { return readPendingAttempts(owner,bookingId)[0] ?? null; }
export function savePending(owner: string, bookingId: string, pending: PendingMessage) {
  // Do not start a send without a durable ambiguity guard; refresh must not permit duplication.
  const key = attemptKey(owner,bookingId,pending.id), value = JSON.stringify(parsePending(JSON.stringify(pending))), existing = localStorage.getItem(key);
  if (existing && !sameAttempt(parsePending(existing),pending)) throw new Error("Pending attempt is immutable");
  localStorage.setItem(key,value);
}
export function clearPending(owner: string, bookingId: string, acknowledged: PendingMessage) {
  if (acknowledged.legacy) localStorage.setItem(`${pendingKey(owner,bookingId)}:ack:${acknowledged.id}`,JSON.stringify(acknowledged));
  localStorage.removeItem(attemptKey(owner,bookingId,acknowledged.id));
}

export async function reconcileMessage(bookingId: string, owner: string, pending: PendingMessage) {
  const result = await supabase.from("messages").select(MESSAGE_FIELDS).eq("booking_id", bookingId)
    .eq("sender_user_id", owner).eq("client_message_id", pending.id).eq("body", pending.envelope).limit(2);
  if (result.error || (result.data?.length ?? 0) > 1) throw new Error("Send status could not be verified");
  return result.data?.[0] ?? null;
}
