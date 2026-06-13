import {
  assertBookingParticipant,
  cleanId,
  cleanText,
  fail,
  handlePreflight,
  ok,
  requireAuth,
  writeAuditLog,
} from "../_shared/action-utils.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: any; supa: any };

  try {
    const body = await req.json();
    const bookingId = cleanId(body.bookingId ?? body.booking_id);
    const reason = cleanText(body.reason, 500) || "Booking ended; sensitive access revoked";
    if (!bookingId) return fail("booking_id required", origin, 400);

    const { data: booking } = await supa
      .from("bookings")
      .select("id,user_id,zooter_id,status,sensitive_data_revoked_at")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking?.id) return fail("booking not found", origin, 404);

    const participant = await assertBookingParticipant(supa, booking, user.id);
    if (!participant.participant) return fail("booking access denied", origin, 403);
    if (!["completed", "cancelled"].includes(String(booking.status))) {
      return fail("sensitive access can only be revoked after completion or cancellation", origin, 409);
    }

    const revokedAt = booking.sensitive_data_revoked_at ?? new Date().toISOString();
    await supa
      .from("bookings")
      .update({ sensitive_data_revoked_at: revokedAt, updated_at: new Date().toISOString() })
      .eq("id", booking.id);

    let zooterUserId: string | null = null;
    if (booking.zooter_id) {
      const { data: zooter } = await supa.from("zooters").select("user_id").eq("id", booking.zooter_id).maybeSingle();
      zooterUserId = zooter?.user_id ?? null;
    }

    let contractorStillAllowed = false;
    if (zooterUserId) {
      const { data } = await supa.rpc("can_access_sensitive_data", {
        p_booking_id: booking.id,
        p_actor_id: zooterUserId,
      });
      contractorStillAllowed = data === true;
    }

    await supa.from("sensitive_access_logs").insert({
      actor_id: user.id,
      booking_id: booking.id,
      access_granted: false,
      reason: "sensitive_access_revoked",
      requested_fields: ["household_profile", "address_notes", "access_codes", "contact_details"],
    });

    await writeAuditLog(supa, {
      actorId: user.id,
      action: "revoke_sensitive_access",
      targetTable: "bookings",
      targetId: booking.id,
      changes: { sensitive_data_revoked_at: revokedAt, contractor_still_allowed: contractorStillAllowed },
      reason,
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    if (contractorStillAllowed) return fail("sensitive access revocation verification failed", origin, 500);
    return ok({ booking_id: booking.id, sensitive_data_revoked_at: revokedAt, contractor_access_allowed: false }, origin);
  } catch (error) {
    console.error("revoke-sensitive-access failed", error);
    return fail("sensitive access revocation failed", origin, 500);
  }
});
