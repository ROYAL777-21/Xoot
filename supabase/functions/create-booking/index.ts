import {
  addDays,
  cleanArray,
  cleanText,
  fail,
  handlePreflight,
  insertOutbox,
  insertReviewQueue,
  isApprovedLaunchRegion,
  ok,
  readJson,
  requireAuth,
  resolveLaunchRegion,
  toNumber,
  writeAuditLog,
} from "../_shared/action-utils.ts";
import {
  REFERRAL_FUNDING,
  checkReferral,
  referralCreditCents,
  type ReferralRecord,
} from "../_shared/referrals.ts";
import {
  ADD_ON_CENTS,
  BOOKING_COVER_CENTS,
  BOOKING_FEE_CENTS,
  HOME_SIZE_HOURS,
  SERVICE_LENGTH_HOURS,
  activeBoostBpsFor,
  applyBoost,
  basePrice,
  commissionRateBps,
  resolveHours,
} from "../_shared/pricing.ts";
import { getCarePlusDiscount, isCarePlusMember as memberOf } from "../_shared/care-plus-membership.ts";

const services = new Set(["residential", "express", "airbnb", "office", "deep", "moving", "premium"]);
// Pricing tables now live in ../_shared/pricing.ts. The multiplier model they replaced
// (homeSize.price x serviceLength.priceFactor x serviceMultiplier) double-counted
// duration and used R270/R315/R390, figures the locked commercial facts never approved.
// Home size and service length now only imply DEFAULT HOURS; hours alone set the price.

