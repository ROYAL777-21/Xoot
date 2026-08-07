import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards on the server-side paths that replaced client writes.
 *
 * `20260802120000_client_write_surface_lockdown.sql` revoked the client's ability to write
 * training results and job state. These functions are what took over, so the properties that
 * make them safe need to be asserted somewhere — otherwise the next edit quietly reintroduces
 * the hole the migration closed.
 *
 * Source-level assertions rather than integration tests: the functions are Deno and the suite
 * is vitest, and the failure modes worth catching here are structural (trusting the payload
 * for identity, echoing the answer key) rather than behavioural.
 */

const root = process.cwd();
const codeOf = (path: string) =>
  readFileSync(join(root, path), "utf8")
    // Strip comments so a rule explained in prose cannot satisfy a test looking for the rule.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const training = codeOf("supabase/functions/training-module/index.ts");
const jobs = codeOf("supabase/functions/respond-zooter-job/index.ts");
const lockdown = readFileSync(
  join(root, "supabase/migrations/20260802120000_client_write_surface_lockdown.sql"),
  "utf8",
);
const serverPaths = readFileSync(
  join(root, "supabase/migrations/20260802140000_training_answer_key_and_job_state.sql"),
  "utf8",
);

describe("training is graded by the server", () => {
  it("never returns the correct-answer index to a client", () => {
    // `quiz_questions` entries are { q, a[], correct }. The whole point of grading server-side
    // is undone if `correct` rides along in the questions response.
    expect(training).toMatch(/withoutAnswers/);
    const stripper = training.slice(training.indexOf("function withoutAnswers"));
    const body = stripper.slice(0, stripper.indexOf("}\n"));
    expect(body).not.toMatch(/correct/);
  });

  it("does not tell a failed attempt which answers were wrong", () => {
    // Otherwise the daily attempt limit becomes a guided search rather than a brake.
    const response = training.slice(training.lastIndexOf("return ok("));
    expect(response).not.toMatch(/wrongIndexes|incorrect|answers/);
  });

  it("takes the user from the verified session, never the request body", () => {
    expect(training).toMatch(/user_id:\s*user\.id/);
    expect(training).not.toMatch(/user_id:\s*body\./);
    expect(training).not.toMatch(/body\.userId|body\.user_id/);
  });

  it("counts an unanswered question as wrong", () => {
    // Scoring only the submitted answers would make a one-answer submission a 100%.
    expect(training).toMatch(/questions\.length/);
    expect(training).toMatch(/answers\[index\]\s*===\s*question\.correct/);
  });

  it("rate limits attempts before grading them", () => {
    const gradeAt = training.indexOf("const { score, correct, total } = grade(");
    const limitAt = training.indexOf("MAX_ATTEMPTS_PER_DAY");
    expect(limitAt).toBeGreaterThan(-1);
    expect(limitAt).toBeLessThan(gradeAt);
  });

  it("hides the answer key at the database level too", () => {
    // Revoking the write without revoking the read leaves a Xooter free to look up the answers
    // and then submit a perfect attempt through the legitimate path.
    expect(serverPaths).toMatch(/grant_select_except\('training_modules',\s*array\['quiz_questions'\]\)/);
  });
});

