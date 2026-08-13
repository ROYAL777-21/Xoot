import {
  cleanId,
  fail,
  handlePreflight,
  ok,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";

type PublicKeyRow = {
  id: string;
  user_id: string;
  device_id: string;
  public_jwk: unknown;
  key_version: number;
  revoked_at: string | null;
};

const unique = (values: Array<string | null | undefined>) => Array.from(new Set(values.filter(Boolean) as string[]));

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: { id: string }; supa: any };

  try {
    const body = await readJson(req);
    const bookingId = cleanId(body.bookingId ?? body.booking_id);
    if (!bookingId) return fail("booking_id required", origin, 400);

    const { data: booking, error: bookingError } = await supa
      .from("bookings")
      .select("id,user_id,xooter_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking?.id) return fail("booking not found", origin, 404);

    let xooterUserId: string | null = null;
    if (booking.xooter_id) {
      const { data: xooter, error: xooterError } = await supa
        .from("xooters")
        .select("id,user_id")
        .eq("id", booking.xooter_id)
        .maybeSingle();

      if (xooterError) return fail("xooter lookup failed", origin, 500);
      xooterUserId = xooter?.user_id ?? null;
    }

    const isClient = booking.user_id === user.id;
    const isAssignedXooter = xooterUserId === user.id;
    if (!isClient && !isAssignedXooter) return fail("booking access denied", origin, 403);

    const participantIds = unique([booking.user_id, xooterUserId]);
    const { data: keys, error: keysError } = await supa
      .from("user_encryption_keys")
      .select("id,user_id,device_id,public_jwk,key_version,revoked_at")
      .in("user_id", participantIds)
      .is("revoked_at", null);

    if (keysError) return fail("public keys unavailable", origin, 500);

    const publicKeys = ((keys ?? []) as PublicKeyRow[])
      .filter((row) => row.user_id && row.device_id && row.public_jwk && row.revoked_at === null)
      .map((row) => ({
        id: row.id,
        user_id: row.user_id,
        device_id: row.device_id,
        public_jwk: row.public_jwk,
        key_version: row.key_version,
      }));

    return ok({ booking_id: booking.id, keys: publicKeys }, origin);
  } catch (error) {
    console.error("get-booking-public-keys failed", error);
    return fail("public key lookup failed", origin, 500);
  }
});