const allowedTimes = new Set(["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "15:00", "16:00", "17:00"]);
/*
 * Which services take more than one Xooter.
 *
 * ⚠️ KEEP IN SYNC with `MULTI_XOOTER_SERVICES` in `src/lib/xoot-pricing.ts`, via the aliases:
 * `deep` and `premium` both price as `regular`, and `regular` is single-Xooter.
 *
 * This set previously included "deep" and "premium". `Book.tsx` matched it, so a customer could
 * select a Deep clean with three Xooters — but the client price ladder aliases both to `regular`
 * and refuses to quote a second Xooter, so the screen showed R61 while this function charged
 * R860. Measured 2026-08-09. `pricing-parity.test.ts` now fails if the two sets drift again.
 */
const multiWorkerServices = new Set(["airbnb", "office", "moving"]);
const photoProofServices = new Set(["airbnb", "deep", "moving"]);

const isHighDemandSlot = (time: string) => Number(time.split(":")[0] ?? 0) >= 16;

/*
 * Graded slot pricing — built, and OFF.
 *
 * ⚠️ KEEP IN SYNC with `src/lib/operations.ts`, which carries the reasoning.
 * `pricing-parity.test.ts` fails if the flag or the curve drifts between the two.
 *
 * With `GRADED_SLOT_PRICING` false every slot is priced exactly as before. Turning it on
 * changes what customers are charged, so it is one boolean on each side and a founder decision,
 * not a refactor.
 */
const GRADED_SLOT_PRICING = false;
const HIGH_DEMAND_SLOT_RATE = 0.15;
const SLOT_PREMIUM_CURVE: Record<string, number> = {
  "15:00": 0.05,
  "16:00": 0.1,
  "17:00": 0.15,
};

const slotPremiumRate = (time: string): number => {
  if (GRADED_SLOT_PRICING) return SLOT_PREMIUM_CURVE[time] ?? 0;
  return isHighDemandSlot(time) ? HIGH_DEMAND_SLOT_RATE : 0;
};

/**
 * The commission rate to strike each booking at, keyed by Xooter id.
 *
 * One query for the whole request rather than one per booking: a multi-Xooter job inserts a
 * booking per Xooter and each carries its own rate, since each Xooter is ranked separately.
 *
 * A Xooter that cannot be read falls to the starting rate via `commissionRateBps`, which
 * treats a missing score as unproven rather than guessing. That is the loud failure — a Xooter
 * on an unexpected 35% reports it the same day; one silently granted the 20% floor is a
 * revenue leak nobody notices.
 */
const getCommissionRates = async (supa: any, xooterIds: string[]) => {
  const rates = new Map<string, number>();
  if (!xooterIds.length) return rates;
  const { data } = await supa
    .from("xooters")
    .select("id,reliability_score,jobs_completed")
    .in("id", xooterIds);
  for (const row of data ?? []) {
    const earned = commissionRateBps({
      reliabilityScore: row.reliability_score,
      completedJobs: row.jobs_completed,
    });
    // An active 14-day boost lowers the rate this booking is struck at, clamped at the floor.
    // Read per Xooter because each is rewarded separately.
    const boost = await activeBoostBpsFor(supa, row.id);
    rates.set(row.id, boost > 0 ? applyBoost(earned, boost) : earned);
  }
  return rates;
};

const getAvailableXootCred = async (supa: any, userId: string) => {
  const { data } = await supa
    .from("xootcred_ledger")
    .select("amount,direction,status,expires_at")
    .eq("user_id", userId);

  return (data ?? []).reduce((balance: number, row: any) => {
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return balance;
    const amount = Number(row.amount ?? 0);
    if (row.direction === "credit" && row.status === "available") return balance + amount;
    if (row.direction === "debit" && ["available", "redeemed"].includes(row.status)) return balance - amount;
    return balance;
  }, 0);
};

/**
 * ZD-036 — read the three facts `checkReferral` needs, and nothing else.
 *
 * Split out so the decision stays in `_shared/referrals.ts` and this function only supplies
 * inputs. The rule is testable in isolation precisely because it does no I/O.
 *
 * ⚠️ `referrals` and `referral_redemptions` have existed since 2026-04-23 with a signup trigger
 * already issuing every user a code. These are reads against the real columns — `user_id` on the
 * code, `referred_user_id` on the redemption — not against a table this session invented.
 */
const readReferralFacts = async (supa: any, code: string, buyerId: string) => {
  const { data: row } = await supa
    .from("referrals")
    .select("code,user_id")
    .eq("code", code)
    .maybeSingle();

  const record: ReferralRecord | null = row?.user_id
    ? { code: row.code, userId: row.user_id }
    : null;

  /*
   * The buyer's own history. Both reads are about the person, never the code — the burn is
   * per person, not per code.
   *
   * ⚠️ **Counts `completed_at`, not `status = 'completed'`, and the difference is a real bug.**
   * `booking_state_machine.ts` allows `completed → rated`, so a booking the customer has since
   * reviewed no longer reads as `completed`. Filtering on the status would have let anyone
   * whose first booking was rated collect a second first-booking discount — and it would have
   * done so silently, because the query returns 0 either way and 0 is the eligible answer.
   *
   * `bookings.completed_at` is set once and never cleared (added by
   * `20260602000000_booking_state_constraint`, which also backfilled it from
   * `job_completed_at`), so it survives every later transition.
   */
  const { count: completedBookings } = await supa
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", buyerId)
    .not("completed_at", "is", null);

  const { data: priorRedemption } = await supa
    .from("referral_redemptions")
    .select("id")
    .eq("referred_user_id", buyerId)
    .maybeSingle();

  return {
    record,
    buyerId,
    buyerCompletedBookings: completedBookings ?? 0,
    buyerHasRedeemed: Boolean(priorRedemption),
  };
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: any; supa: any };

  try {
    const body = await readJson(req);
    const serviceType = cleanText(body.serviceType ?? body.service_type, 40);
    const frequency = cleanText(body.frequency, 20) === "repeat" ? "repeat" : "one_time";
    const homeSizeId = cleanText(body.homeSize ?? body.home_size, 20) || "small";
    const serviceLengthId = cleanText(body.serviceLength ?? body.service_length, 30) || "standard";
    const date = cleanText(body.date, 10);
    const time = cleanText(body.time, 8);
    const address = cleanText(body.address, 240);
    const instructions = cleanText(body.instructions ?? body.notes, 1200);
    const householdProfileId = cleanText(body.householdProfileId ?? body.household_profile_id, 80) || null;
    const propertyAccountId = cleanText(body.propertyAccountId ?? body.property_account_id, 80) || null;
    const requestedWorkerCount = toNumber(body.workerCount ?? body.worker_count, 1);
    const xooterIds = cleanArray(body.xooterIds ?? body.xooter_ids ?? (body.xooter_id ? [body.xooter_id] : []), 5, 80);
    const addOns = cleanArray(body.addOns ?? body.extras, 12, 80);
    const bookingCoverOptIn = body.bookingCoverOptIn ?? body.booking_cover_opt_in;
    const requestedRedemption = Math.max(0, toNumber(body.xootcredRedemption ?? body.xootcred_redemption, 0));
    // Uppercased because the codes the signup trigger issues are uppercase and a customer
    // retyping one from a WhatsApp message will not be.
    const referralCode = (cleanText(body.referralCode ?? body.referral_code, 40) || "").toUpperCase();

    if (!services.has(serviceType)) return fail("unsupported service", origin, 400);
    if (HOME_SIZE_HOURS[homeSizeId] === undefined) return fail("unsupported home size", origin, 400);
    if (SERVICE_LENGTH_HOURS[serviceLengthId] === undefined) return fail("unsupported service length", origin, 400);
    if (!allowedTimes.has(time)) return fail("unsupported time", origin, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("invalid date", origin, 400);
    if (!address || !isApprovedLaunchRegion(address)) return fail("outside launch coverage", origin, 400);

    const scheduledAt = new Date(`${date}T${time}:00+02:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      return fail("booking time must be in the future", origin, 400);
    }

    /*
     * Refuse rather than silently slice.
     *
     * This used to cap `maxWorkers` at 1 for a single-Xooter service and then
     * `xooterIds.slice(0, maxWorkers)`, so a request naming three Xooters for a residential
     * clean booked one and charged for one — while the caller believed it had booked three.
     * Quietly delivering something other than what was asked for is the same failure as quietly
     * charging something other than what was shown; both end with a customer and an invoice
     * that disagree. The client no longer offers this combination, so anything reaching here is
     * a hand-built request and deserves an answer, not a silent correction.
     */
    const serviceMaxWorkers = multiWorkerServices.has(serviceType) ? 5 : 1;
    const requestedWorkers = Math.min(Math.max(requestedWorkerCount || 1, 1), 5);
    if (requestedWorkers > serviceMaxWorkers || xooterIds.length > serviceMaxWorkers) {
      return fail(`${serviceType} is booked with one Xooter`, origin, 400);
    }
    const maxWorkers = Math.min(requestedWorkers, serviceMaxWorkers);
    const selectedXooterIds = xooterIds.slice(0, maxWorkers);
    if (selectedXooterIds.length > 0) {
      const { data: xooters } = await supa
        .from("xooters")
        .select("id,name,active")
        .in("id", selectedXooterIds)
        .eq("active", true);
      if (!xooters || xooters.length !== selectedXooterIds.length) return fail("selected Xooter is unavailable", origin, 409);
    }

    const workerCount = Math.max(selectedXooterIds.length, 1);

    // Both of these are client-supplied foreign keys, so ownership is proven here rather than
    // trusted. Each uses one message for "no such row" and for "not yours", so neither can be
    // used to test which ids exist.
    if (propertyAccountId) {
      const { data: property } = await supa
        .from("property_accounts")
        .select("id")
        .eq("id", propertyAccountId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!property) return fail("property account not found", origin, 404);
    }

    /**
     * `household_profile_id` matters more than the property one, because it is the row that
     * holds `gate_code`, `alarm_code` and `access_instructions`.
     *
     * Unchecked, it was a path to another household's keys, not merely to muddled history:
     * `get-sensitive-access` authorises the caller as the booking's assigned Xooter and then
     * reads `household_profiles` by `booking.household_profile_id` without tying that profile
     * to the booking's customer. `can_access_sensitive_data` does not close it either — the
     * live definition checks the booking/Xooter link, revocation, status and time window, and
     * says nothing about whose profile it is.
     *
     * So a user who is also an active Xooter could file a booking naming themselves as the
     * Xooter and someone else's household profile, wait for the access window they chose, and
     * read that household's gate code.
     *
     * Not exploited: production holds 0 bookings, 0 household profiles and 0 Xooters — the
     * platform has no live data yet. This is closed before there is anything to take, which
     * is the only comfortable time to close it. `get-sensitive-access` is fixed in the same
     * change so the disclosure point is guarded too, not just the write.
     */
    if (householdProfileId) {
      const { data: household } = await supa
        .from("household_profiles")
        .select("id")
        .eq("id", householdProfileId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!household) return fail("household profile not found", origin, 404);
    }

    const bookedHours = resolveHours({ hours: body?.hours, serviceLengthId, homeSizeId });
    if (bookedHours === null) return fail("booked hours are required", origin, 400);

    const priced = basePrice(serviceType, bookedHours);
    if (!priced.ok) return fail(priced.reason, origin, 400);

    // Cents internally; converted back to rands at the boundary so stored columns and
    // the response keep the shape every existing caller already expects.
    const multiWorkerDiscount = selectedXooterIds.length >= 3 ? 0.1 : 0;
    const discountedBaseCents = Math.round(priced.baseCents * (1 - multiWorkerDiscount)) * workerCount;
    const addOnsCents = addOns.length * ADD_ON_CENTS;
    const subtotalCents = discountedBaseCents + addOnsCents;
    const highDemandCents = Math.round(subtotalCents * slotPremiumRate(time));
    /*
     * The booking fee: R39 on EVERY booking, waived only for Care+ members.
     *
     * Founder decision 2026-08-12, superseding the one-time rule this line used to carry
     * (`isCarePlusMember || frequency !== "one_time"`). Membership is the only gate — a
     * non-member booking fortnightly pays it every fortnight. `frequency` is deliberately absent
     * from this expression; if it ever returns, the old rule has crept back, and
     * `pricing-parity.test.ts` asserts the single-condition shape against this source to catch
     * exactly that.
     *
     * Membership is read from the same lookup that decides the discount, so a member cannot get
     * the discount and still be charged the fee.
     *
     * Mirrored in `src/lib/xoot-pricing.ts` as `carePlusMember`. The two must agree: a client
     * showing R0 against a server charging R39 is the defect this codebase already shipped once.
     */
    const carePlusDiscountRate = await getCarePlusDiscount(supa, user.id);
    const isCarePlusMember = memberOf(carePlusDiscountRate);
    const serviceFeeCents = isCarePlusMember ? 0 : BOOKING_FEE_CENTS;
    const bookingCoverCents = bookingCoverOptIn === false ? 0 : BOOKING_COVER_CENTS;

    const toRands = (cents: number) => Math.round(cents / 100);
    const subtotal = toRands(subtotalCents);
    const highDemandPremium = toRands(highDemandCents);
    const serviceFee = toRands(serviceFeeCents);
    const bookingCover = toRands(bookingCoverCents);
    const carePlusDiscount = Math.round(subtotal * carePlusDiscountRate);

    /*
     * ZD-036 — the referral credit.
     *
     * ⛔ **A refused code fails the booking rather than quietly charging full price.**
     *
     * That looks harsh and is the conservative choice. A customer who typed a code is expecting
     * a total that includes it. Creating the booking at the undiscounted price and mentioning
     * the refusal in the response body is the "shown one price, charged another" defect this
     * repo has already shipped three times, and under CPA s41 the displayed price is the price.
     * Refusing lets them remove the code and rebook knowing what they will pay; there is no
     * outcome here where they are charged something they did not see.
     *
     * ⚠️ **Capped at the work, never the fee or the cover** — `referralCreditCents` enforces it.
     * The booking fee is Xoot's own charge for arranging the booking and the cover is a premium
     * passed to an underwriter; a referral eating either funds a discount out of someone else's
     * money. So the cap is `discountedBaseCents + addOnsCents`, which is why this sits here
     * rather than being subtracted from `grossTotal` after the fee was added.
     *
     * ⚠️ **Funded from commission, never from Xooter pay.** `REFERRAL_FUNDING` states it as a
     * constant, and nothing below touches `commission_rate_bps` — a Xooter's rate is struck from
     * their own rank and must not move because a customer arrived through someone else's link.
     */
    let referralVerdict = null as ReturnType<typeof checkReferral> | null;
    let referralCredit = 0;
    if (referralCode) {
      referralVerdict = checkReferral(await readReferralFacts(supa, referralCode, user.id));
      if (!referralVerdict.ok) return fail(`referral code ${referralVerdict.reason}`, origin, 409);
      referralCredit = Math.round(
        referralCreditCents({
          verdict: referralVerdict,
          baseCents: discountedBaseCents,
          addOnsCents,
        }) / 100,
      );
    }

    const grossTotal =
      subtotal + highDemandPremium + serviceFee + bookingCover - carePlusDiscount - referralCredit;

    let xootcredRedemption = 0;
    if (requestedRedemption > 0) {
      const available = await getAvailableXootCred(supa, user.id);
      xootcredRedemption = Math.min(requestedRedemption, available, Math.max(0, grossTotal - 50));
      if (xootcredRedemption <= 0) return fail("xootcred cannot reduce this booking below R50", origin, 409);
    }

    const amountDue = Math.max(50, grossTotal - xootcredRedemption);
    const perBookingAmount = Math.max(1, Math.round(amountDue / workerCount));
    const perBookingPrice = Math.max(1, Math.round(subtotal / workerCount));
    const perBookingServiceFee = Math.round(serviceFee / workerCount);
    const perBookingCover = Math.round(bookingCover / workerCount);
    const perBookingHighDemand = Math.round(highDemandPremium / workerCount);
    const perBookingDiscount = Math.round(carePlusDiscount / workerCount);
    // Add-ons extend the visit; the booked hours are the priced duration.
    const estHours = priced.hours + addOns.length;
    const launchRegion = resolveLaunchRegion(address);
    const bookingTargets = selectedXooterIds.length ? selectedXooterIds : [null];
    // Struck once, here, and never recomputed at payout — see the migration
    // `20260809120000_booking_commission_rate.sql` for why a rank that moves must not change
    // what a Xooter is paid for work already agreed.
    const commissionRates = await getCommissionRates(supa, selectedXooterIds);

    const bookingIds: string[] = [];
    const paymentRecordIds: string[] = [];

    for (const xooterId of bookingTargets) {
      const { data: booking, error: bookingError } = await supa.from("bookings").insert({
        user_id: user.id,
        xooter_id: xooterId,
        original_xooter_id: xooterId,
        service: "cleaning",
        service_type: serviceType,
        scheduled_at: scheduledAt.toISOString(),
        price: perBookingPrice,
        address,
        status: "draft",
        payment_status: "pending",
        frequency,
        property_account_id: propertyAccountId,
        // Persisted, not merely validated. `get-sensitive-access` finds the household by
        // `booking.household_profile_id`, so while this stayed null every gate-code request
        // failed "booking is not assigned" and the feature could not work at all. Safe to
        // store now that two independent locks hold: ownership is proven above, and the
        // credential read is itself scoped to `booking.user_id`.
        household_profile_id: householdProfileId,
        launch_region: launchRegion,
        duration_hours: estHours,
        notes: instructions || null,
        completion_photo_required: photoProofServices.has(serviceType),
        service_fee: perBookingServiceFee,
        booking_cover_amount: perBookingCover,
        high_demand_premium: perBookingHighDemand,
        // Null while nobody is assigned. An absence reads as pending; a default would read as
        // an agreement that was never struck.
        commission_rate_bps: xooterId ? commissionRates.get(xooterId) ?? null : null,
      }).select("id").single();
      if (bookingError || !booking?.id) throw new Error("booking insert failed");
      bookingIds.push(booking.id);

      await supa.from("booking_status_events").insert({
        booking_id: booking.id,
        actor_id: user.id,
        status: "draft",
        label: "Draft booking created",
        meta: { amount_due: perBookingAmount, care_plus_discount: perBookingDiscount },
      });

      const providerReference = `xoot_booking_${booking.id}_${Date.now()}`;
      const { data: payment, error: paymentError } = await supa.from("payment_records").insert({
        booking_id: booking.id,
        user_id: user.id,
        amount: perBookingAmount,
        currency: "ZAR",
        status: "pending",
        provider: "manual_pending",
        provider_reference: providerReference,
        payment_kind: "booking",
        meta: {
          service_type: serviceType,
          service_length: serviceLengthId,
          xooter_id: xooterId,
          frequency,
          provider_required: "PayFast credentials not connected",
          breakdown: { subtotal, highDemandPremium, serviceFee, bookingCover, carePlusDiscount, referralCredit, xootcredRedemption, serviceLength: serviceLengthId },
        },
      }).select("id,provider_reference").single();
      if (paymentError || !payment?.id) throw new Error("payment record insert failed");
      paymentRecordIds.push(payment.id);

      await insertReviewQueue(supa, {
        queueType: "payment",
        subjectTable: "payment_records",
        subjectId: payment.id,
        userId: user.id,
        xooterId: xooterId,
        bookingId: booking.id,
        priority: "normal",
        summary: `Pending provider payment for ${serviceType} booking`,
      });

      await insertOutbox(supa, {
        source_table: "payment_records",
        source_id: payment.id,
        event_type: "payment_authorisation_requested",
        channel: "payment_provider",
        owner: "Finance Operations",
        stack_tool: "PayFast payment session",
        payload: { booking_id: booking.id, payment_record_id: payment.id, amount: perBookingAmount, currency: "ZAR" },
        status: "needs_approval",
        approval_required: true,
        failure_mode: "Booking remains draft until confirm-payment receives a valid provider webhook.",
        created_by: user.id,
      });
    }

    /*
     * Burn the code, and record what it actually took off.
     *
     * ⚠️ `referred_user_id` is UNIQUE, so this insert IS the burn — a concurrent second booking
     * with the same code loses the race at the database rather than at a check, which is the
     * whole reason ZD-036 was not given a `burned_at` flag of its own.
     *
     * `credit_cents` is stored rather than recomputed from today's constant, because
     * REFERRAL_REWARD_CENTS is recorded as provisional and a redemption from before a change
     * must still report the number that was really applied.
     *
     * ⚠️ Not thrown on. The booking and its payment record exist by this point; failing here
     * would leave the customer with a booking already priced with the credit and no ledger row
     * for it — worse than a missing ledger row on its own. The review queue is where a
     * discrepancy gets a human, and the audit log below carries the amount either way.
     */
    if (referralVerdict?.ok && referralCredit > 0 && bookingIds[0]) {
      const { error: redemptionError } = await supa.from("referral_redemptions").insert({
        referrer_user_id: referralVerdict.referrerUserId,
        referred_user_id: user.id,
        booking_id: bookingIds[0],
        credit_cents: referralCredit * 100,
        /*
         * ⚠️ `rewarded` stays false, and that is the correct state, not an omission.
         *
         * Two different amounts of money are involved and only one of them moves here. This
         * row records the REFEREE's discount, which is applied to the booking above. The
         * REFERRER's own R100 is a separate payout that must not be made until the booking
         * actually completes — otherwise a referral pair can book, take the referrer's reward,
         * and cancel. `rewarded` / `rewarded_at` are how a later payout job finds the
         * redemptions it still owes, so setting them true here would mark a debt as settled
         * before anything was paid.
         *
         * There is no such job yet. That is filed, not forgotten — see
         * docs/implementation/design-port-plan.md.
         */
      });
      if (redemptionError) {
        console.error("referral redemption insert failed", redemptionError);
        await insertReviewQueue(supa, {
          queueType: "payment",
          subjectTable: "bookings",
          subjectId: bookingIds[0],
          userId: user.id,
          bookingId: bookingIds[0],
          priority: "high",
          summary: `Referral credit of R${referralCredit} was applied to the booking but the redemption ledger row failed to write`,
        });
      }
    }

    if (xootcredRedemption > 0 && bookingIds[0]) {
      await supa.from("xootcred_ledger").insert({
        user_id: user.id,
        booking_id: bookingIds[0],
        amount: xootcredRedemption,
        direction: "debit",
        reason: "redemption",
        status: "redeemed",
        meta: { reason: "booking_redemption", source: "create-booking" },
      });
    }

    if (frequency === "repeat" && bookingIds[0]) {
      await supa.from("recurring_schedules").insert({
        user_id: user.id,
        xooter_id: selectedXooterIds[0] ?? null,
        household_profile_id: householdProfileId,
        cadence_days: 14,
        preferred_day: scheduledAt.toLocaleDateString("en-ZA", { weekday: "long" }),
        preferred_time: time,
        next_suggested_at: addDays(scheduledAt, 14).toISOString(),
      });
    }

    await writeAuditLog(supa, {
      actorId: user.id,
      action: "create_booking",
      targetTable: "bookings",
      targetId: bookingIds[0] ?? null,
      changes: { booking_ids: bookingIds, payment_record_ids: paymentRecordIds, amount_due: amountDue, status: "draft", service_length: serviceLengthId, referral_credit: referralCredit, referral_funding: referralCredit > 0 ? REFERRAL_FUNDING : null },
      reason: "Client created a server-priced booking draft",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    /*
     * `payment_session_url` stays an in-app link, and that is the finished design rather than a
     * placeholder. `create-payment-session` (PR #42) mints the PayFast form when the customer
     * chooses to pay; a session built here would be a signed instruction naming an amount, sitting
     * in a response body for as long as they take to decide.
     */
    return ok({
      booking_id: bookingIds[0] ?? null,
      booking_ids: bookingIds,
      payment_record_ids: paymentRecordIds,
      payment_session_url: bookingIds[0] ? `/app/bookings/${bookingIds[0]}?payment=pending` : null,
      amount_due: amountDue,
      status: "draft",
      breakdown: { subtotal, high_demand_premium: highDemandPremium, service_fee: serviceFee, booking_cover: bookingCover, care_plus_discount: carePlusDiscount, referral_credit: referralCredit, xootcred_redemption: xootcredRedemption, service_length: serviceLengthId },
    }, origin);
  } catch (error) {
    console.error("create-booking failed", error);
    return fail("booking creation failed", origin, 500);
  }
});