describe("job state is a server transition", () => {
  it("derives ownership from the session rather than the payload", () => {
    // Reading the zooter from the caller and comparing to the job is the safe direction;
    // taking zooter_id from the body and looking the job up by it is not.
    expect(jobs).toMatch(/\.eq\("user_id",\s*user\.id\)/);
    expect(jobs).not.toMatch(/body\.zooterId|body\.zooter_id/);
  });

  it("does not confirm that someone else's job exists", () => {
    // Distinguishing "not found" from "not yours" is enough to enumerate the dispatch queue.
    const denial = jobs.slice(jobs.indexOf("zooter.id !== job.zooter_id"));
    expect(denial.slice(0, 200)).toMatch(/job not found/);
  });

  it("makes the update conditional on the state it read", () => {
    // Two devices racing must produce one winner, not a decline overwriting an accept.
    expect(jobs).toMatch(/\.eq\("state",\s*job\.state\)/);
  });

  it("treats an unevaluable rule as a failure", () => {
    expect(jobs).toMatch(/if\s*\(ruleError\)\s*return fail/);
    expect(jobs).toMatch(/allowed\s*!==\s*true/);
  });

  it("keeps terminal states terminal", () => {
    // Nothing may leave declined, expired or cancelled — otherwise a Xooter can un-decline a
    // job once a better one appears.
    const rule = serverPaths.slice(serverPaths.indexOf("zooter_job_transition_allowed"));
    const pairs = [...rule.matchAll(/\('(\w+)',\s*'(\w+)'\)/g)].map((m) => m[1]);
    expect(pairs).not.toContain("declined");
    expect(pairs).not.toContain("expired");
    expect(pairs).not.toContain("cancelled");
  });

  it("keeps the transition rule out of client reach", () => {
    expect(serverPaths).toMatch(/revoke all on function public\.zooter_job_transition_allowed/);
    expect(serverPaths).toMatch(/grant execute on function public\.zooter_job_transition_allowed[\s\S]{0,80}service_role/);
  });
});

describe("the lockdown and its replacements stay in step", () => {
  it("still revokes the writes these functions replaced", () => {
    // If someone re-grants the client write to make a flow work, these functions become
    // optional rather than mandatory, and the hole is back.
    expect(lockdown).toMatch(/revoke insert, update, delete on public\.zooter_training_completions from authenticated/);
    expect(lockdown).toMatch(/revoke insert, update, delete on public\.zooter_jobs from authenticated/);
  });
});

describe("sensitive access credentials", () => {
  const read = codeOf("supabase/functions/sensitive-access-read/index.ts");
  const save = codeOf("supabase/functions/sensitive-access-save/index.ts");

  it("never derives the encryption key from the service role key", () => {
    // The fallback that was there on recovery meant an unset ENCRYPTION_KEY silently encrypted
    // gate codes under the service key — so rotating that key, which blocker.md requires,
    // would have made every stored credential permanently unreadable. Failing closed was safe
    // to introduce while the table held 0 rows; reintroducing the fallback would not be.
    for (const source of [read, save]) {
      expect(source).not.toMatch(/ENCRYPTION_KEY[\s\S]{0,40}SERVICE_ROLE_KEY/);
      expect(source).toMatch(/if \(!secret\) throw new Error/);
    }
  });

  it("never answers with a wildcard origin", () => {
    // A `*` on an endpoint that returns gate codes is not a default worth having.
    for (const source of [read, save]) {
      expect(source).not.toMatch(/"Access-Control-Allow-Origin":\s*[^,\n]*"\*"/);
      expect(source).toMatch(/allowedOrigins\.includes\(origin\)/);
    }
  });

  it("does not mix a service key with a forwarded caller token", () => {
    // Doing both leaves the effective identity to supabase-js header precedence rather than to
    // anything the code states, on the one endpoint where getting it wrong hands over a house.
    for (const source of [read, save]) {
      expect(source).not.toMatch(/SERVICE_ROLE_KEY[\s\S]{0,120}Authorization: authHeader/);
    }
  });

  it("does not return raw error text to the caller", () => {
    // With the key fallback gone, `String(err)` in the catch would tell any caller whether
    // ENCRYPTION_KEY is configured — a free probe of server state on the one endpoint where
    // that matters most. Comments are stripped by codeOf, so this reads the code, not the note
    // explaining it.
    for (const source of [read, save]) {
      expect(source).not.toMatch(/error:\s*String\(err\)/);
      expect(source).toMatch(/console\.error/);
    }
  });

  it("keeps the booking-window check in front of decryption", () => {
    const gateAt = read.indexOf("can_access_sensitive_data");
    const decryptAt = read.indexOf("decryptJson(vault)");
    expect(gateAt).toBeGreaterThan(-1);
    expect(decryptAt).toBeGreaterThan(gateAt);
  });

  /**
   * `property_account_id` is a foreign key supplied by the client, so create-booking has to
   * prove the caller owns it rather than trust the payload. Without the ownership filter an
   * Airbnb host could file a booking against another customer's property, corrupting that
   * customer's per-property history and anything later built on it.
   *
   * This is the exact shape of the bug the client-write lockdown was written to close, so it
   * is asserted rather than left to review.
   */
  it("proves the caller owns a property account before filing a booking against it", () => {
    const createBooking = codeOf("supabase/functions/create-booking/index.ts");

    const checkAt = createBooking.indexOf('.from("property_accounts")');
    const insertAt = createBooking.indexOf('.from("bookings").insert');
    expect(checkAt, "create-booking no longer looks up the property account").toBeGreaterThan(-1);

    // The lookup must be scoped to the caller, not just to the id.
    const lookup = createBooking.slice(checkAt, checkAt + 400);
    expect(lookup).toMatch(/\.eq\("id",\s*propertyAccountId\)/);
    expect(lookup, "the property lookup is not scoped to the caller").toMatch(/\.eq\("user_id",\s*user\.id\)/);

    // And it must happen before the booking is written, or the check protects nothing.
    expect(checkAt).toBeLessThan(insertAt);

    // One message for both "no such property" and "not yours", so the endpoint cannot be
    // used to probe which property ids exist.
    expect(createBooking).toMatch(/property account not found/);
  });
});

