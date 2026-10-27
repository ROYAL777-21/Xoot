import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailPayload } from "../_shared/email-playbook.ts";
import { readJson, isApprovedLaunchRegion, resolveLaunchRegion } from "../_shared/action-utils.ts";
import { assessVerifiedCoverage } from "../_shared/verified-coverage.ts";
import {
  ADD_ON_CENTS,
  BOOKING_COVER_CENTS,
  BOOKING_FEE_CENTS,
  HOME_SIZE_HOURS,
  basePrice,
  resolveHours,
} from "../_shared/pricing.ts";
import { getCarePlusDiscount, isCarePlusMember as memberOf } from "../_shared/care-plus-membership.ts";

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://xoot.co.za",
  "https://www.xoot.co.za",
];

const services = new Set(["residential", "express", "airbnb", "office", "deep", "moving", "premium"]);
// This function carried its OWN copy of the superseded model — homeSizes R270/R315/R390 times a
// serviceMultiplier, cover R21 — entirely separate from create-booking's. The ZD-020 repricing
// missed it because it imports no shared pricing and no client code calls it, so nothing failed.
// It is deployed and authenticated, though, so it was a live second path charging figures nobody
// approved. It now prices off ../_shared/pricing.ts like every other path.

const allowedTimes = new Set(["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "15:00", "16:00", "17:00"]);
const multiWorkerServices = new Set(["airbnb", "office", "deep", "moving", "premium"]);
const photoProofServices = new Set(["airbnb", "deep", "moving"]);

const getAllowedOrigins = () =>
  (Deno.env.get("ALLOWED_ORIGINS")?.split(",") ?? defaultAllowedOrigins)
    .map((origin) => origin.trim())
    .filter(Boolean);

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const isAllowedOrigin = (origin: string | null) => !origin || getAllowedOrigins().includes(origin);

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });

const stripUnsafeText = (value: string) =>
  value
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 || character === "<" || character === ">" || character === "`" || character === "\\"
        ? " "
        : character;
    })
    .join("");

const cleanText = (value: unknown, maxLength = 500) =>
  typeof value === "string"
    ? stripUnsafeText(value).replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";

const isHighDemandSlot = (time: string) => Number(time.split(":")[0] ?? 0) >= 16;

