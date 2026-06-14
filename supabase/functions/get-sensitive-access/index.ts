import {
  cleanId,
  cleanText,
  fail,
  handlePreflight,
  ok,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";

const sensitiveFields = new Set([
  "gate_code",
  "alarm_code",
  "access_instructions",
  "parking_instructions",
  "pet_notes",
]);

const logRevealAttempt = async (
  supa: any,
  payload: {
    zooterId: string;
    bookingId: string;
    field: string;
    wasWithinWindow: boolean;
    deviceInfo: string;
  },
) => {
  await supa.from("sensitive_data_access_log").insert({
    zooter_id: payload.zooterId,
    booking_id: payload.bookingId,
    field_accessed: payload.field,
    device_info: payload.deviceInfo,
    was_within_window: payload.wasWithinWindow,
  });
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
    const bookingId = cleanId(body.bookingId ?? body.booking_id);
    const field = cleanText(body.field, 60);
    const deviceInfo = cleanText(
      [
        req.headers.get("user-agent"),
        req.headers.get("x-forwarded-for"),
      ].filter(Boolean).join(" | "),
      500,
    );

    if (!bookingId) return fail("booking_id required", origin, 400);
    if (!sensitiveFields.has(field)) return fail("unsupported sensitive field", origin, 400);

    const { data: booking, error: bookingError } = await supa
      .from("bookings")
      .select("id,zooter_id,household_profile_id,status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking?.id) return fail("booking not found", origin, 404);
    if (!booking.zooter_id || !booking.household_profile_id) return fail("booking is not assigned", origin, 409);

    const { data: zooter, error: zooterError } = await supa
      .from("zooters")
      .select("id,user_id")
      .eq("id", booking.zooter_id)
      .maybeSingle();

    if (zooterError || zooter?.user_id !== user.id) return fail("booking access denied", origin, 403);

    const { data: allowed, error: accessError } = await supa.rpc("can_access_sensitive_data", {
      p_zooter_id: booking.zooter_id,
      p_booking_id: booking.id,
    });

    if (accessError) {
      console.error("can_access_sensitive_data failed", accessError);
      return fail("sensitive access check failed", origin, 500);
    }

    if (allowed !== true) {
      await logRevealAttempt(supa, {
        zooterId: booking.zooter_id,
        bookingId: booking.id,
        field,
        wasWithinWindow: false,
        deviceInfo,
      });
      return fail("sensitive access is locked for this booking window", origin, 403);
    }

    const { data: access, error: accessViewError } = await supa
      .from("household_profiles")
      .select("gate_code,alarm_code,access_instructions,parking_instructions,pet_notes")
      .eq("id", booking.household_profile_id)
      .maybeSingle();

    if (accessViewError || !access) return fail("sensitive access details unavailable", origin, 404);

    await logRevealAttempt(supa, {
      zooterId: booking.zooter_id,
      bookingId: booking.id,
      field,
      wasWithinWindow: true,
      deviceInfo,
    });

    return ok({
      booking_id: booking.id,
      field,
      value: access[field] ?? "",
      expires_in_seconds: 30,
    }, origin);
  } catch (error) {
    console.error("get-sensitive-access failed", error);
    return fail("sensitive access failed", origin, 500);
  }
});
