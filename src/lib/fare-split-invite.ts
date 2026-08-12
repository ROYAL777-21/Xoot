/**
 * Turning a recorded share into a message the organiser can actually send.
 *
 * ── The problem this solves ─────────────────────────────────────────────────────
 * `split-booking-fare` writes each invitation to `integration_outbox` on the `brevo_email`
 * channel, and **nothing drains that table**. There is no Brevo integration, no sender and no
 * scheduled job — `admin-mark-outbox` lets an admin tick a row off by hand and that is all. So
 * the panel's success toast said "everyone has been emailed their share" while nobody received
 * anything, which is precisely the class of half-truth the rest of this feature was written to
 * avoid.
 *
 * The honest fix is not to buy an email provider. It is to let the organiser send the message
 * themselves, from their own WhatsApp or mail client. In South Africa that is the channel people
 * actually read, it needs no deliverability configuration, and — the part that matters — it is
 * true the moment they tap it.
 *
 * ── Why this is a module and not three template strings in a component ──────────
 * Because of what must NOT be in the message. A co-payer sees the service, the date and their own
 * amount; never the address, the notes, the household profile or the access codes. Composing that
 * text inside a component means the rule lives wherever someone happens to be editing JSX, next
 * to a `booking` object that has all of it in scope. Here the builders cannot see a booking at
 * all — they take four scalars — and `fare-split-privacy.test.ts` asserts the output over a
 * booking stuffed with forbidden fields.
 */

/** Everything a share invitation is allowed to know. Deliberately not a booking row. */
export type InviteDetails = {
  /** Who is asking. First name only — a full name is more identifying than this needs to be. */
  organiserName: string;
  /** Human service label, e.g. "Regular clean". Never the internal service_type key. */
  serviceLabel: string;
  /** ISO timestamp of the booking. */
  scheduledAt: string;
  amountCents: number;
  /** Absolute URL of the /split/:token page. */
  inviteUrl: string;
};

/**
 * The date, as a South African would say it out loud.
 *
 * `en-ZA` rather than the browser locale: the message is written by a South African organiser to a
 * South African recipient about a booking in South Africa, and a machine in a different locale
 * composing "7/9/2026" for a reader who will parse it day-first is a real ambiguity about a date
 * someone has to be home for.
 */
export const formatInviteDate = (scheduledAt: string): string => {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return "the scheduled date";
  return date.toLocaleString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatRands = (cents: number) =>
  `R${(Math.round(cents) / 100).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * The message body, shared by every channel so WhatsApp and email cannot drift apart.
 *
 * It states plainly that nothing is charged. That sentence is load-bearing: no payment provider is
 * connected, so a recipient who reads "pay your share" and assumes a card was debited has been
 * misled by omission — and they will find out from their housemate, not from us.
 */
export function inviteMessage(details: InviteDetails): string {
  return [
    `${details.organiserName} booked a ${details.serviceLabel} with Xoot for ${formatInviteDate(details.scheduledAt)}`,
    `and asked you to cover ${formatRands(details.amountCents)} of it.`,
    "",
    details.inviteUrl,
    "",
    "Nothing is charged automatically — card payments aren't switched on yet, so you'll settle up",
    `with ${details.organiserName} directly. The link just confirms you're in.`,
  ].join("\n");
}

/**
 * A `wa.me` link with the message prefilled.
 *
 * No phone number in the URL, deliberately. `https://wa.me/?text=…` opens WhatsApp with the
 * message ready and lets the organiser pick the contact, which is both fewer fields to fill in and
 * the only version that works — Xoot has an email address for the invitee, not a phone number, and
 * inventing one from a country code would send an invoice to a stranger.
 */
export const whatsappInviteUrl = (details: InviteDetails): string =>
  `https://wa.me/?text=${encodeURIComponent(inviteMessage(details))}`;

/**
 * A `mailto:` link, addressed to the invitee, sent from the organiser's own mail client.
 *
 * This is the "carried through email" half, and it is worth being clear about what it is not: it
 * is not transactional email. Nothing is queued, nothing is delivered by Xoot, and there is no
 * bounce handling. The organiser's own outbox is the audit trail, which is a downgrade in
 * observability and an upgrade in actually-arriving.
 */
export const mailtoInviteUrl = (details: InviteDetails & { email: string }): string => {
  const subject = `Your share of the Xoot clean — ${formatRands(details.amountCents)}`;
  return `mailto:${encodeURIComponent(details.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(inviteMessage(details))}`;
};

/**
 * The absolute invite URL for a token.
 *
 * Absolute because the link leaves the app: a relative path pasted into WhatsApp is not a link.
 * `origin` is passed in rather than read from `window` so this stays a pure function and can be
 * tested without a DOM.
 */
export const inviteUrlFor = (origin: string, token: string): string =>
  `${origin.replace(/\/+$/, "")}/split/${encodeURIComponent(token)}`;

/**
 * Human labels for the internal `service_type` vocabulary.
 *
 * The raw values (`residential`, `deep`, `premium`, …) are the booking flow's own words and mean
 * nothing to someone who did not make the booking. Falls back to a generic "clean" rather than
 * echoing an unknown key at a stranger.
 */
export const SERVICE_LABELS: Record<string, string> = {
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

export const serviceLabelFor = (serviceType: string | null | undefined): string =>
  SERVICE_LABELS[String(serviceType ?? "").toLowerCase()] ?? "clean";
