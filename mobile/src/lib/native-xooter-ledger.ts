/** Source-aligned Xooter presentation; server/RLS own authorisation and amounts. */
export type XooterJobCard = {
  job_id: string; booking_id: string; xooter_id: string; state: string;
  service: string | null; service_type: string | null; scheduled_at: string | null;
  duration_hours: number | null; status: string | null; offered_at: string | null;
};
export type XooterEarning = {
  id: string; xooter_id: string; booking_id: string | null; net_amount: number;
  gross_amount: number; platform_fee: number; status: string; created_at: string;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const dateOrNull = (value: unknown): string | null =>
  typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
/**
 * Safe exact-cent presentation. PostgreSQL numeric values arrive as JS numbers;
 * only values representable to two decimal places may appear as money.
 */
export function xooterCents(value: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const scaled = value * 100;
  const rounded = Math.round(scaled);
  return Number.isSafeInteger(rounded) && Math.abs(scaled - rounded) < 0.000001 ? rounded : null;
}
export const XOOTER_EARNINGS_PAGE_SIZE = 50;
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isXooterJobId = (value: unknown): value is string => typeof value === 'string' && idPattern.test(value);
/** Strict, injection-safe ISO timestamp, preserving database microseconds.
 * Date.toISOString() truncates PostgreSQL's six-digit fractional seconds and
 * can skip or duplicate records at a keyset page boundary.
 */
const sqlTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
function validSqlTimestamp(value: unknown): value is string {
  return typeof value === 'string' && sqlTimestampPattern.test(value) &&
    Number.isFinite(Date.parse(value));
}
function timestampMicros(value: string): number {
  const milliseconds = Date.parse(value);
  const fraction = /\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/.exec(value)?.[1] ?? '';
  const micros = Number(fraction.padEnd(6, '0')) % 1000;
  return milliseconds * 1000 + micros;
}
/** Safe PostgREST keyset filter from a previously validated DB row. */
export function olderXooterEarningsFilter(row: Pick<XooterEarning, 'created_at' | 'id'>) {
  if (!idPattern.test(row.id) || !validSqlTimestamp(row.created_at)) return null;
  // Keep the full DB precision, and normalise only timestamps with no fraction
  // to maintain the existing stable cursor contract.
  const timestamp = row.created_at.includes('.') ? row.created_at : new Date(row.created_at).toISOString();
  return `created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${row.id})`;
}
/** Reject duplicate, unordered, out-of-window or mixed-owner money pages.
 * Never sum rows until the whole page passes the exact server ordering check.
 */
export function validateXooterEarningsPage(
  rows: readonly XooterEarning[],
  args: { owner: string; from: string; snapshot: string; cursor?: Pick<XooterEarning, 'created_at' | 'id'> },
): boolean {
  if (rows.length > XOOTER_EARNINGS_PAGE_SIZE + 1 ||
      !validSqlTimestamp(args.from) || !validSqlTimestamp(args.snapshot)) return false;
  const start = timestampMicros(args.from);
  const finish = timestampMicros(args.snapshot);
  if (start > finish) return false;
  let prior: Pick<XooterEarning, 'created_at' | 'id'> | undefined = args.cursor;
  if (prior && (!idPattern.test(prior.id) || !validSqlTimestamp(prior.created_at))) return false;
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.xooter_id !== args.owner || !idPattern.test(row.id) ||
        !validSqlTimestamp(row.created_at) || seen.has(row.id.toLowerCase())) return false;
    const moment = timestampMicros(row.created_at);
    if (moment < start || moment > finish) return false;
    if (prior) {
      const previous = timestampMicros(prior.created_at);
      // DB order is created_at DESC, id DESC. Identical millisecond timestamps
      // may differ in microseconds, which must be compared before UUID order.
      if (moment > previous || (moment === previous &&
        row.id.toLowerCase() >= prior.id.toLowerCase())) return false;
    }
    seen.add(row.id.toLowerCase());
    prior = row;
  }
  return true;
}
export const xooterMoney = (value: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(value);

export function parseXooterJobCards(payload: unknown, xooterId: string): XooterJobCard[] | null {
  // The deployed Edge function responds { success: true, data: { jobs } }.
  // Never accept a failed envelope or a forged cross-worker row.
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data) ||
      !Array.isArray(payload.data.jobs)) return null;
  if (payload.data.jobs.length > 500) return null;
  const result: XooterJobCard[] = [];
  const seen = new Set<string>();
  for (const raw of payload.data.jobs) {
    if (!isRecord(raw)) return null;
    const jobId = raw.job_id;
    const bookingId = raw.booking_id;
    const state = raw.state;
    if (typeof jobId !== 'string' || typeof bookingId !== 'string' ||
        raw.xooter_id !== xooterId || typeof state !== 'string' ||
        !['offered', 'accepted', 'declined', 'expired', 'completed'].includes(state)) return null;
    if (seen.has(jobId)) return null;
    seen.add(jobId);
    result.push({
      job_id: jobId, booking_id: bookingId, xooter_id: xooterId, state,
      service: typeof raw.service === 'string' ? raw.service : null,
      service_type: typeof raw.service_type === 'string' ? raw.service_type : null,
      scheduled_at: dateOrNull(raw.scheduled_at),
      offered_at: dateOrNull(raw.offered_at),
      duration_hours: finite(raw.duration_hours) && raw.duration_hours >= 0 ? raw.duration_hours : null,
      status: typeof raw.status === 'string' ? raw.status : null,
    });
  }
  return result;
}
export const groupXooterJobs = (jobs: XooterJobCard[]) => ({
  offered: jobs.filter(job => job.state === 'offered'),
  accepted: jobs.filter(job => job.state === 'accepted'),
  history: jobs.filter(job => job.state !== 'offered' && job.state !== 'accepted'),
});
export function summariseRecordedEarnings(rows: XooterEarning[]) {
  let totalCents = 0;
  let pendingCents = 0;
  for (const row of rows) {
    const cents = xooterCents(row.net_amount);
    if (cents === null || !Number.isSafeInteger(totalCents + cents)) {
      throw new Error('Invalid precision or overflow in the earnings ledger');
    }
    totalCents += cents;
    if (row.status === 'pending') {
      if (!Number.isSafeInteger(pendingCents + cents)) throw new Error('Earnings ledger overflow');
      pendingCents += cents;
    }
  }
  // Never label a net ledger amount "paid out" without bank-settlement evidence.
  return { recordedNet: totalCents / 100, pendingNet: pendingCents / 100, entries: rows.length };
}
export function startOfNativeEarningsPeriod(period: 'week' | 'month', now = new Date()) {
  const date = new Date(now);
  if (period === 'week') {
    // An exact rolling 7-day period in UTC. Avoid pretending to follow payout cut-offs.
    date.setUTCDate(date.getUTCDate() - 7);
  } else {
    date.setUTCDate(date.getUTCDate() - 30);
  }
  return date.toISOString();
}
export function getXooterEarningsRow(raw: unknown, ownerId: string): XooterEarning | null {
  if (!isRecord(raw) || raw.xooter_id !== ownerId ||
      typeof raw.id !== 'string' || !idPattern.test(raw.id) ||
      // The production column is nullable. Non-booking adjustments are valid
      // ledger entries and must not cause the entire worker statement to fail.
      !(raw.booking_id === null ||
        (typeof raw.booking_id === 'string' && idPattern.test(raw.booking_id))) ||
      !finite(raw.net_amount) || !finite(raw.gross_amount) || !finite(raw.platform_fee) ||
      xooterCents(raw.net_amount) === null || xooterCents(raw.gross_amount) === null ||
      xooterCents(raw.platform_fee) === null ||
      typeof raw.status !== 'string' || !dateOrNull(raw.created_at)) return null;
  return {
    id: raw.id, xooter_id: ownerId, booking_id: raw.booking_id,
    net_amount: raw.net_amount, gross_amount: raw.gross_amount, platform_fee: raw.platform_fee,
    status: raw.status, created_at: raw.created_at as string,
  };
}
