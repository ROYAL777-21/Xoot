import type { BookingQuoteFacts } from "./booking-quote.ts";

// Structural boundary keeps this module executable in both Deno and the unit suite without
// importing a browser client or Deno's remote Supabase module. Only the Edge handler supplies it.
type QuoteReadClient = { from: (table: string) => any };
const unavailable = () => new Error("Could not verify booking benefits. Please try again.");

function expiry(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw unavailable();
  return Date.parse(value);
}

function cents(value: unknown): number {
  if ((typeof value !== "number" && typeof value !== "string") ||
      !/^\d+(?:\.\d{1,2})?$/.test(String(value))) throw unavailable();
  const result = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(result) || result < 0) throw unavailable();
  return result;
}

async function readMembership(supa: QuoteReadClient, buyerId: string, nowMs: number): Promise<boolean> {
  const { data, error } = await supa.from("user_subscriptions")
    .select("id,status,next_billing_at").eq("user_id", buyerId).eq("status", "active").maybeSingle();
  if (error) throw unavailable();
  if (!data) return false;
  if (!data.id || data.status !== "active") throw unavailable();
  const expiresAt = expiry(data.next_billing_at);
  return expiresAt === null || expiresAt > nowMs;
}

async function readCreditCents(supa: QuoteReadClient, buyerId: string, nowMs: number): Promise<number> {
  const pageSize = 500;
  let balance = 0;
  // Supabase limits a single response. Summing just its first page can omit debits and
  // overstate spendable credit. This is a quote snapshot; creation must lock/recheck the ledger.
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supa.from("xootcred_ledger")
      .select("id,amount,direction,status,expires_at").eq("user_id", buyerId)
      .in("status", ["available", "redeemed"]).order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error || !Array.isArray(data)) throw unavailable();
    for (const row of data) {
      if (!row || typeof row !== "object") throw unavailable();
      const expiresAt = expiry(row.expires_at);
      if (expiresAt !== null && expiresAt <= nowMs) continue;
      if (row.direction === "credit" && row.status === "available") balance += cents(row.amount);
      else if (row.direction === "debit" && ["available", "redeemed"].includes(row.status)) balance -= cents(row.amount);
      else if (!["pending", "expired", "cancelled", "redeemed"].includes(row.status)) throw unavailable();
      if (!Number.isSafeInteger(balance)) throw unavailable();
    }
    if (data.length < pageSize) return Math.max(0, balance);
  }
}

async function readReferral(supa: QuoteReadClient, buyerId: string, code: string) {
  if (!code) return { referralRecord: null, completedBookingCount: 0, hasPriorRedemption: false };
  const [referral, completed, redemption] = await Promise.all([
    supa.from("referrals").select("code,user_id").eq("code", code).maybeSingle(),
    supa.from("bookings").select("id", { count: "exact", head: true })
      .eq("user_id", buyerId).not("completed_at", "is", null),
    supa.from("referral_redemptions").select("id").eq("referred_user_id", buyerId).maybeSingle(),
  ]);
  if (referral.error || completed.error || redemption.error ||
      !Number.isSafeInteger(completed.count) || completed.count < 0) throw unavailable();
  if (referral.data && (typeof referral.data.user_id !== "string" || referral.data.code !== code)) throw unavailable();
  if (redemption.data && typeof redemption.data.id !== "string") throw unavailable();
  return {
    referralRecord: referral.data ? { code: referral.data.code, userId: referral.data.user_id } : null,
    completedBookingCount: completed.count,
    hasPriorRedemption: Boolean(redemption.data),
  };
}

/** Only call with the verified JWT's buyer ID and the already-normalized referral code. */
export async function loadBookingQuoteFacts(
  supa: QuoteReadClient, buyerId: string, referralCode: string, nowMs: number,
): Promise<BookingQuoteFacts> {
  if (!buyerId || !Number.isFinite(nowMs)) throw unavailable();
  const [carePlusMember, availableCreditCents, referral] = await Promise.all([
    readMembership(supa, buyerId, nowMs),
    readCreditCents(supa, buyerId, nowMs),
    readReferral(supa, buyerId, referralCode),
  ]);
  return {
    buyerId, carePlusMember, availableCreditCents, ...referral,
    // No verified insurance activation/fulfilment integration exists yet. A support-copy
    // feature flag is not evidence of coverage and cannot authorize charging a premium.
    coverAvailable: false,
  };
}
