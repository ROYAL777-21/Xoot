import { describe, expect, it } from "vitest";
import {
  describeUnroutableFunctionUrl,
  expectedFunctionUrls,
  isRoutableFunctionUrl,
  normaliseFunctionUrl,
  projectRefFrom,
  sameSignatureUrl,
} from "../../supabase/functions/_shared/function-url";

/**
 * `twilio-selftest` has one job: catch a TwiML App whose Voice Request URL will not reach us, so a
 * call cannot connect and then die in silence.
 *
 * On 2026-08-12 at 19:20 it reported production ✅ while production held exactly that failure. The
 * check was `voiceUrl.includes("twilio-voice-twiml")`, and production's URL contained that string
 * while routing nowhere. These tests exist so the loose version cannot come back: the first case
 * is the real production value, verbatim.
 */

const PRODUCTION_REF = "mvlrkelahhsyjrwgsxaf";
const STAGING_REF = "fxmxyabdjqviqbcxmvlp";

describe("isRoutableFunctionUrl", () => {
  it("rejects the exact URL production was serving, which passed the old substring check", () => {
    const wrong = `https://${PRODUCTION_REF}.supabase.co/twilio-voice-twiml`;

    // The old check, kept here as the counterexample: this is why it was not enough.
    expect(wrong.includes("twilio-voice-twiml")).toBe(true);
    expect(isRoutableFunctionUrl(wrong, "twilio-voice-twiml")).toBe(false);
  });

  it("accepts both shapes Supabase actually serves", () => {
    expect(
      isRoutableFunctionUrl(`https://${STAGING_REF}.functions.supabase.co/twilio-voice-twiml`, "twilio-voice-twiml"),
    ).toBe(true);
    expect(
      isRoutableFunctionUrl(`https://${PRODUCTION_REF}.supabase.co/functions/v1/twilio-voice-twiml`, "twilio-voice-twiml"),
    ).toBe(true);
  });

  it("ignores a query string and a trailing slash, which are not misconfigurations", () => {
    expect(
      isRoutableFunctionUrl(`https://${STAGING_REF}.functions.supabase.co/twilio-voice-twiml/`, "twilio-voice-twiml"),
    ).toBe(true);
    expect(
      isRoutableFunctionUrl(`https://${STAGING_REF}.functions.supabase.co/twilio-voice-twiml?x=1`, "twilio-voice-twiml"),
    ).toBe(true);
  });

  it("rejects a URL that routes but points at a different function", () => {
    expect(
      isRoutableFunctionUrl(`https://${STAGING_REF}.functions.supabase.co/twilio-voice-status`, "twilio-voice-twiml"),
    ).toBe(false);
  });

  it("rejects near-misses that a substring check waves through", () => {
    for (const url of [
      "",
      "  ",
      // http, not https — Twilio will refuse it and the platform does not serve it.
      `http://${STAGING_REF}.functions.supabase.co/twilio-voice-twiml`,
      // Someone else's host entirely.
      "https://example.com/twilio-voice-twiml",
      // The REST path, one segment short of the function path.
      `https://${STAGING_REF}.supabase.co/functions/twilio-voice-twiml`,
      // A nested path: `[^/]+$` is what stops this, and it is a real paste error.
      `https://${STAGING_REF}.functions.supabase.co/v1/twilio-voice-twiml`,
      // The name appearing as a suffix of a longer segment rather than the segment itself.
      `https://${STAGING_REF}.functions.supabase.co/old-twilio-voice-twiml`,
    ]) {
      expect(isRoutableFunctionUrl(url, "twilio-voice-twiml"), url || "(empty)").toBe(false);
    }
  });

  it("does not pin the project ref, so a custom domain is not reported as broken", () => {
    // A ref we do not own still passes the shape check. This is deliberate — see the module note.
    expect(
      isRoutableFunctionUrl("https://someone-elses-ref.functions.supabase.co/twilio-voice-twiml", "twilio-voice-twiml"),
    ).toBe(true);
  });
});

describe("expectedFunctionUrls", () => {
  it("puts the .functions.supabase.co form first, which is what the docs tell you to paste", () => {
    expect(expectedFunctionUrls(PRODUCTION_REF, "twilio-voice-twiml")).toEqual([
      `https://${PRODUCTION_REF}.functions.supabase.co/twilio-voice-twiml`,
      `https://${PRODUCTION_REF}.supabase.co/functions/v1/twilio-voice-twiml`,
    ]);
  });

  it("produces URLs its own predicate accepts", () => {
    for (const url of expectedFunctionUrls(PRODUCTION_REF, "twilio-voice-twiml")) {
      expect(isRoutableFunctionUrl(url, "twilio-voice-twiml"), url).toBe(true);
    }
  });
});

