/** Source-aligned Xooter presentation; server/RLS own authorisation and amounts. */
export type XooterJobCard = {
  job_id: string; booking_id: string; xooter_id: string; state: string;
  service: string | null; service_type: string | null; scheduled_at: string | null;
  duration_hours: number | null; status: string | null; offered_at: string | null;
};
export type XooterEarning = {
  id: string; xooter_id: string; booking_id: string; net_amount: number;
  gross_amount: number; platform_fee: number; status: string; created_at: string;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const dateOrNull = (value: unknown): string | null =>
  typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
export const xooterMoney = (value: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(value);

export function parseXooterJobCards(payload: unknown, xooterId: string): XooterJobCard[] | null {
  if (!isRecord(payload) || !Array.isArray(payload.jobs)) return null;
  const result: XooterJobCard[] = [];
  for (const raw of payload.jobs) {
    if (!isRecord(raw) || typeof raw.job_id !== 'string' || typeof raw.booking_id !== 'string' ||
        raw.xooter_id !== xooterId || typeof raw.state !== 'string') return null;
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
  const total = rows.reduce((sum, row) => sum + row.net_amount, 0);
  const pending = rows.filter(row => row.status === 'pending')
    .reduce((sum, row) => sum + row.net_amount, 0);
  // Never label an amount "paid out" from a gross/net ledger without a payout receipt.
  return { recordedNet: total, pendingNet: pending, entries: rows.length };
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
  if (!isRecord(raw) || raw.xooter_id !== ownerId || typeof raw.id !== 'string' ||
      typeof raw.booking_id !== 'string' || !finite(raw.net_amount) || !finite(raw.gross_amount) ||
      !finite(raw.platform_fee) || typeof raw.status !== 'string' || !dateOrNull(raw.created_at)) return null;
  return {
    id: raw.id, xooter_id: ownerId, booking_id: raw.booking_id,
    net_amount: raw.net_amount, gross_amount: raw.gross_amount, platform_fee: raw.platform_fee,
    status: raw.status, created_at: raw.created_at as string,
  };
}
