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

const services = new Set(["residential", "express", "airbnb", "office", "deep", "moving", "premium"]);
const serviceMultiplier: Record<string, number> = {
  residential: 1,
  express: 0.85,
  airbnb: 1.15,
  office: 1.2,
  deep: 1.35,
  moving: 1.4,
  premium: 1.55,
};

const homeSizes: Record<string, { hours: number; price: number }> = {
  small: { hours: 4, price: 270 },
  medium: { hours: 5.5, price: 315 },
  large: { hours: 8, price: 390 },
};

const serviceLengths: Record<string, { hours: number; priceFactor: number }> = {
  refresh: { hours: 3, priceFactor: 0.82 },
  standard: { hours: 4.5, priceFactor: 1 },
  extended: { hours: 6, priceFactor: 1.28 },
  full_day: { hours: 8, priceFactor: 1.62 },
};

const allowedTimes = new Set(["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "15:00", "16:00", "17:00"]);
const multiWorkerServices = new Set(["airbnb", "office", "deep", "moving", "premium"]);
const photoProofServices = new Set(["airbnb", "deep", "moving"]);

const isHighDemandSlot = (time: string) => Number(time.split(":")[0] ?? 0) >= 16;

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
    const requestedWorkerCount = toNumber(body.workerCount ?? body.worker_count, 1);
    const zooterIds = cleanArray(body.zooterIds ?? body.zooter_ids ?? (body.zooter_id ? [body.zooter_id] : []), 5, 80);
    const addOns = cleanArray(body.addOns ?? body.extras, 12, 80);
    const bookingCoverOptIn = body.bookingCoverOptIn ?? body.booking_cover_opt_in;
    const requestedRedemption = Math.max(0, toNumber(body.zootcredRedemption ?? body.zootcred_redemption, 0));

    if (!services.has(serviceType)) return fail("unsupported service", origin, 400);
    if (!homeSizes[homeSizeId]) return fail("unsupported home size", origin, 400);
    if (!serviceLengths[serviceLengthId]) return fail("unsupported service length", origin, 400);
    if (!allowedTimes.has(time)) return fail("unsupported time", origin, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("invalid date", origin, 400);
    if (!address || !isApprovedLaunchRegion(address)) return fail("outside launch coverage", origin, 400);

    const scheduledAt = new Date(`${date}T${time}:00+02:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      return fail("booking time must be in the future", origin, 400);
    }

    const maxWorkers = multiWorkerServices.has(serviceType) ? Math.min(Math.max(requestedWorkerCount || 1, 1), 5) : 1;
    const selectedXooterIds = zooterIds.slice(0, maxWorkers);
    if (selectedXooterIds.length > 0) {
      const { data: zooters } = await supa
        .from("zooters")
        .select("id,name,active")
        .in("id", selectedXooterIds)
        .eq("active", true);
      if (!zooters || zooters.length !== selectedXooterIds.length) return fail("selected Xooter is unavailable", origin, 409);
    }

    const size = homeSizes[homeSizeId];
    const length = serviceLengths[serviceLengthId];
    const workerCount = Math.max(selectedXooterIds.length, 1);
    const basePrice = Math.round(size.price * length.priceFactor * (serviceMultiplier[serviceType] ?? 1));
    const multiWorkerDiscount = selectedXooterIds.length >= 3 ? 0.1 : 0;
    const discountedBase = Math.round(basePrice * (1 - multiWorkerDiscount)) * workerCount;
    const addOnsTotal = addOns.length * 30;
    const subtotal = discountedBase + addOnsTotal;
    const highDemandPremium = isHighDemandSlot(time) ? Math.round(subtotal * 0.15) : 0;
    const serviceFee = frequency === "one_time" ? 39 : 0;
    const bookingCover = bookingCoverOptIn === false ? 0 : 21;
    const carePlusDiscountRate = await getCarePlusDiscount(supa, user.id);
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
    const estHours = length.hours + addOns.length;
    const launchRegion = resolveLaunchRegion(address);
    const bookingTargets = selectedXooterIds.length ? selectedXooterIds : [null];

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
        launch_region: launchRegion,
        duration_hours: estHours,
        notes: instructions || null,
        completion_photo_required: photoProofServices.has(serviceType),
        service_fee: perBookingServiceFee,
        booking_cover_amount: perBookingCover,
        high_demand_premium: perBookingHighDemand,
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
