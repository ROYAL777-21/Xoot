import {
  fail,
  handlePreflight,
  insertOutbox,
  json,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";
import { consumeRateLimit } from "../_shared/governance-utils.ts";

/**
 * Creating and answering a split of one booking's cost between several people.
 *
 * ── What this does, precisely ───────────────────────────────────────────────────
 * It records **who owes what**. It does not collect money. Nothing in Xoot collects money yet:
 * `create-booking` writes `provider_required: "Ozow/Stitch credentials not connected"` and every
 * `payment_records` row moves `pending → admin_confirmed → paid` by hand. An accepted share gets
 * its own payment row so it is independently collectable the moment a provider is connected.
 *
 * Saying that plainly matters more than it looks: a screen that reads "split sent" while nothing
 * can be charged is the kind of half-truth that gets discovered at the worst moment, by the person
 * who assumed their housemate had paid.
 *
 * ── Why this is an Edge Function rather than client writes ──────────────────────
 * `client_write_surface_lockdown` left `bookings` with one policy — `bookings_participant_read`,
 * SELECT only — and `booking_fare_splits` follows it: participants read, nobody writes. A
 * client-writable split table would be worse than a client-writable booking, because anyone could
 * lower their own share or raise someone else's and the total would still look right.
 *
 * ── ⚠️ The privacy rule ─────────────────────────────────────────────────────────
 * A co-payer sees the service, the date and their own amount. They must NEVER receive the address,
 * the notes, the household profile or the access codes. Accepting a split does not make someone a
 * booking participant — `assertBookingParticipant` is deliberately NOT used to widen anything here,
 * and every response in this file is assembled field by field rather than spreading a booking row.
 *
 * The common case is a housemate. The case that matters is the one where it is not, and a booking
 * address is where somebody lives.
 */

/** Mirrors `src/lib/fare-split.ts`. Kept in step by `fare-split-parity.test.ts`. */
const MIN_SHARE_CENTS = 1000;
const MAX_SPLIT_PARTIES = 6;

const normaliseEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase().slice(0, 200) : "";

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Rands numeric on `bookings` → cents. Rounded, matching the database trigger exactly. */
const toCents = (rands: unknown) => Math.round(Number(rands ?? 0) * 100);

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  try {
    const { response: authFailure, user, supa } = await requireAuth(req, origin);
    if (authFailure || !user || !supa) return authFailure ?? fail("Authentication required", origin, 401);

    const body = await readJson(req);
    const action = String(body.action ?? "");
    if (!["create", "accept", "decline"].includes(action)) {
      return fail("action must be create, accept or decline", origin, 400);
    }

    // Placed before any work but after authentication: rate-limiting an unauthenticated caller
    // would let anyone burn a stranger's budget by guessing ids.
    const rateLimit = await consumeRateLimit(supa, {
      bucket: "booking.fare_split",
      actor: `fare-split:${user.id}`,
      action,
      limitCount: 20,
      windowSeconds: 600,
    });
    if (!rateLimit.allowed) {
      return fail("Too many split requests. Please wait a moment.", origin, 429);
    }

    if (action === "create") {
      const bookingId = String(body.bookingId ?? "");
      if (!bookingId) return fail("bookingId required", origin, 400);

      // Only the person who booked may split it. Not "a participant" — the assigned Xooter must
      // never be able to decide who pays for the job they are being paid for.
      const { data: booking } = await supa
        .from("bookings")
        .select("id,user_id,price,payment_status,scheduled_at,service_type")
        .eq("id", bookingId)
        .maybeSingle();
      if (!booking || booking.user_id !== user.id) {
        // One response for "no such booking" and for "not yours", so this cannot be used to
        // discover which booking ids exist.
        return fail("Booking not found", origin, 404);
      }
      if (booking.payment_status && booking.payment_status !== "pending") {
        return fail("This booking is already being paid — it cannot be split now.", origin, 409);
      }

      const rawShares = Array.isArray(body.shares) ? body.shares : [];
      if (rawShares.length < 2) return fail("A split needs at least two people.", origin, 400);
      if (rawShares.length > MAX_SPLIT_PARTIES) {
        return fail(`A booking can be split between at most ${MAX_SPLIT_PARTIES} people.`, origin, 400);
      }

      const shares = rawShares.map((share: Record<string, unknown>) => ({
        email: normaliseEmail(share.email),
        amountCents: Math.round(Number(share.amountCents ?? 0)),
      }));

      if (shares.some((share) => !isEmail(share.email))) {
        return fail("Every person needs a valid email address.", origin, 400);
      }
      if (new Set(shares.map((share) => share.email)).size !== shares.length) {
        return fail("The same person is listed twice.", origin, 400);
      }
      if (shares.some((share) => !Number.isInteger(share.amountCents) || share.amountCents < MIN_SHARE_CENTS)) {
        return fail(`Each share must be at least R${MIN_SHARE_CENTS / 100}.`, origin, 400);
      }

      const totalCents = toCents(booking.price);
      const sum = shares.reduce((running, share) => running + share.amountCents, 0);
      if (sum !== totalCents) {
        // Checked here so the caller gets a useful message, and again by the database trigger so
        // it is impossible rather than merely checked.
        return fail("The shares must add up to exactly the booking total.", origin, 400);
      }

      // Replace rather than append: re-splitting is a normal thing to do, and leaving the previous
      // rows would double the obligation and trip the sum guard at commit.
      await supa.from("booking_fare_splits").delete().eq("booking_id", bookingId);

      const { error: insertError } = await supa.from("booking_fare_splits").insert(
        shares.map((share) => ({
          booking_id: bookingId,
          invited_email: share.email,
          amount_cents: share.amountCents,
          invited_by: user.id,
          status: "invited",
        })),
      );
      if (insertError) {
        console.error("fare split insert failed", insertError);
        return fail("Could not save this split.", origin, 500);
      }

      // Invitations carry the amount, the service and the date. No address, no notes, no codes.
      await insertOutbox(
        supa,
        shares.map((share) => ({
          source_table: "booking_fare_splits",
          source_id: bookingId,
          event_type: "fare_split_invited",
          channel: "brevo_email",
          owner: "growth",
          stack_tool: "brevo",
          payload: {
            to: share.email,
            amount_cents: share.amountCents,
            service_type: booking.service_type,
            scheduled_at: booking.scheduled_at,
            // Stated in the payload so the template cannot imply a charge has happened.
            collection_pending: true,
          },
        })),
      );

      return json({ ok: true, shares: shares.length, totalCents, collectionConfigured: false }, 200, origin);
    }

    // ── accept / decline ──────────────────────────────────────────────────────────
    const splitId = String(body.splitId ?? "");
    if (!splitId) return fail("splitId required", origin, 400);

    const { data: split } = await supa
      .from("booking_fare_splits")
      .select("id,booking_id,invited_email,amount_cents,status,payer_user_id")
      .eq("id", splitId)
      .maybeSingle();
    if (!split) return fail("Split not found", origin, 404);

    // The invitation is addressed to an email. The person accepting must be signed in as that
    // email — an id alone is not enough, because the row has no payer until this moment.
    const callerEmail = normaliseEmail(user.email);
    if (!callerEmail || callerEmail !== split.invited_email) {
      return fail("Split not found", origin, 404);
    }
    if (split.status !== "invited") {
      return fail("This split has already been answered.", origin, 409);
    }

    if (action === "decline") {
      const { error } = await supa
        .from("booking_fare_splits")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", splitId);
      if (error) {
        console.error("fare split decline failed", error);
        return fail("Could not record that.", origin, 500);
      }
      // The organiser has to re-split before the booking can be collected, so tell them.
      await insertOutbox(supa, {
        source_table: "booking_fare_splits",
        source_id: split.booking_id,
        event_type: "fare_split_declined",
        channel: "in_app",
        owner: "growth",
        stack_tool: "supabase",
        payload: { split_id: splitId, amount_cents: split.amount_cents },
      });
      return json({ ok: true, status: "declined" }, 200, origin);
    }

    // Accepting creates the payment row: now there is a real user to own it, which is why
    // `payer_user_id` is nullable until here.
    const providerReference = `zoot_split_${splitId}_${Date.now()}`;
    const { data: payment, error: paymentError } = await supa
      .from("payment_records")
      .insert({
        booking_id: split.booking_id,
        user_id: user.id,
        amount: split.amount_cents / 100,
        currency: "ZAR",
        status: "pending",
        provider: "manual_pending",
        provider_reference: providerReference,
        payment_kind: "booking",
        meta: {
          fare_split_id: splitId,
          provider_required: "Ozow/Stitch credentials not connected",
        },
      })
      .select("id")
      .single();
    if (paymentError || !payment?.id) {
      console.error("fare split payment record failed", paymentError);
      return fail("Could not record your share.", origin, 500);
    }

    const { error: acceptError } = await supa
      .from("booking_fare_splits")
      .update({
        status: "accepted",
        payer_user_id: user.id,
        payment_record_id: payment.id,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", splitId);
    if (acceptError) {
      console.error("fare split accept failed", acceptError);
      return fail("Could not record your share.", origin, 500);
    }

    /*
     * Deliberately narrow. This is the response a co-payer receives, and it names every field it
     * returns rather than spreading a booking row — which is what would quietly leak an address
     * the first time someone added a `select("*")` upstream.
     */
    return json(
      {
        ok: true,
        status: "accepted",
        amountCents: split.amount_cents,
        // No payment provider is connected, so nothing has been charged. Said in the payload so
        // the UI cannot imply otherwise by omission.
        collectionConfigured: false,
      },
      200,
      origin,
    );
  } catch (err) {
    console.error("split-booking-fare failure", err);
    return fail("Request failed", origin, 500);
  }
});
