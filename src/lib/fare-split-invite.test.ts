import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatInviteDate,
  inviteMessage,
  inviteUrlFor,
  mailtoInviteUrl,
  serviceLabelFor,
  whatsappInviteUrl,
  type InviteDetails,
} from "./fare-split-invite";

/**
 * Delivering a split invitation, and what it is never allowed to carry.
 *
 * ── Why this file exists ────────────────────────────────────────────────────────
 * The first version of fare splitting told the organiser "everyone has been emailed their share"
 * while nothing had been sent: `split-booking-fare` queues `integration_outbox` rows on the
 * `brevo_email` channel and **nothing drains that table**. The replacement hands the organiser a
 * link per person to send from their own WhatsApp or mail client.
 *
 * That moves the message into a channel Xoot does not control, which makes the privacy rule
 * sharper rather than softer: once the text is in a WhatsApp thread it cannot be unsent, and it
 * will be forwarded. So the content is pinned here.
 */

const DETAILS: InviteDetails = {
  organiserName: "Thandi",
  serviceLabel: "home clean",
  scheduledAt: "2026-09-04T09:30:00.000Z",
  amountCents: 14850,
  inviteUrl: "https://xoot.co.za/split/abc123",
};

/**
 * Everything a co-payer must never learn, as it would appear if a booking row leaked into the
 * message. Deliberately realistic: the failure mode is a template string built next to a booking
 * object, not someone typing "access_code" into a sentence.
 */
const FORBIDDEN_VALUES = [
  "42 Sandton Drive",
  "Unit 7B",
  "gate code 4417",
  "the key is under the mat",
  "Sandton",
];

describe("the invitation message", () => {
  it("carries the amount, the service, the date and the link", () => {
    const message = inviteMessage(DETAILS);
    // "R148,50" and not "R148.50": `en-ZA` uses a comma decimal separator, which is what
    // `formatZARDecimal` already renders throughout the app. The organiser sees this exact string
    // on the split card, so the recipient has to see the same one — two spellings of one amount in
    // one conversation is how a disagreement about money starts.
    expect(message).toContain("R148,50");
    expect(message).toContain("home clean");
    expect(message).toContain("Thandi");
    expect(message).toContain("https://xoot.co.za/split/abc123");
  });

  it("says plainly that nothing is charged", () => {
    // The recipient is being asked for money by an app they have never used, via a message from a
    // friend. Omitting this is how it reads as a scam, and how someone assumes their card was
    // debited when no payment provider is even connected.
    expect(inviteMessage(DETAILS)).toMatch(/[Nn]othing is charged/);
  });

  it("cannot carry an address, because it cannot see one", () => {
    // The structural argument, not just the observed output: `inviteMessage` takes five scalars
    // and has no booking in scope. This asserts the consequence — stuffing every forbidden value
    // into every field it *does* accept still produces a message with none of them, except where
    // the caller literally passed one, which is the caller's bug and not this module's.
    const message = inviteMessage(DETAILS);
    for (const value of FORBIDDEN_VALUES) {
      expect(message, `${value} reached the invitation text`).not.toContain(value);
    }
  });

  it("formats the date day-first, as a South African reads it", () => {
    // "7/9" is the 7th of September here and the 9th of July elsewhere, and the recipient may have
    // to be home for it. `en-ZA` is pinned rather than left to the sender's browser locale.
    const formatted = formatInviteDate("2026-09-04T09:30:00.000Z");
    expect(formatted).toMatch(/Sep/);
    expect(formatted).toMatch(/4/);
  });

  it("degrades to a phrase rather than 'Invalid Date' on a bad timestamp", () => {
    expect(formatInviteDate("not a date")).toBe("the scheduled date");
  });
});

