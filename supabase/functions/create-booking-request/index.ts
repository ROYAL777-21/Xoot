import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://zoothome.co.za",
  "https://www.zoothome.co.za",
];

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

const approvedLaunchRegions = [
  "midrand",
  "sandton",
  "bryanston",
  "bedfordview",
  "rosebank",
  "parkhurst",
  "melville",
  "fourways",
  "waterfall",
  "dainfern",
  "hyde park",
  "braamfontein",
];

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

const isApprovedLaunchRegion = (input: string) => {
  const value = input.toLowerCase();
  return approvedLaunchRegions.some((region) => value.includes(region));
};

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

    const body = await req.json();
    const serviceType = cleanText(body.serviceType, 40);
    const frequency = body.frequency === "repeat" ? "repeat" : "one_time";
    const homeSizeId = cleanText(body.homeSize, 20) || "small";
    const time = cleanText(body.time, 8);
    const date = cleanText(body.date, 10);
    const address = cleanText(body.address, 240);
    const instructions = cleanText(body.instructions, 1200);
    const householdProfileId = cleanText(body.householdProfileId, 60) || null;
    const requestedWorkerCount = Number(body.workerCount);
    const zooterIds = Array.isArray(body.zooterIds)
      ? body.zooterIds.map((id: unknown) => cleanText(id, 80)).filter(Boolean).slice(0, 5)
      : [];
    const addOns = Array.isArray(body.addOns) ? body.addOns.slice(0, 12) : [];

    if (!services.has(serviceType)) return json({ error: "unsupported service" }, 400, origin);
    if (!homeSizes[homeSizeId]) return json({ error: "unsupported home size" }, 400, origin);
    if (!allowedTimes.has(time)) return json({ error: "unsupported time" }, 400, origin);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "invalid date" }, 400, origin);
    if (!address || !isApprovedLaunchRegion(address)) return json({ error: "outside launch coverage" }, 400, origin);
    if (zooterIds.length === 0) return json({ error: "select at least one Zooter" }, 400, origin);

    const maxWorkers = multiWorkerServices.has(serviceType) ? Math.min(Math.max(requestedWorkerCount || 1, 1), 5) : 1;
    const selectedZooterIds = zooterIds.slice(0, maxWorkers);
    const size = homeSizes[homeSizeId];
    const basePrice = Math.round(size.price * (serviceMultiplier[serviceType] ?? 1));
    const discount = maxWorkers >= 3 ? 0.1 : 0;
    const discountedBase = Math.round(basePrice * (1 - discount)) * selectedZooterIds.length;
    const addOnsTotal = addOns.length * 30;
    const subtotal = discountedBase + addOnsTotal;
    const highDemandPremium = isHighDemandSlot(time) ? Math.round(subtotal * 0.15) : 0;
    const serviceFee = frequency === "one_time" ? 39 : 0;
    const bookingCover = body.bookingCoverOptIn === false ? 0 : 21;
    const bookingTotal = subtotal + highDemandPremium + serviceFee + bookingCover;
    const estHours = size.hours + addOns.length;
    const perBookingTotal = Math.max(1, Math.round(bookingTotal / selectedZooterIds.length));
    const perBookingPrice = Math.max(1, Math.round(subtotal / selectedZooterIds.length));
    const perBookingServiceFee = Math.round(serviceFee / selectedZooterIds.length);
    const perBookingCover = Math.round(bookingCover / selectedZooterIds.length);
    const perBookingHighDemand = Math.round(highDemandPremium / selectedZooterIds.length);
    const scheduledAt = `${date}T${time}:00+02:00`;
    const launchRegion = approvedLaunchRegions.find((region) => address.toLowerCase().includes(region)) ?? address;

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: zooters } = await supa
      .from("zooters")
      .select("id,name,active")
      .in("id", selectedZooterIds)
      .eq("active", true);
    if (!zooters || zooters.length !== selectedZooterIds.length) return json({ error: "selected Zooter is unavailable" }, 409, origin);

    const bookingIds: string[] = [];
    for (const zooterId of selectedZooterIds) {
      const { data: booking, error: bookingError } = await supa.from("bookings").insert({
        user_id: authData.user.id,
        zooter_id: zooterId,
        original_zooter_id: zooterId,
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

      await supa.from("zooter_jobs").insert({ booking_id: booking.id, zooter_id: zooterId, state: "offered" });
      await supa.from("booking_status_events").insert({ booking_id: booking.id, actor_id: authData.user.id, status: "pending", label: "Booking sent" });

      const { data: payment } = await supa.from("payment_records").insert({
        booking_id: booking.id,
        user_id: authData.user.id,
        amount: perBookingTotal,
        currency: "ZAR",
        status: "pending",
        provider: "manual_pending",
        payment_kind: "booking",
        meta: { service_type: serviceType, zooter_id: zooterId, frequency, provider_required: "Ozow/Stitch credentials not connected" },
      }).select("id").single();

      await supa.from("admin_review_queue").insert({
        queue_type: "payment",
        subject_table: "payment_records",
        subject_id: payment?.id ?? booking.id,
        user_id: authData.user.id,
        zooter_id: zooterId,
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
          stack_tool: channel === "brevo_email" ? "Brevo email queue" : "Zoot in-app notification",
          payload: { booking_id: booking.id, service_type: serviceType, scheduled_at: scheduledAt },
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
        zooter_id: selectedZooterIds[0],
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
