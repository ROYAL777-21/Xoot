/** The authenticated Xooter job-card Edge endpoint returns {success,data:{jobs}}.
 * Its privileged SQL response contains private customer fields; project only
 * what the worker UI needs and never retain user_id or revealed gate codes.
 */
export type WebXooterJob = {
  id: string;
  booking_id: string;
  xooter_id: string;
  state: 'offered' | 'accepted' | 'declined' | 'expired' | 'completed';
  offered_at: string | null;
  responded_at: string | null;
  decline_reason: string | null;
  destination_address: string | null;
  bookings: {
    id: string;
    service: string | null;
    service_type: string | null;
    scheduled_at: string | null;
    duration_hours: number | null;
    status: string | null;
    job_completed_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    sensitive_data_revoked_at: string | null;
    sensitive_access_available_notified_at: string | null;
  };
};
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const optionalText = (v: unknown): string | null =>
  typeof v === 'string' ? v : null;
const optionalTime = (v: unknown): string | null =>
  typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null;
const validStates = ['offered', 'accepted', 'declined', 'expired', 'completed'] as const;

export function isEligibleXooterProfile(
  profile: unknown, userId: string,
): profile is { id: string; user_id: string; active: true; background_check_status: 'approved' } {
  return record(profile) && uuid(profile.id) && profile.user_id === userId &&
    profile.active === true && profile.background_check_status === 'approved';
}

/** Never accept other-worker offers, mixed-owner results or invalid response envelopes. */
export function parseWebXooterJobCards(body: unknown, xooterId: string): WebXooterJob[] | null {
  if (!uuid(xooterId) || !record(body) || body.success !== true ||
      !record(body.data) || !Array.isArray(body.data.jobs) || body.data.jobs.length > 500) return null;

  const results: WebXooterJob[] = [];
  const seen = new Set<string>();
  for (const raw of body.data.jobs) {
    if (!record(raw) || !uuid(raw.job_id) || !uuid(raw.booking_id) ||
        raw.xooter_id !== xooterId || typeof raw.state !== 'string' ||
        !validStates.some(state => state === raw.state) ||
        seen.has(raw.job_id.toLowerCase())) return null;
    seen.add(raw.job_id.toLowerCase());
    const state = raw.state as WebXooterJob['state'];
    const cancelled = optionalTime(raw.cancelled_at);
    const revoked = optionalTime(raw.sensitive_data_revoked_at);
    const status = optionalText(raw.status);
    results.push({
      id: raw.job_id,
      booking_id: raw.booking_id,
      xooter_id: xooterId,
      state,
      offered_at: optionalTime(raw.offered_at),
      responded_at: optionalTime(raw.responded_at),
      decline_reason: optionalText(raw.decline_reason),
      // Never display addresses from offers, expired/rejected jobs or bookings
      // with withdrawn sensitive access. Accepted status alone is not enough.
      destination_address: state === 'accepted' && !cancelled && !revoked &&
        !['cancelled', 'completed', 'rated'].includes(status ?? '')
        ? optionalText(raw.destination_address) : null,
      bookings: {
        id: raw.booking_id,
        service: optionalText(raw.service),
        service_type: optionalText(raw.service_type),
        scheduled_at: optionalTime(raw.scheduled_at),
        duration_hours: typeof raw.duration_hours === 'number' &&
          Number.isFinite(raw.duration_hours) && raw.duration_hours >= 0
          ? raw.duration_hours : null,
        status,
        job_completed_at: optionalTime(raw.job_completed_at),
        completed_at: optionalTime(raw.completed_at),
        cancelled_at: cancelled,
        sensitive_data_revoked_at: revoked,
        sensitive_access_available_notified_at: optionalTime(raw.sensitive_access_available_notified_at),
      },
    });
  }
  return results;
}