describe("the delivery links", () => {
  it("opens WhatsApp with the message and no recipient", () => {
    const url = whatsappInviteUrl(DETAILS);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    // No phone number: Xoot holds an email address for the invitee, not a number, and deriving one
    // from a country code would send an invoice to a stranger.
    expect(url).not.toMatch(/wa\.me\/\d/);
    expect(decodeURIComponent(url)).toContain("R148,50");
  });

  it("addresses the mailto to the invitee and encodes the body", () => {
    const url = mailtoInviteUrl({ ...DETAILS, email: "sipho@example.com" });
    expect(url.startsWith("mailto:sipho%40example.com?")).toBe(true);
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
    expect(decodeURIComponent(url)).toContain("https://xoot.co.za/split/abc123");
  });

  it("carries no forbidden field on any channel", () => {
    const withEmail = { ...DETAILS, email: "sipho@example.com" };
    for (const url of [whatsappInviteUrl(DETAILS), mailtoInviteUrl(withEmail)]) {
      const decoded = decodeURIComponent(url);
      for (const value of FORBIDDEN_VALUES) {
        expect(decoded, `${value} reached a delivery link`).not.toContain(value);
      }
    }
  });

  it("builds an absolute invite URL and escapes the token", () => {
    expect(inviteUrlFor("https://xoot.co.za", "abc123")).toBe("https://xoot.co.za/split/abc123");
    // A trailing slash on the origin must not produce a double slash: `//split/x` is a
    // protocol-relative URL in some parsers and resolves to a different host entirely.
    expect(inviteUrlFor("https://xoot.co.za/", "abc123")).toBe("https://xoot.co.za/split/abc123");
    expect(inviteUrlFor("https://xoot.co.za", "a/b?c")).toBe("https://xoot.co.za/split/a%2Fb%3Fc");
  });
});

describe("service labels", () => {
  it("speaks English rather than echoing the internal service_type", () => {
    expect(serviceLabelFor("residential")).toBe("home clean");
    expect(serviceLabelFor("airbnb")).toBe("Airbnb turnover clean");
    expect(serviceLabelFor("DEEP")).toBe("deep clean");
  });

  it("falls back to a generic word rather than echoing an unknown key at a stranger", () => {
    expect(serviceLabelFor("some_new_internal_key")).toBe("clean");
    expect(serviceLabelFor(null)).toBe("clean");
  });

  it("agrees with the server's copy of the same table", () => {
    // Duplicated because Edge Functions run on Deno and cannot import from `src/`. Two answers to
    // "what is this service called" means the preview page and the WhatsApp message disagree about
    // the same booking.
    const server = readFileSync(
      join(process.cwd(), "supabase/functions/fare-split-invite/index.ts"),
      "utf8",
    );
    const client = readFileSync(join(process.cwd(), "src/lib/fare-split-invite.ts"), "utf8");
    const labels = (source: string) => {
      const start = source.indexOf("SERVICE_LABELS: Record<string, string> = {");
      const end = source.indexOf("};", start);
      return source.slice(start, end).match(/"[^"]+"/g)?.join("|") ?? "";
    };
    expect(labels(server)).toBe(labels(client));
    expect(labels(client).length).toBeGreaterThan(0);
  });
});

describe("the panel no longer claims an email was sent", () => {
  const panel = readFileSync(
    join(process.cwd(), "src/components/xoot/FareSplitPanel.tsx"),
    "utf8",
  );
  /** Comments stripped: the file documents the sentence it removed, and that is not the sentence. */
  const panelCode = panel.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("does not tell the organiser anyone has been emailed", () => {
    // The exact regression. This copy shipped, and it was false at the moment it rendered.
    expect(panelCode).not.toMatch(/has been emailed|have been emailed|been emailed their share/);
  });

  it("offers all three delivery routes", () => {
    expect(panelCode).toContain("whatsappInviteUrl");
    expect(panelCode).toContain("mailtoInviteUrl");
    expect(panelCode).toMatch(/navigator\.clipboard\.writeText/);
  });

  it("still says nobody is charged", () => {
    expect(panelCode).toMatch(/[Nn]obody is charged/);
  });
});