/**
 * The household profile is the row that holds the keys — `gate_code`, `alarm_code`,
 * `access_instructions`. Two locks guard it, and both are asserted here.
 *
 * The hole these close, found 2026-08-07: `create-booking` took `householdProfileId` straight
 * from the request body, and `get-sensitive-access` then authorised the caller as the booking's
 * assigned Xooter and read `household_profiles` by that id without tying the profile to the
 * booking's customer. `can_access_sensitive_data` does not close it either — the live
 * definition covers the booking/Xooter link, revocation, status and time window, and says
 * nothing about whose profile it is. A user who is also an active Xooter could therefore file
 * a booking naming themselves and someone else's profile, and read that household's gate code.
 *
 * Never exploited: production held 0 bookings, 0 household profiles and 0 Xooters when this
 * was found.
 */
describe("a household profile can only be read by the household it belongs to", () => {
  const createBooking = codeOf("supabase/functions/create-booking/index.ts");
  const sensitive = codeOf("supabase/functions/get-sensitive-access/index.ts");

  it("refuses to file a booking against someone else's household profile", () => {
    const checkAt = createBooking.indexOf('.from("household_profiles")');
    const insertAt = createBooking.indexOf('.from("bookings").insert');
    expect(checkAt, "create-booking no longer looks the household profile up").toBeGreaterThan(-1);

    const lookup = createBooking.slice(checkAt, checkAt + 400);
    expect(lookup).toMatch(/\.eq\("id",\s*householdProfileId\)/);
    expect(lookup, "the household lookup is not scoped to the caller").toMatch(
      /\.eq\("user_id",\s*user\.id\)/,
    );

    // Before the write, or it guards nothing.
    expect(checkAt).toBeLessThan(insertAt);

    // One message for "no such profile" and "not yours", so ids cannot be probed.
    expect(createBooking).toMatch(/household profile not found/);
  });

  it("scopes the credential read to the booking's own customer", () => {
    // The second lock, on the door rather than the key: a booking written by any other path
    // still cannot disclose a profile belonging to someone else.
    const readAt = sensitive.indexOf('.from("household_profiles")');
    expect(readAt).toBeGreaterThan(-1);
    const read = sensitive.slice(readAt, readAt + 400);
    expect(read).toMatch(/\.eq\("id",\s*booking\.household_profile_id\)/);
    expect(read, "the credential read is not scoped to the booking's customer").toMatch(
      /\.eq\("user_id",\s*booking\.user_id\)/,
    );

    // And the booking select must actually fetch user_id, or the filter above is undefined —
    // which PostgREST would treat as matching nothing, failing closed but for the wrong reason.
    const select = /\.from\("bookings"\)\s*\.select\("([^"]+)"\)/.exec(sensitive);
    expect(select, "could not find the booking select").toBeTruthy();
    expect(select![1].split(",")).toContain("user_id");
  });
});
