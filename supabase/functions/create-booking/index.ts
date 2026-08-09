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
  requireAuth,
  resolveLaunchRegion,
  toNumber,
  writeAuditLog,
} from "../_shared/action-utils.ts";
import {
  ADD_ON_CENTS,
  BOOKING_COVER_CENTS,
  HOME_SIZE_HOURS,
  SERVICE_LENGTH_HOURS,
  ONE_TIME_SERVICE_FEE_CENTS,
  basePrice,
  commissionRateBps,
  resolveHours,
} from "../_shared/pricing.ts";

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

const getCarePlusDiscount = async (supa: any, userId: string) => {
  const { data } = await supa
    .from("user_subscriptions")
    .select("id,status,next_billing_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!data?.id) return 0;
  if (data.next_billing_at && new Date(data.next_billing_at).getTime() <= Date.now()) return 0;
  return 0.1;
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
const getCommissionRates = async (supa: any, zooterIds: string[]) => {
  const rates = new Map<string, number>();
  if (!zooterIds.length) return rates;
  const { data } = await supa
    .from("zooters")
    .select("id,reliability_score,jobs_completed")
    .in("id", zooterIds);
  for (const row of data ?? []) {
    rates.set(
      row.id,
      commissionRateBps({
        reliabilityScore: row.reliability_score,
        completedJobs: row.jobs_completed,
      }),
    );
  }
  return rates;
};

const getAvailableXootCred = async (supa: any, userId: string) => {
  const { data } = await supa
    .from("zootcred_ledger")
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

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: any; supa: any };

  try {
    const body = await req.json();
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
    const zooterIds = cleanArray(body.zooterIds ?? body.zooter_ids ?? (body.zooter_id ? [body.zooter_id] : []), 5, 80);
    const addOns = cleanArray(body.addOns ?? body.extras, 12, 80);
    const bookingCoverOptIn = body.bookingCoverOptIn ?? body.booking_cover_opt_in;
    const requestedRedemption = Math.max(0, toNumber(body.zootcredRedemption ?? body.zootcred_redemption, 0));

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
     * `zooterIds.slice(0, maxWorkers)`, so a request naming three Xooters for a residential
     * clean booked one and charged for one — while the caller believed it had booked three.
     * Quietly delivering something other than what was asked for is the same failure as quietly
     * charging something other than what was shown; both end with a customer and an invoice
     * that disagree. The client no longer offers this combination, so anything reaching here is
     * a hand-built request and deserves an answer, not a silent correction.
     */
    const serviceMaxWorkers = multiWorkerServices.has(serviceType) ? 5 : 1;
    const requestedWorkers = Math.min(Math.max(requestedWorkerCount || 1, 1), 5);
    if (requestedWorkers > serviceMaxWorkers || zooterIds.length > serviceMaxWorkers) {
      return fail(`${serviceType} is booked with one Xooter`, origin, 400);
    }
    const maxWorkers = Math.min(requestedWorkers, serviceMaxWorkers);
    const selectedXooterIds = zooterIds.slice(0, maxWorkers);
    if (selectedXooterIds.length > 0) {
      const { data: zooters } = await supa
        .from("zooters")
        .select("id,name,active")
        .in("id", selectedXooterIds)
        .eq("active", true);
      if (!zooters || zooters.length !== selectedXooterIds.length) return fail("selected Xooter is unavailable", origin, 409);
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
     * Care+ members pay no booking fee, at any frequency (founder decision 2026-08-09, alongside
     * R99/month and one month free). Membership is read from the same lookup that decides the
     * discount, so a member cannot get the discount and still be charged the fee.
     *
     * Mirrored in `src/lib/xoot-pricing.ts` as `carePlusMember`, and held there by
     * `pricing-parity.test.ts`. The two must agree: a client showing R0 against a server charging
     * R39 is the defect this codebase already shipped once.
     */
    const carePlusDiscountRate = await getCarePlusDiscount(supa, user.id);
    const isCarePlusMember = carePlusDiscountRate > 0;
    const serviceFeeCents =
      isCarePlusMember || frequency !== "one_time" ? 0 : ONE_TIME_SERVICE_FEE_CENTS;
    const bookingCoverCents = bookingCoverOptIn === false ? 0 : BOOKING_COVER_CENTS;

    const toRands = (cents: number) => Math.round(cents / 100);
    const subtotal = toRands(subtotalCents);
    const highDemandPremium = toRands(highDemandCents);
    const serviceFee = toRands(serviceFeeCents);
    const bookingCover = toRands(bookingCoverCents);
    const carePlusDiscount = Math.round(subtotal * carePlusDiscountRate);
    const grossTotal = subtotal + highDemandPremium + serviceFee + bookingCover - carePlusDiscount;

    let zootcredRedemption = 0;
    if (requestedRedemption > 0) {
      const available = await getAvailableXootCred(supa, user.id);
      zootcredRedemption = Math.min(requestedRedemption, available, Math.max(0, grossTotal - 50));
      if (zootcredRedemption <= 0) return fail("zootcred cannot reduce this booking below R50", origin, 409);
    }

    const amountDue = Math.max(50, grossTotal - zootcredRedemption);
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

    for (const zooterId of bookingTargets) {
      const { data: booking, error: bookingError } = await supa.from("bookings").insert({
        user_id: user.id,
        zooter_id: zooterId,
        original_zooter_id: zooterId,
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
        commission_rate_bps: zooterId ? commissionRates.get(zooterId) ?? null : null,
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

      const providerReference = `zoot_booking_${booking.id}_${Date.now()}`;
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
          zooter_id: zooterId,
          frequency,
          provider_required: "Ozow/Stitch credentials not connected",
          breakdown: { subtotal, highDemandPremium, serviceFee, bookingCover, carePlusDiscount, zootcredRedemption, serviceLength: serviceLengthId },
        },
      }).select("id,provider_reference").single();
      if (paymentError || !payment?.id) throw new Error("payment record insert failed");
      paymentRecordIds.push(payment.id);

      await insertReviewQueue(supa, {
        queueType: "payment",
        subjectTable: "payment_records",
        subjectId: payment.id,
        userId: user.id,
        zooterId: zooterId,
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
        stack_tool: "Stitch/Ozow payment session",
        payload: { booking_id: booking.id, payment_record_id: payment.id, amount: perBookingAmount, currency: "ZAR" },
        status: "needs_approval",
        approval_required: true,
        failure_mode: "Booking remains draft until confirm-payment receives a valid provider webhook.",
        created_by: user.id,
      });
    }

    if (zootcredRedemption > 0 && bookingIds[0]) {
      await supa.from("zootcred_ledger").insert({
        user_id: user.id,
        booking_id: bookingIds[0],
        amount: zootcredRedemption,
        direction: "debit",
        reason: "redemption",
        status: "redeemed",
        meta: { reason: "booking_redemption", source: "create-booking" },
      });
    }

    if (frequency === "repeat" && bookingIds[0]) {
      await supa.from("recurring_schedules").insert({
        user_id: user.id,
        zooter_id: selectedXooterIds[0] ?? null,
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
      changes: { booking_ids: bookingIds, payment_record_ids: paymentRecordIds, amount_due: amountDue, status: "draft", service_length: serviceLengthId },
      reason: "Client created a server-priced booking draft",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    // TODO: Replace this local handoff with a real Stitch/Ozow payment session URL once provider credentials are connected.
    return ok({
      booking_id: bookingIds[0] ?? null,
      booking_ids: bookingIds,
      payment_record_ids: paymentRecordIds,
      payment_session_url: bookingIds[0] ? `/app/bookings/${bookingIds[0]}?payment=pending` : null,
      amount_due: amountDue,
      status: "draft",
      breakdown: { subtotal, high_demand_premium: highDemandPremium, service_fee: serviceFee, booking_cover: bookingCover, care_plus_discount: carePlusDiscount, zootcred_redemption: zootcredRedemption, service_length: serviceLengthId },
    }, origin);
  } catch (error) {
    console.error("create-booking failed", error);
    return fail("booking creation failed", origin, 500);
  }
});
