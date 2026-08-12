import {
  fail,
  getServiceClient,
  handlePreflight,
  json,
  readJson,
} from "../_shared/action-utils.ts";
import { consumeRateLimit } from "../_shared/governance-utils.ts";

/**
 * What someone sees when they open a fare-split invitation link.
 *
 * ── Why this exists at all ──────────────────────────────────────────────────────
 * The invitee arrives from a WhatsApp message. They have no Xoot account, no session, and no
 * reason to make one until they know what they are being asked to pay for. RLS on
 * `booking_fare_splits` grants reads to the organiser and the payer only, and both are signed-in
 * identities — so there is no client-side route to this answer, and widening the policy to create
 * one would make every split row readable by every signed-in user.
 *
 * So: service role, one row, four fields.
 *
 * ── ⚠️ The privacy rule, which this endpoint is the sharpest test of ─────────────
 * A co-payer sees the service, the date, their own amount and the organiser's **first name**.
 * They must NEVER see the address, the notes, the household profile or the access codes. This
 * function is the one place in the split feature where an unauthenticated stranger holding a
 * pasted link reaches a booking row, so the response is assembled field by field from three narrow
 * selects rather than by spreading anything. `fare-split-privacy.test.ts` asserts the shape.
 *
 * First name and not full name: the recipient already knows who sent them the message — they got
 * it from that person — so the name here is for recognition, not identification, and a surname
 * adds nothing they need and something they could look up.
 *
 * ── What the token does and does not authorise ──────────────────────────────────
 * It authorises *reading this preview*. It does not authorise accepting: that goes to
 * `split-booking-fare`, which additionally requires being signed in as `invited_email`. The token
 * stops enumeration; the email match stops a link forwarded into a group chat from making the
 * wrong person liable for someone else's clean.
 */

/** Human labels. Mirrors `SERVICE_LABELS` in `src/lib/fare-split-invite.ts`. */
const SERVICE_LABELS: Record<string, string> = {
  residential: "home clean",
  regular: "home clean",
  deep: "deep clean",
  premium: "premium clean",
  express: "express clean",
  airbnb: "Airbnb turnover clean",
  office: "office clean",
  moving: "moving clean",
  laundry: "laundry service",
};

const serviceLabelFor = (serviceType: unknown) =>
  SERVICE_LABELS[String(serviceType ?? "").toLowerCase()] ?? "clean";

/** First word only, and never more than a name's worth of characters. */
const firstNameOf = (fullName: unknown) => {
  const trimmed = typeof fullName === "string" ? fullName.trim() : "";
  if (!trimmed) return "Someone";
  return trimmed.split(/\s+/)[0].slice(0, 40);
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  try {
    const supa = getServiceClient();
    if (!supa) return fail("Service unavailable", origin, 503);

    const body = await readJson(req);
    const token = String(body.token ?? "").trim();
    // Hex, 48 characters — checked before the query so a malformed token costs a string compare
    // rather than an index lookup, and so nothing else can be smuggled into the filter.
    if (!/^[0-9a-f]{48}$/.test(token)) return fail("Invitation not found", origin, 404);

    /*
     * Rate limited on the caller's address, and worth being precise about what that buys.
     *
     * It does NOT meaningfully protect against enumeration — a token is 192 random bits, and an
     * attacker guessing them would use a different token every request, so no per-token limit
     * would ever trigger. Entropy is the defence there, and it is sufficient.
     *
     * What this bounds is an unauthenticated endpoint being used as a free database read in a
     * loop. Generous, because the legitimate pattern is a person opening a link, then reloading it
     * once because they were not sure it worked.
     */
    const forwarded = req.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimit = await consumeRateLimit(supa, {
      bucket: "booking.fare_split_invite",
      actor: `fare-split-invite:${forwarded.split(",")[0].trim()}`,
      action: "view",
      limitCount: 60,
      windowSeconds: 600,
    });
    if (!rateLimit.allowed) {
      return fail("Too many requests. Please wait a moment.", origin, 429);
    }

    const { data: split } = await supa
      .from("booking_fare_splits")
      .select("booking_id,invited_email,amount_cents,status,invited_by")
      .eq("invite_token", token)
      .maybeSingle();
    // Same response for "no such token" and for a malformed one, so this cannot be used to
    // distinguish a token that exists from one that does not.
    if (!split) return fail("Invitation not found", origin, 404);

    /*
     * Two fields off the booking, named explicitly.
     *
     * `select("*")` here would be the leak: it would put the address, the notes and the access
     * instructions one `...booking` spread away from a response served to an anonymous caller.
     * That is not a hypothetical — it is how this exact class of bug arrives, in a commit about
     * something else, six months from now.
     */
    const { data: booking } = await supa
      .from("bookings")
      .select("scheduled_at,service_type,payment_status")
      .eq("id", split.booking_id)
      .maybeSingle();
    if (!booking) return fail("Invitation not found", origin, 404);

    const { data: organiser } = await supa
      .from("profiles")
      .select("full_name")
      .eq("id", split.invited_by)
      .maybeSingle();

    return json(
      {
        ok: true,
        // Echoed so the sign-in prompt can say which address to use. It is the address the link
        // was sent to, so its holder already knows it.
        invitedEmail: split.invited_email,
        amountCents: split.amount_cents,
        status: split.status,
        serviceLabel: serviceLabelFor(booking.service_type),
        scheduledAt: booking.scheduled_at,
        organiserName: firstNameOf(organiser?.full_name),
        // No payment provider is connected. Said in the payload so the page cannot imply a charge
        // by omitting it — the person reading this is being asked for money by a stranger's app,
        // and "nothing will be taken" is the single most important sentence on the screen.
        collectionConfigured: false,
      },
      200,
      origin,
    );
  } catch (err) {
    console.error("fare-split-invite failure", err);
    return fail("Request failed", origin, 500);
  }
});
