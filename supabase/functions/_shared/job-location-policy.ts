/** Pure checks used by job-live-location Edge; kept dependency-free for CI tests.
 * Role comes only from Supabase auth.getUser(), never from the supplied request body.
 */
export type LiveBooking = {
  id: string; user_id: string; xooter_id: string | null; status: string;
  cancelled_at?: string | null; sensitive_data_revoked_at?: string | null;
};
export type LiveJob = {
  id: string; booking_id: string; xooter_id: string; state: string;
};
export type LiveWorker = {
  id: string; user_id: string | null; active: boolean;
  background_check_status: string | null;
};
export type LivePositionInput = {
  latitude: number; longitude: number; accuracy_m: number;
  sharingConsent: boolean;
};

export const isActiveLocationJob = (booking: LiveBooking, job: LiveJob, worker: LiveWorker): boolean =>
  ['en_route', 'enroute'].includes(booking.status) &&
  !booking.cancelled_at && !booking.sensitive_data_revoked_at &&
  job.state === 'accepted' && job.booking_id === booking.id &&
  job.xooter_id === booking.xooter_id && worker.id === job.xooter_id &&
  worker.active === true && worker.background_check_status === 'approved';

export const canReadJobPosition = (actorId: string, booking: LiveBooking, job: LiveJob, worker: LiveWorker): boolean =>
  isActiveLocationJob(booking, job, worker) &&
  (actorId === booking.user_id || actorId === worker.user_id);

export const canPublishJobPosition = (actorId: string, booking: LiveBooking, job: LiveJob, worker: LiveWorker): boolean =>
  isActiveLocationJob(booking, job, worker) && actorId === worker.user_id;

export const validWorkerLocation = (value: unknown): value is LivePositionInput => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return payload.sharingConsent === true &&
    typeof payload.latitude === 'number' && Number.isFinite(payload.latitude) &&
    payload.latitude >= -35 && payload.latitude <= -22 &&
    typeof payload.longitude === 'number' && Number.isFinite(payload.longitude) &&
    payload.longitude >= 16 && payload.longitude <= 33.5 &&
    typeof payload.accuracy_m === 'number' && Number.isFinite(payload.accuracy_m) &&
    payload.accuracy_m >= 1 && payload.accuracy_m <= 200;
};

export const freshLivePosition = (receivedAt: string, expiresAt: string, nowMs: number): boolean => {
  const received = Date.parse(receivedAt);
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(received) && Number.isFinite(expiry) &&
    received <= nowMs + 5000 && received >= nowMs - 60_000 && expiry > nowMs && expiry <= nowMs + 120_000;
};