describe("projectRefFrom", () => {
  it("reads the ref out of a Supabase project URL", () => {
    expect(projectRefFrom(`https://${PRODUCTION_REF}.supabase.co`)).toBe(PRODUCTION_REF);
    expect(projectRefFrom(`http://${STAGING_REF}.supabase.co/`)).toBe(STAGING_REF);
  });

  it("returns an empty string rather than throwing when the env var is unset", () => {
    expect(projectRefFrom("")).toBe("");
  });
});

describe("describeUnroutableFunctionUrl", () => {
  const canonical = `https://${PRODUCTION_REF}.functions.supabase.co/twilio-voice-twiml`;

  it("says the path is missing when the URL names the right function", () => {
    const message = describeUnroutableFunctionUrl(
      `https://${PRODUCTION_REF}.supabase.co/twilio-voice-twiml`,
      "twilio-voice-twiml",
      canonical,
    );
    // The two things a founder needs: what breaks, and the exact string to paste.
    expect(message).toContain("404");
    expect(message).toContain(canonical);
  });

  it("says the URL points elsewhere when it names a different function", () => {
    const message = describeUnroutableFunctionUrl(
      `https://${PRODUCTION_REF}.functions.supabase.co/some-other-function`,
      "twilio-voice-twiml",
      canonical,
    );
    expect(message).toContain("does not point at twilio-voice-twiml");
    expect(message).toContain(canonical);
  });

  it("names an empty URL rather than printing a blank", () => {
    expect(describeUnroutableFunctionUrl("", "twilio-voice-twiml", canonical)).toContain("(empty)");
  });
});

describe("normaliseFunctionUrl", () => {
  it("strips whitespace, query strings and trailing slashes and nothing else", () => {
    expect(normaliseFunctionUrl("  https://a.functions.supabase.co/fn/?x=1  ")).toBe(
      "https://a.functions.supabase.co/fn",
    );
  });
});

/**
 * `sameSignatureUrl` answers a different question from everything above it, and the tests that
 * matter are the ones where the two answers disagree.
 *
 * Twilio's HMAC covers the full URL character for character. A trailing slash changes the digest;
 * a query string changes the digest. `normaliseFunctionUrl` throws both away — correctly, for
 * "will Twilio reach this" — so reusing it here would silently accept URL pairs that produce a
 * 403. The `.not.toBe` pairs below are what stops someone merging the two helpers later.
 */
describe("sameSignatureUrl", () => {
  const base = `https://${PRODUCTION_REF}.functions.supabase.co/twilio-voice-twiml`;

  it("matches identical URLs", () => {
    expect(sameSignatureUrl(base, base)).toBe(true);
  });

  it("ignores surrounding whitespace, which is a copy-paste artefact and not part of the URL", () => {
    expect(sameSignatureUrl(`  ${base}\n`, base)).toBe(true);
  });

  it("⚠️ treats a trailing slash as a MISMATCH, unlike the routability check", () => {
    // Routability says these are the same place...
    expect(normaliseFunctionUrl(`${base}/`)).toBe(normaliseFunctionUrl(base));
    // ...and the signature says they are different strings, which is what Twilio signs.
    expect(sameSignatureUrl(`${base}/`, base)).toBe(false);
  });

  it("⚠️ treats an added query string as a MISMATCH, unlike the routability check", () => {
    expect(normaliseFunctionUrl(`${base}?bookingId=abc`)).toBe(normaliseFunctionUrl(base));
    expect(sameSignatureUrl(`${base}?bookingId=abc`, base)).toBe(false);
  });

  it("catches the real production case: right function name, wrong host", () => {
    expect(sameSignatureUrl(`https://${PRODUCTION_REF}.supabase.co/twilio-voice-twiml`, base)).toBe(false);
  });

  it("never reports a match when either side is empty", () => {
    // An unset override must not read as "agrees with nothing configured" — the caller reports
    // unset separately, as not-applicable, and a true here would hide a real mismatch.
    expect(sameSignatureUrl("", "")).toBe(false);
    expect(sameSignatureUrl("   ", base)).toBe(false);
    expect(sameSignatureUrl(base, "")).toBe(false);
  });
});
