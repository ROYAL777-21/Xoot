import {
  cleanId,
  cleanText,
  fail,
  getServiceClient,
  handlePreflight,
  insertNotification,
  ok,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";

/**
 * Raise, dispatch, or cancel an SOS alert.
 *
 * The client runs the five-second countdown and dials 112 itself — a phone call cannot be
 * placed from a server, and waiting for a round trip before dialling would be indefensible.
 * What the server owns is the record: where it happened, who raised it, whether it was
 * cancelled, and getting it in front of ops whether or not the caller can speak.
 *
 * `safety_sos_alerts` has no client write policy, so this is the only way in.
 */

/**
 * A cancel arriving after this many seconds is treated as post-dispatch and needs the PIN.
 * Mirrors `SOS_COUNTDOWN_MS` in `src/lib/safety.ts`; the server does not trust the client's
 * claim about which phase it was in.
 */
const COUNTDOWN_SECONDS = 5;

/** Alerts a user may raise per hour. High enough to never block a real emergency. */
const MAX_ALERTS_PER_HOUR = 10;

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user } = auth as { user: { id: string } };

  const supa = getServiceClient();

  try {
    const body = await readJson(req);
    const action = cleanText(body.action, 20) || "dispatch";

    if (action === "dispatch") {
      const bookingId = cleanId(body.bookingId ?? body.booking_id);

      // Rate limited, but never to zero: the limit exists to stop a compromised token flooding
      // ops, not to ration emergencies. Ten an hour is far beyond any real use.
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supa
        .from("safety_sos_alerts")
        .select("id", { count: "exact", head: true })
        .eq("raiser_id", user.id)
        .gte("triggered_at", since);

      if ((count ?? 0) >= MAX_ALERTS_PER_HOUR) {
        return fail("too many alerts", origin, 429);
      }

      // Role is derived, not taken from the payload — it decides who ops calls back.
      const { data: xooter } = await supa
        .from("xooters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const raiserRole = xooter?.id ? "xooter" : "customer";

      // The address is the single most useful field and the one a caller in trouble is least
      // able to give. Snapshotted from the booking rather than referenced, so it survives the
      // booking being edited or deleted afterwards.
      let addressSnapshot: string | null = null;
      if (bookingId) {
        const { data: booking } = await supa
          .from("bookings")
          .select("id,address,user_id,xooter_id")
          .eq("id", bookingId)
          .maybeSingle();
        if (booking?.id) addressSnapshot = booking.address ?? null;
      }

      const latitude = Number.isFinite(body.latitude) ? (body.latitude as number) : null;
      const longitude = Number.isFinite(body.longitude) ? (body.longitude as number) : null;

      const { data: alert, error: insertError } = await supa
        .from("safety_sos_alerts")
        .insert({
          booking_id: bookingId || null,
          raiser_id: user.id,
          raiser_role: raiserRole,
          state: "dispatched",
          latitude,
          longitude,
          accuracy_m: Number.isFinite(body.accuracyM) ? (body.accuracyM as number) : null,
          address_snapshot: addressSnapshot,
          emergency_number_dialled: cleanText(body.dialled, 20) || null,
          silent: body.silent !== false,
          dispatched_at: new Date().toISOString(),
        })
        .select("id,state,triggered_at")
        .maybeSingle();

      if (insertError || !alert?.id) return fail("could not raise alert", origin, 500);

      // Best-effort, and deliberately after the alert is durable: a notification that fails
      // must not lose the record. Ops paging belongs on top of this row, not in place of it.
      await insertNotification(supa, {
        userId: user.id,
        kind: "safety_sos",
        title: "Emergency alert raised",
        body: "Xoot has your location and booking details. Help is being contacted.",
      }).catch(() => {});

      return ok({ id: alert.id, state: alert.state, addressKnown: Boolean(addressSnapshot) }, origin);
    }

    if (action === "cancel") {
      const alertId = cleanId(body.alertId ?? body.alert_id);
      if (!alertId) return fail("alert_id required", origin, 400);

      const { data: alert } = await supa
        .from("safety_sos_alerts")
        .select("id,raiser_id,state,triggered_at")
        .eq("id", alertId)
        .maybeSingle();

      if (!alert?.id || alert.raiser_id !== user.id) return fail("alert not found", origin, 404);
      if (alert.state !== "armed" && alert.state !== "dispatched") {
        return fail("alert is not open", origin, 409, { state: alert.state });
      }

      // Elapsed time is computed from the stored trigger, not from anything the client sends.
      // A client that could assert "still in the countdown" could cancel without the PIN.
      const elapsedSeconds = (Date.now() - new Date(alert.triggered_at).getTime()) / 1000;

      // A `dispatched` row is past the countdown by definition, whatever the clock says.
      //
      // The elapsed check alone was written for a design where the row is created when the
      // countdown STARTS and dispatches five seconds later. This function does not do that:
      // it inserts only at dispatch, and `triggered_at` defaults to `now()`, so elapsed was
      // ~0 at the moment of dispatch and stayed under five seconds for five seconds AFTER
      // it. That handed a free, PIN-less cancel to whoever held the phone in precisely the
      // window the PIN exists to close — `safety.ts` puts it plainly: once dispatched, the
      // person most motivated to cancel may be the person the alert is about.
      //
      // The elapsed branch is kept rather than replaced: nothing creates `armed` rows today,
      // but the table still defaults to that state, and if a future arm-then-dispatch path
      // does create them the countdown grace is correct for those.
      const needsPin = alert.state === "dispatched" || elapsedSeconds >= COUNTDOWN_SECONDS;

      if (needsPin) {
        const pin = cleanText(body.pin, 12);
        if (!pin) return fail("pin required to cancel a dispatched alert", origin, 403);

        const { data: verified, error: pinError } = await supa.rpc("verify_safety_pin", {
          check_user_id: user.id,
          check_pin: pin,
        });
        // An unverifiable PIN is a failed PIN. The alert stays up.
        if (pinError || verified !== true) return fail("pin incorrect", origin, 403);
      }

      // The row is never deleted. A cancelled alert is evidence, and a pattern of cancelled
      // alerts at one address is exactly the signal that would be lost by removing them.
      const { error: updateError } = await supa
        .from("safety_sos_alerts")
        .update({ state: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", alert.id)
        .in("state", ["armed", "dispatched"]);

      if (updateError) return fail("could not cancel alert", origin, 500);
      return ok({ id: alert.id, state: "cancelled", requiredPin: needsPin }, origin);
    }

    return fail("unknown action", origin, 400);
  } catch (_error) {
    return fail("sos request failed", origin, 500);
  }
});
