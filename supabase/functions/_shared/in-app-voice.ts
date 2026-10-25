/** Voice identities are minted by Xoot, then returned in Twilio's signed From field. */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isVoiceId = (value: unknown): value is string => typeof value === "string" && uuid.test(value);
export const voiceIdentity = (actorId: string, bookingId: string) => {
  if (!isVoiceId(actorId) || !isVoiceId(bookingId)) throw new Error("Invalid voice identity");
  return `xoot_${actorId.replaceAll("-", "").toLowerCase()}_${bookingId.replaceAll("-", "").toLowerCase()}_voice`;
};
const expandUuid = (value: string) => `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;

export function boundVoiceCaller(form: FormData, accountSid: string) {
  if (!["From", "bookingId", "AccountSid", "CallSid"].every(key => form.getAll(key).length === 1) || form.getAll("Caller").length > 1) return null;
  const from = form.get("From");
  const bookingId = form.get("bookingId");
  if (typeof from !== "string" || !isVoiceId(bookingId) || !/^AC[0-9a-f]{32}$/i.test(accountSid) || form.get("AccountSid") !== accountSid || !/^CA[0-9a-f]{32}$/i.test(String(form.get("CallSid")))) return null;
  if (form.has("Caller") && form.get("Caller") !== from) return null;
  const parts = /^client:xoot_([0-9a-f]{32})_([0-9a-f]{32})_voice$/.exec(from);
  if (!parts || parts[2] !== bookingId.replaceAll("-", "").toLowerCase()) return null;
  return { actorId: expandUuid(parts[1]), bookingId: expandUuid(parts[2]) };
}

type VoiceDb = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
export async function activeVoiceWindow(db: VoiceDb, bookingId: string, actorId: string, now = Date.now()) {
  if (!isVoiceId(bookingId) || !isVoiceId(actorId)) return null;
  try {
    const { data, error } = await db.rpc("can_create_masked_call", { p_booking_id: bookingId, p_actor_id: actorId });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row || typeof row !== "object" || !("allowed" in row) || row.allowed !== true || !("participant_role" in row) || !["client", "contractor"].includes(String(row.participant_role)) || !("eligible_until" in row) || typeof row.eligible_until !== "string") return null;
    const remaining = Math.floor((Date.parse(row.eligible_until) - now) / 1000);
    if (!Number.isFinite(remaining) || remaining < 1) return null;
    return { role: String(row.participant_role), seconds: Math.min(300, remaining) };
  } catch { return null; }
}
