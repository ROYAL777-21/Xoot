#!/usr/bin/env node
/**
 * Put the staging smoke booking into the window where the call button actually renders.
 *
 * ── Why this script exists ──────────────────────────────────────────────────────
 * The two-party voice call has never been testable, and the reason was invisible. The runbook
 * said "set the booking to en_route", which is necessary and **not sufficient**:
 *
 *   maskedCallAvailable = status ∈ {en_route, in_progress}
 *                         AND canAccessSensitiveBookingData(...)
 *
 * and that second half (`src/lib/operations.ts:275`) is a **time window**, open from
 * `scheduled_at − 45 minutes` to `scheduled_at + duration + 30 minutes`. Staging's smoke booking
 * was dated 28 June. So someone could follow every documented step exactly, correctly, and still
 * find no call button — with nothing on screen explaining why.
 *
 * The window is also only a few hours wide, so the second attempt hits the same wall as the first.
 * That is what makes this a script rather than a one-off SQL statement: re-arming has to be cheap
 * enough that nobody is tempted to skip it and conclude the feature is broken.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────────
 *   XOOT_STAGING_SUPABASE_URL=... XOOT_STAGING_SERVICE_ROLE_KEY=... \
 *     node scripts/ops/arm-call-test.mjs
 *
 * Optionally set both smoke passwords at the same time:
 *   XOOT_CALL_TEST_PASSWORD='...' node scripts/ops/arm-call-test.mjs --set-passwords
 *
 * ⚠️ STAGING ONLY. It refuses any project ref that is not staging, because everything it does —
 * rewriting a booking's schedule, forcing a status, resetting passwords — is destructive to real
 * data and harmless to smoke data. The two accounts it touches have `.local` addresses that cannot
 * receive mail and exist for exactly this.
 */
import { createClient } from "@supabase/supabase-js";

const STAGING_PROJECT_REF = "fxmxyabdjqviqbcxmvlp";
const BOOKING_ID = "10000000-0000-4000-8000-000000000401";
const CLIENT_EMAIL = "phase1-smoke-client@staging.xoothome.local";
const XOOTER_EMAIL = "phase1-smoke-xooter@staging.xoothome.local";

/** Hours the booking is said to run. Sets how long the window stays open after the start. */
const DURATION_HOURS = 4;
/**
 * Start the booking slightly in the past.
 *
 * Not `now()` exactly: a booking that starts this instant reads as "about to happen" on screen,
 * and a Xooter marked `en_route` for a job that has not started yet is a state the product does
 * not really have. Fifteen minutes ago is a job in progress, which is what is being tested.
 */
const START_OFFSET_MINUTES = 15;

const args = new Set(process.argv.slice(2));
const env = (name) => String(process.env[name] ?? "").trim();

const fail = (message) => {
  console.error(`arm-call-test: ${message}`);
  process.exit(1);
};
const info = (message) => console.log(`[arm-call-test] ${message}`);

const url = env("XOOT_STAGING_SUPABASE_URL");
const serviceRoleKey = env("XOOT_STAGING_SERVICE_ROLE_KEY");

if (!url || !serviceRoleKey) {
  fail(
    "Set XOOT_STAGING_SUPABASE_URL and XOOT_STAGING_SERVICE_ROLE_KEY in your shell.\n" +
      "  Do not paste them into a chat or commit them.",
  );
}

// The guard that makes the destructive parts safe to write at all.
if (!url.includes(STAGING_PROJECT_REF)) {
  fail(
    `Refusing to run: XOOT_STAGING_SUPABASE_URL does not point at staging (${STAGING_PROJECT_REF}).\n` +
      "  This script rewrites a booking's schedule and status, and optionally resets passwords.\n" +
      "  On production that is data loss, so it is refused rather than confirmed.",
  );
}

const supa = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

const scheduledAt = new Date(Date.now() - START_OFFSET_MINUTES * 60_000);
const windowOpens = new Date(scheduledAt.getTime() - 45 * 60_000);
const windowCloses = new Date(scheduledAt.getTime() + DURATION_HOURS * 3_600_000 + 30 * 60_000);

const { error: bookingError } = await supa
  .from("bookings")
  .update({
    scheduled_at: scheduledAt.toISOString(),
    duration_hours: DURATION_HOURS,
    status: "en_route",
    cancelled_at: null,
    job_completed_at: null,
  })
  .eq("id", BOOKING_ID);

if (bookingError) fail(`could not arm the booking: ${bookingError.message}`);

if (args.has("--set-passwords")) {
  const password = env("XOOT_CALL_TEST_PASSWORD");
  if (password.length < 12) {
    fail("--set-passwords needs XOOT_CALL_TEST_PASSWORD set to at least 12 characters.");
  }
  for (const email of [CLIENT_EMAIL, XOOTER_EMAIL]) {
    // Look the id up rather than filtering by email: the admin API updates by id only.
    const { data: list, error: listError } = await supa.auth.admin.listUsers({ perPage: 200 });
    if (listError) fail(`could not list users: ${listError.message}`);
    const user = list.users.find((candidate) => candidate.email === email);
    if (!user) fail(`no staging account for ${email}`);
    const { error } = await supa.auth.admin.updateUserById(user.id, { password });
    if (error) fail(`could not set the password for ${email}: ${error.message}`);
    info(`password set for ${email}`);
  }
}

/*
 * Re-read rather than trusting the write.
 *
 * The whole point of this script is that the gate is invisible, so reporting "armed" without
 * checking the three conditions would reproduce the original problem in a new place.
 */
const { data: booking, error: readError } = await supa
  .from("bookings")
  .select("id,status,scheduled_at,duration_hours,cancelled_at")
  .eq("id", BOOKING_ID)
  .maybeSingle();

if (readError || !booking) fail(`armed the booking but could not read it back: ${readError?.message}`);

const now = Date.now();
const start = new Date(booking.scheduled_at).getTime();
const checks = {
  "status is en_route or in_progress": ["en_route", "in_progress"].includes(booking.status),
  "not cancelled": !booking.cancelled_at,
  "window is open (start − 45 min)": now >= start - 45 * 60_000,
  "window has not closed (start + duration + 30 min)":
    now <= start + Number(booking.duration_hours ?? 0) * 3_600_000 + 30 * 60_000,
};

console.log("");
for (const [label, pass] of Object.entries(checks)) {
  console.log(`  ${pass ? "✅" : "❌"} ${label}`);
}

if (Object.values(checks).some((pass) => !pass)) {
  fail("the booking is not callable — see the failed check above.");
}

const appOrigin = env("XOOT_STAGING_APP_ORIGIN") || "https://staging.xoot.co.za";
console.log(`
  Armed until ${windowCloses.toISOString()} (about ${Math.round(
    (windowCloses.getTime() - now) / 60_000,
  )} minutes).
  Window opened  ${windowOpens.toISOString()}

  Sign in as these two, in TWO DIFFERENT BROWSERS (a private window is not enough —
  it shares the session store, so you end up calling yourself):

    customer  ${CLIENT_EMAIL}
    Xooter    ${XOOTER_EMAIL}

  Then open, on both:
    ${appOrigin}/app/bookings/${BOOKING_ID}

  Grant the microphone when asked, and press call on one side.
  Re-run this script to re-arm when the window closes.
`);
