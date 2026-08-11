import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_SPLIT_PARTIES, MIN_SHARE_CENTS } from "./fare-split";

/**
 * A co-payer must never learn where the clean happens.
 *
 * ── The rule, and why it is a test rather than a comment ────────────────────────
 * Splitting a fare is a payment relationship, not an access grant. Someone paying toward a clean
 * sees the service, the date and their own amount — never the address, the notes, the household
 * profile or the access codes.
 *
 * The common case is a housemate, for whom none of this matters. The case that matters is the one
 * where it is not: an ex, a colleague, someone who offered to pay for a friend's clean. A booking
 * address is where a person lives, and the difference between those cases is invisible to the code.
 *
 * The leak would not arrive deliberately. It arrives as `select("*")` on a booking, or a response
 * that spreads a row instead of naming fields, six months from now, in a commit about something
 * else. So the shape is pinned here.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const fn = read("supabase/functions/split-booking-fare/index.ts");
const migration = read("supabase/migrations/20260811220000_booking_fare_splits.sql");

/**
 * The handler with comments removed, so a note explaining what is deliberately absent is not read
 * as the thing being present.
 *
 * This test tripped on its own documentation the first time it ran: the handler's header says
 * "`assertBookingParticipant` is deliberately NOT used to widen anything here", and the assertion
 * matched the raw file. Same trap `care-plus.test.ts` and `pricing-parity.test.ts` both record —
 * and it matters because a guard that fails on its own explanation teaches the next person to
 * delete the explanation rather than fix the code.
 */
const fnCode = fn.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Fields that must never reach a co-payer. */
const FORBIDDEN = [
  "address",
  "notes",
  "household_profile_id",
  "access_code",
  "gate_code",
];

describe("fare split privacy", () => {
  it("never selects a booking field a co-payer must not see", () => {
    // The function reads a booking exactly once, to check ownership and price. That select is
    // explicit, and this asserts what is in it.
    const selects = [...fn.matchAll(/\.select\("([^"]+)"\)/g)].map((match) => match[1]);
    expect(selects.length).toBeGreaterThan(0);
    for (const select of selects) {
      expect(select, "select(*) on a booking is how the address leaks").not.toBe("*");
      for (const field of FORBIDDEN) {
        expect(select, `a select asks for ${field}, which a co-payer must never receive`).not.toContain(field);
      }
    }
  });

  it("never mentions a forbidden field anywhere in the handler", () => {
    // Broader than the selects: catches a field reached through a second query, or interpolated
    // into an email payload.
    for (const field of FORBIDDEN) {
      expect(fnCode, `${field} appears in split-booking-fare`).not.toMatch(new RegExp(`booking\\.${field}\\b`));
    }
  });

  it("does not treat a co-payer as a booking participant", () => {
    // `assertBookingParticipant` counts admins and the assigned Xooter as participants and is the
    // right helper for chat and calls. Using it here would be the wrong shape: accepting a split
    // must not confer booking access, and only the owner may create one.
    expect(fnCode).not.toContain("assertBookingParticipant");
    expect(fn).toMatch(/booking\.user_id !== user\.id/);
  });

  it("keeps the split table's read policy off the bookings table", () => {
    // The RLS policy grants reads on split rows only. If it ever granted anything on `bookings`,
    // a co-payer would inherit the address through the join rather than through this function.
    const policy = migration.slice(
      migration.indexOf('create policy "fare split participants read"'),
      migration.indexOf("comment on policy"),
    );
    expect(policy).toContain("for select");
    // It may reference `bookings` to check ownership, but must not grant on it.
    expect(migration).not.toMatch(/create policy[^;]+on public\.bookings/);
  });

  it("blocks every client write to the split table", () => {
    // A client-writable split is worse than a client-writable booking: anyone could lower their
    // own share or raise someone else's, and the total would still look right.
    expect(migration).toMatch(/revoke insert, update, delete on public\.booking_fare_splits from anon, authenticated/);
    expect(migration).toMatch(/grant select on public\.booking_fare_splits to authenticated/);
    expect(migration).toMatch(/alter table public\.booking_fare_splits enable row level security/);
  });
});

describe("fare split integrity", () => {
  it("enforces the sum in the database, not only in the handler", () => {
    // The handler's check is where a helpful message lives. The trigger is what makes an
    // incorrect split impossible even if a future code path forgets to ask.
    expect(migration).toMatch(/create constraint trigger booking_fare_splits_sum_guard/);
    expect(migration).toMatch(/deferrable initially deferred/);
    expect(migration).toMatch(/must equal the booking total/);
  });

  it("judges the sum at commit, so a multi-row insert is not rejected mid-way", () => {
    // Without DEFERRED, inserting three shares fails on the first row for not yet summing to the
    // whole — which would make a correct split impossible to write.
    const guard = migration.slice(migration.indexOf("create constraint trigger"));
    expect(guard).toMatch(/deferrable initially deferred/);
  });

  it("excludes declined shares from the sum", () => {
    // A declined invitation is not an obligation. Counting it would make declining impossible
    // without rewriting every other share in the same statement.
    expect(migration).toMatch(/status <> 'declined'/);
  });

  it("cannot record two obligations for one person on one booking", () => {
    expect(migration).toMatch(/unique \(booking_id, invited_email\)/);
  });

  it("agrees with the client on the limits, because both check the same rules", () => {
    // The parity this repo already enforces for pricing. Two answers to "what is the smallest
    // share" means a form that accepts what the server rejects.
    expect(fn).toContain(`const MIN_SHARE_CENTS = ${MIN_SHARE_CENTS};`);
    expect(fn).toContain(`const MAX_SPLIT_PARTIES = ${MAX_SPLIT_PARTIES};`);
    expect(migration).toContain(`check (amount_cents >= ${MIN_SHARE_CENTS})`);
  });

  it("rounds rands to cents the same way the trigger does", () => {
    // `bookings.price` is numeric rands; shares are integer cents. If the handler truncated where
    // the trigger rounds, a correct-looking split would be rejected at commit with no clue why.
    expect(fn).toMatch(/Math\.round\(Number\(rands \?\? 0\) \* 100\)/);
    expect(migration).toMatch(/round\(price \* 100\)::integer/);
  });
});

describe("fare split honesty about money", () => {
  it("says collection is not configured, rather than implying a charge", () => {
    // No payment provider is connected. A response that omits this lets the UI imply a housemate
    // has paid when nothing can be charged — discovered at the worst possible moment.
    expect(fn).toMatch(/collectionConfigured: false/);
    expect(fn).toMatch(/provider_required: "Ozow\/Stitch credentials not connected"/);
    expect(fn).toMatch(/collection_pending: true/);
  });

  it("creates the payment row only on acceptance", () => {
    // `payment_records.user_id` is NOT NULL, so a row cannot exist before there is a real user to
    // own it — which is why `payer_user_id` is nullable until then.
    const acceptBlock = fn.slice(fn.indexOf("// Accepting creates the payment row"));
    expect(acceptBlock).toMatch(/from\("payment_records"\)\s*\.insert\(/);
    const createBlock = fn.slice(fn.indexOf('if (action === "create")'), fn.indexOf("// ── accept / decline"));
    expect(createBlock).not.toContain("payment_records");
  });

  it("refuses to split a booking that is already being paid", () => {
    expect(fn).toMatch(/already being paid/);
  });
});
