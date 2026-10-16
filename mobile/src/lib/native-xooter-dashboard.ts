import type { XooterJobCard } from './native-xooter-ledger';

/** Calendar-day identity in South African local time, never device time-zone. */
export function sastCalendarDay(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const byType = (type: string) => parts.find(part => part.type === type)?.value;
  const year = byType('year'), month = byType('month'), day = byType('day');
  return year && month && day ? `${year}-${month}-${day}` : null;
}

/** These are live offers/accepted assignments, not a time-stamped job event log. */
export function xooterHomeSnapshot(jobs: readonly XooterJobCard[], now: Date = new Date()) {
  const day = sastCalendarDay(now);
  const offers = jobs.filter(job => job.state === 'offered');
  const accepted = jobs.filter(job => job.state === 'accepted');
  const today = accepted.filter(job => job.scheduled_at && sastCalendarDay(job.scheduled_at) === day)
    .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
  const upcoming = accepted.filter(job => job.scheduled_at && sastCalendarDay(job.scheduled_at) !== day
    && new Date(job.scheduled_at).getTime() >= now.getTime())
    .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
  return {
    offers: offers.length,
    accepted: accepted.length,
    today,
    upcoming,
    // "Next" must not point to an earlier booking today if the owner has
    // not yet updated its state. Leave it in Today's list instead.
    next: today.find(job => new Date(job.scheduled_at!).getTime() >= now.getTime()) ?? upcoming[0] ?? null,
  };
}

export type XooterHomeProfile = {
  id: string;
  user_id: string;
  active: boolean;
  background_check_status: string | null;
};
/** Avoid asserting eligibility from existence of a profile alone. */
export function readXooterHomeProfile(value: unknown, authenticatedUser: string): XooterHomeProfile | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || !candidate.id ||
    candidate.user_id !== authenticatedUser || typeof candidate.active !== 'boolean' ||
    !(candidate.background_check_status === null || typeof candidate.background_check_status === 'string')) return null;
  return {
    id: candidate.id, user_id: authenticatedUser, active: candidate.active,
    background_check_status: candidate.background_check_status,
  };
}
export const hasVerifiedXooterHomeAccess = (profile: XooterHomeProfile) =>
  profile.active && profile.background_check_status === 'approved';
