// Deno Edge Function shared module. Bundled into each consuming function at deploy time, so a
// change here reaches nothing until every consumer is redeployed.
type SupabaseServiceClient = any;

/**
 * The Care+ member discount rate for a user: 0.1 for an active member, 0 for everyone else.
 *
 * **One implementation, deliberately.** This lived privately inside `create-booking` while
 * `create-booking-request` — the other function that writes a priced booking — had no concept of
 * Care+ at all. That meant a member routed through the request path was charged the booking fee
 * the paywall promises to waive, and missed the 10% discount as well. Two booking writers that
 * price membership differently is the same class of defect as two price ladders, which this
 * codebase has already shipped once.
 *
 * Both callers derive membership *and* the fee waiver from this single number, so a member
 * cannot receive the discount and still be charged the fee — the combination that would be
 * hardest to spot in a receipt.
 *
 * `maybeSingle()` returns null rather than throwing when a user has no subscription row, which
 * is the common case. A user with more than one active row would throw; that is intentional,
 * because silently picking one of two active memberships is worse than a loud failure.
 */
export const getCarePlusDiscount = async (supa: SupabaseServiceClient, userId: string) => {
  const { data } = await supa
    .from("user_subscriptions")
    .select("id,status,next_billing_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!data?.id) return 0;
  // A membership past its billing date is not a membership. Checked here rather than trusting
  // `status` alone, so a failed renewal that never flipped the status cannot keep granting perks.
  if (data.next_billing_at && new Date(data.next_billing_at).getTime() <= Date.now()) return 0;
  return 0.1;
};

/**
 * Whether the user pays the booking fee.
 *
 * Membership is the only gate — founder decision 2026-08-12. Not frequency, not
 * first-visit-versus-later. Expressed as a named helper so both booking writers state the rule
 * identically instead of each spelling out a condition that could drift by one term.
 */
export const isCarePlusMember = (discountRate: number) => discountRate > 0;
