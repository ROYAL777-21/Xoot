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
/** PostgreSQL numeric amounts are rand values, not integer cents.
 * Reject fractional cents and unsafe magnitudes instead of silently displaying
 * rounded sums as verified earnings.
 */
export function exactRandCents(value: unknown): number | null {
  if (!finite(value)) return null;
  const scaled = value * 100;
  if (!Number.isSafeInteger(Math.round(scaled)) ||
    Math.abs(scaled - Math.round(scaled)) > 0.000001) return null;
  return Math.round(scaled);
}
const dateOrNull = (value: unknown): string | null =>
  typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
export const xooterMoney = (value: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(value);

export function parseXooterJobCards(payload: unknown, xooterId: string): XooterJobCard[] | null {
  // The deployed Edge function responds { success: true, data: { jobs } }.
  // Never accept a failed envelope or a forged cross-worker row.
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data) ||
      !Array.isArray(payload.data.jobs)) return null;
  if (payload.data.jobs.length > 500) return null;
  const result: XooterJobCard[] = [];
  const seenJobs = new Set<string>();
  for (const raw of payload.data.jobs) {
    if (!isRecord(raw) || typeof raw.job_id !== 'string' || typeof raw.booking_id !== 'string' ||
        raw.xooter_id !== xooterId ||
        !['offered', 'accepted', 'declined', 'expired', 'completed'].includes(String(raw.state)) ||
        seenJobs.has(raw.job_id)) return null;
    seenJobs.add(raw.job_id);
    result.push({
      job_id: raw.job_id, booking_id: raw.booking_id, xooter_id: xooterId, state: raw.state,
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
  // Financial totals must accumulate *integer cents*, not floating point rand.
  // Rows reaching here were validated by getXooterEarningsRow.
  const netCents = rows.reduce((sum, row) => sum + (exactRandCents(row.net_amount) ?? 0), 0);
  const pendingCents = rows.filter(row => row.status === 'pending')
    .reduce((sum, row) => sum + (exactRandCents(row.net_amount) ?? 0), 0);
  // A ledger row never independently proves bank settlement.
  return { recordedNet: netCents / 100, pendingNet: pendingCents / 100, entries: rows.length };
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
  // booking_id is nullable in the live production schema; do not discard valid
  // manual/adjustment ledger entries solely because they lack a booking ref.
  if (!isRecord(raw) || raw.xooter_id !== ownerId || typeof raw.id !== 'string' ||
      !(raw.booking_id === null || typeof raw.booking_id === 'string') ||
      exactRandCents(raw.net_amount) === null ||
      exactRandCents(raw.gross_amount) === null ||
      exactRandCents(raw.platform_fee) === null ||
      typeof raw.status !== 'string' || !dateOrNull(raw.created_at)) return null;
  return {
    id: raw.id, xooter_id: ownerId, booking_id: raw.booking_id,
    net_amount: raw.net_amount as number, gross_amount: raw.gross_amount as number,
    platform_fee: raw.platform_fee as number,
    status: raw.status, created_at: raw.created_at as string,
  };
}
