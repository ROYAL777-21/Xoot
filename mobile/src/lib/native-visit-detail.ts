import { normaliseBookingStatus } from '../generated/booking-state-machine';

/** Source-inspired Visit/Tracking presentation: only a current owner-bound booking record.
 * Not an ETA, a location tracker, a payment receipt or historical event evidence.
 */
export const LIVE_VISIT_STAGES = [
  'awaiting_assignment', 'assigned', 'contractor_accepted', 'en_route',
  'arrived', 'in_progress', 'completed',
] as const;

export function visitStatusStory(status: string): { title: string; detail: string } {
  const canonical = normaliseBookingStatus(status);
  const copy: Record<string, { title: string; detail: string }> = {
    draft: { title: 'Booking being prepared', detail: 'No payment or assignment has been confirmed yet.' },
    pending_payment: { title: 'Awaiting payment confirmation', detail: 'The booking record does not yet confirm payment.' },
    payment_confirmed: { title: 'Payment status updated', detail: 'Your booking is moving through confirmation.' },
    awaiting_assignment: { title: 'Finding your Xooter', detail: 'Your booking is awaiting an accepted assignment.' },
    assigned: { title: 'Xooter assigned', detail: 'Check the assigned Xooter below. Arrival has not yet been confirmed.' },
    contractor_accepted: { title: 'Your Xooter accepted', detail: 'The booking record confirms acceptance, not live arrival time.' },
    en_route: { title: 'Your Xooter is on the way', detail: 'Live travel estimates are not available on this screen.' },
    arrived: { title: 'Xooter marked arrived', detail: 'This status is recorded by Xoot; contact support for a discrepancy.' },
    in_progress: { title: 'Your clean is in progress', detail: 'Xoot has recorded the visit as in progress.' },
    completed: { title: 'Visit marked complete', detail: 'Completion does not by itself confirm payment settlement or payout.' },
    rated: { title: 'Visit rated', detail: 'Thank you for recording your feedback.' },
    cancelled: { title: 'Visit cancelled', detail: 'The cancellation record does not prove whether a refund was issued.' },
    replacement_required: { title: 'Replacement requested', detail: 'A new Xooter has not yet been confirmed.' },
    replacement_offered: { title: 'Replacement offered', detail: 'Your replacement must be confirmed before arrival can be assumed.' },
    reassigned: { title: 'New Xooter assigned', detail: 'Check the currently assigned person; arrival is not confirmed.' },
  };
  return (canonical ? copy[canonical] : null) ?? { title: 'Booking update', detail: 'Contact Xoot support if the status needs clarification.' };
}
export function visitProgress(status: string): { index: number; phases: readonly string[] } | null {
  const canonical = normaliseBookingStatus(status);
  if (!canonical) return null;
  if (canonical === 'cancelled' || canonical === 'draft' || canonical === 'pending_payment' || canonical === 'payment_confirmed' ||
    canonical.startsWith('replacement_')) return null;
  const resolved = canonical === 'reassigned' ? 'assigned' : canonical === 'rated' ? 'completed' : canonical;
  const index = LIVE_VISIT_STAGES.indexOf(resolved as typeof LIVE_VISIT_STAGES[number]);
  return index < 0 ? null : { index, phases: LIVE_VISIT_STAGES };
}
export const isBookingId = (id: unknown): id is string =>
  typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