const routeNotificationChannel = (event: string) => {
  if (event === "booking_confirmed") return ["in_app", "brevo_email"];
  return ["in_app"];
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
  if (!isAllowedOrigin(origin)) return json({ error: "origin not allowed" }, 403, origin);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "authentication required" }, 401, origin);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "authentication required" }, 401, origin);

    const body = await readJson(req);
    const serviceType = cleanText(body.serviceType, 40);
    const frequency = body.frequency === "repeat" ? "repeat" : "one_time";
    const homeSizeId = cleanText(body.homeSize, 20) || "small";
    const time = cleanText(body.time, 8);
    const date = cleanText(body.date, 10);
    const address = cleanText(body.address, 240);
    const instructions = cleanText(body.instructions, 1200);
    const householdProfileId = cleanText(body.householdProfileId, 60) || null;
    const requestedWorkerCount = Number(body.workerCount);
    const xooterIds = Array.isArray(body.xooterIds)
      ? body.xooterIds.map((id: unknown) => cleanText(id, 80)).filter(Boolean).slice(0, 5)
      : [];
    const addOns = Array.isArray(body.addOns) ? body.addOns.slice(0, 12) : [];

    if (!services.has(serviceType)) return json({ error: "unsupported service" }, 400, origin);
    if (HOME_SIZE_HOURS[homeSizeId] === undefined) return json({ error: "unsupported home size" }, 400, origin);
    if (!allowedTimes.has(time)) return json({ error: "unsupported time" }, 400, origin);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "invalid date" }, 400, origin);
    if (!address || !isApprovedLaunchRegion(address)) return json({ error: "outside launch coverage" }, 400, origin);
    if (xooterIds.length === 0) return json({ error: "select at least one Xooter" }, 400, origin);

    const maxWorkers = multiWorkerServices.has(serviceType) ? Math.min(Math.max(requestedWorkerCount || 1, 1), 5) : 1;
    const selectedXooterIds = xooterIds.slice(0, maxWorkers);
    const bookedHours = resolveHours({ hours: body?.hours, homeSizeId });
    if (bookedHours === null) return json({ error: "booked hours are required" }, 400, origin);

    const priced = basePrice(serviceType, bookedHours);
    if (!priced.ok) return json({ error: priced.reason }, 400, origin);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Duplicate booking writer MUST apply the identical independently verified
    // location gate when enabled. Without this, callers could bypass the other
    // writer's strict service-zone enforcement.
    let verifiedZone: string | null = null;
    if (Deno.env.get("XOOT_STRICT_GEO_COVERAGE") === "true") {
      const checked = await assessVerifiedCoverage({
        address, service: serviceType, actorId: authData.user.id, db: supa,
        token: Deno.env.get("MAPBOX_GEOCODING_TOKEN") ?? "",
      });
      if (checked.state === "rate_limited") return json({ error: "coverage request limit" }, 429, origin);
      if (checked.state === "unavailable") return json({ error: "coverage temporarily unavailable" }, 503, origin);
      if (checked.state !== "available") return json({ error: "manual coverage review required" }, 409, origin);
      verifiedZone = checked.zoneName;
    }

    /*
     * Care+, which this function had no concept of until 2026-08-12.
     *
     * It priced every caller as a non-member: it charged the booking fee the paywall promises to
     * waive, and never applied the 10% member discount `create-booking` gives. Nothing failed,
     * because no client calls this path — but it is deployed and authenticated, so it was a live
     * second answer to "what does a member pay". Both writers now read the same shared helper,
     * asserted by `pricing-parity.test.ts`, so one cannot be fixed and the other forgotten.
     */
    const carePlusDiscountRate = await getCarePlusDiscount(supa, authData.user.id);
    const isCarePlusMember = memberOf(carePlusDiscountRate);

    // Cents internally, rands at the boundary, so the stored columns keep the shape every
    // existing reader expects. Mirrors create-booking deliberately: two booking paths that
    // round money differently is the same class of bug as two ladders.
    const discount = maxWorkers >= 3 ? 0.1 : 0;
    const discountedBaseCents = Math.round(priced.baseCents * (1 - discount)) * selectedXooterIds.length;
    const subtotalCents = discountedBaseCents + addOns.length * ADD_ON_CENTS;
    const highDemandCents = isHighDemandSlot(time) ? Math.round(subtotalCents * 0.15) : 0;
    // R39 on every booking, waived only for members. `frequency` is deliberately not a term here
    // — see the same expression and the same reasoning in `create-booking`.
    const serviceFeeCents = isCarePlusMember ? 0 : BOOKING_FEE_CENTS;
    const bookingCoverCents = body.bookingCoverOptIn === false ? 0 : BOOKING_COVER_CENTS;

    const toRands = (cents: number) => Math.round(cents / 100);
    const subtotal = toRands(subtotalCents);
    const highDemandPremium = toRands(highDemandCents);
    const serviceFee = toRands(serviceFeeCents);
    const bookingCover = toRands(bookingCoverCents);
    // Same base, same rounding, same order as `create-booking`, so the two paths agree to the cent.
    const carePlusDiscount = Math.round(subtotal * carePlusDiscountRate);
    const bookingTotal = subtotal + highDemandPremium + serviceFee + bookingCover - carePlusDiscount;
    const estHours = priced.hours + addOns.length;
    const perBookingTotal = Math.max(1, Math.round(bookingTotal / selectedXooterIds.length));
    const perBookingPrice = Math.max(1, Math.round(subtotal / selectedXooterIds.length));
    const perBookingServiceFee = Math.round(serviceFee / selectedXooterIds.length);
    const perBookingCover = Math.round(bookingCover / selectedXooterIds.length);
    const perBookingHighDemand = Math.round(highDemandPremium / selectedXooterIds.length);
    const scheduledAt = `${date}T${time}:00+02:00`;
    const launchRegion = verifiedZone ?? resolveLaunchRegion(address);

    // `householdProfileId` arrives from the request body and was previously written to
    // `recurring_schedules` unchecked, so a caller could attach their schedule to someone else's
    // household. Not a credential path — `get-sensitive-access` reads `bookings`, not
    // `recurring_schedules` — but the same missing proof that made the booking path a real hole,
    // and there is no reason for the two to disagree. One message for "no such profile" and for
    // "not yours", so ids cannot be probed.
    if (householdProfileId) {
      const { data: household } = await supa
        .from("household_profiles")
        .select("id")
        .eq("id", householdProfileId)
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (!household) return json({ error: "household profile not found" }, 404, origin);
    }

    const { data: xooters } = await supa
      .from("xooters")
      .select("id,name,active")
      .in("id", selectedXooterIds)
      .eq("active", true);
    if (!xooters || xooters.length !== selectedXooterIds.length) return json({ error: "selected Xooter is unavailable" }, 409, origin);

    const bookingIds: string[] = [];
    for (const xooterId of selectedXooterIds) {
      const { data: booking, error: bookingError } = await supa.from("bookings").insert({
        user_id: authData.user.id,
        xooter_id: xooterId,
        original_xooter_id: xooterId,
        service: "cleaning",
        service_type: serviceType,
        scheduled_at: scheduledAt,
        price: perBookingPrice,
        address,
        status: "pending",
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

      await supa.from("xooter_jobs").insert({ booking_id: booking.id, xooter_id: xooterId, state: "offered" });
      await supa.from("booking_status_events").insert({ booking_id: booking.id, actor_id: authData.user.id, status: "pending", label: "Booking sent" });

      const { data: payment } = await supa.from("payment_records").insert({
        booking_id: booking.id,
        user_id: authData.user.id,
        amount: perBookingTotal,
        currency: "ZAR",
        status: "pending",
        provider: "manual_pending",
        payment_kind: "booking",
        meta: { service_type: serviceType, xooter_id: xooterId, frequency, provider_required: "PayFast credentials not connected" },
      }).select("id").single();

      await supa.from("admin_review_queue").insert({
        queue_type: "payment",
        subject_table: "payment_records",
        subject_id: payment?.id ?? booking.id,
        user_id: authData.user.id,
        xooter_id: xooterId,
        booking_id: booking.id,
        priority: "normal",
        summary: `Pending payment confirmation for ${serviceType} booking`,
      });

      await supa.from("integration_outbox").insert([
        ...routeNotificationChannel("booking_confirmed").map((channel) => ({
          source_table: "bookings",
          source_id: booking.id,
          event_type: "booking_confirmed",
          channel,
          owner: channel === "brevo_email" ? "Retention & Loyalty Agent" : "Customer Support Agent",
          stack_tool: channel === "brevo_email" ? "Brevo email queue" : "Xoot in-app notification",
          payload: channel === "brevo_email"
            ? buildEmailPayload("booking_confirmed", { booking_id: booking.id, service_type: serviceType, scheduled_at: scheduledAt })
            : { booking_id: booking.id, service_type: serviceType, scheduled_at: scheduledAt },
          created_by: authData.user.id,
        })),
        {
          source_table: "bookings",
          source_id: booking.id,
          event_type: "payment_authorisation_requested",
          channel: "payment_provider",
          owner: "Finance Operations",
          stack_tool: "Payment provider queue",
          payload: { booking_id: booking.id, amount: perBookingTotal, currency: "ZAR" },
          status: "needs_approval",
          approval_required: true,
          failure_mode: "Keep booking pending payment until provider callback or admin confirmation exists.",
          created_by: authData.user.id,
        },
      ]);

      await supa.from("notifications").insert({
        user_id: authData.user.id,
        kind: "booking_confirmed",
        title: "Booking request sent",
        body: `Your ${serviceType} booking is pending contractor acceptance and payment confirmation.`,
        link: `/app/bookings/${booking.id}`,
      });
    }

    if (frequency === "repeat" && bookingIds[0]) {
      const firstBookingDate = new Date(scheduledAt);
      await supa.from("recurring_schedules").insert({
        user_id: authData.user.id,
        xooter_id: selectedXooterIds[0],
        household_profile_id: householdProfileId,
        cadence_days: 14,
        preferred_day: firstBookingDate.toLocaleDateString("en-ZA", { weekday: "long" }),
        preferred_time: time,
        next_suggested_at: new Date(firstBookingDate.getTime() + 14 * 864e5).toISOString(),
      });
    }

    return json({ booking_ids: bookingIds, status: "pending" }, 200, origin);
  } catch {
    return json({ error: "booking request failed" }, 500, origin);
  }
});
