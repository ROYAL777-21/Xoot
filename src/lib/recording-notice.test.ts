import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BOOKING_TIME_NOTICE,
  IN_CALL_INDICATOR_LABEL,
  RECORDING_NOTICE_RENDERED,
  TERMS_CLAUSE,
} from "./recording-notice";
import { RECORDING_MODE, RECORDING_RETENTION_DAYS } from "./safety";

/**
 * Call recording is the one feature here where writing the words IS the work.
 *
 * `docs/voice-calling.md`: *"the boolean is the last step, not the first."* Under **RICA s4** a
 * call may lawfully be recorded by a party to it; under **POPIA s18** the parties must be told
 * what is collected, why, who sees it, and for how long. Flip the flag without that and every
 * recording made is unlawful — and unlike a pricing bug, it cannot be corrected afterwards,
 * because the call already happened.
 *
 * So these assertions are about the notice being *complete* and *true*, not about it existing.
 */
describe("recording notice", () => {
  it("states every element POPIA s18 requires", () => {
    const all = TERMS_CLAUSE.join(" ").toLowerCase();

    // Purpose, and the negative — a purpose limit only means something if the excluded uses are
    // named. "Safety" alone would not stop the recordings being used for quality scoring.
    expect(all).toContain("safety");
    expect(all).toMatch(/dispute/);
    expect(all).toMatch(/not used for training, marketing, quality scoring, or advertising/);

    // Recipients, retention, and the right to object — including the regulator, because "contact
    // support" is not a remedy.
    expect(all).toMatch(/access is limited/);
    expect(all).toContain(`${RECORDING_RETENTION_DAYS} days`);
    expect(all).toMatch(/object/);
    expect(all).toMatch(/information regulator/);
  });

  it("describes party-consent recording, not platform recording", () => {
    const all = TERMS_CLAUSE.join(" ").toLowerCase();
    // RICA s4 makes a *party* the lawful recorder. A clause that let Xoot record on its own
    // initiative would describe something the statute does not permit.
    expect(all).toMatch(/either party/);
    expect(all).toMatch(/xoot does not record calls on its own initiative/);
  });

  it("promises an indicator, and audio only", () => {
    const all = TERMS_CLAUSE.join(" ").toLowerCase();
    expect(all).toMatch(/on-screen indicator/);
    expect(all).toMatch(/cannot be recorded without that indicator/);
    expect(RECORDING_MODE).toBe("audio");
    expect(all).toMatch(/audio only/);
    expect(all).toMatch(/does not record video/);
    expect(IN_CALL_INDICATOR_LABEL.toLowerCase()).toMatch(/recording/);
  });

  it("quotes the same retention the code enforces", () => {
    // The sentence a customer reads cannot claim 30 days while `safety.ts` deletes at 14.
    expect(BOOKING_TIME_NOTICE).toContain(`${RECORDING_RETENTION_DAYS} days`);
  });

  it("is published in the terms, not just written in a module", () => {
    const terms = readFileSync(join(process.cwd(), "src/pages/legal/Terms.tsx"), "utf8");
    // Rendered from the module, so the page cannot drift from the indicator and the disclosure.
    expect(terms).toContain("TERMS_CLAUSE");
    expect(terms).toMatch(/Recording in-app calls/);
  });

  /**
   * The gate, and the reason the Semgrep rule stays for now.
   *
   * Wording is necessary and not sufficient. A clause in the terms that no screen ever shows is
   * not notice — it is the shape of promise this repo keeps having to remove. Recording may only
   * be enabled once the in-call indicator is actually rendered, which is the native call layer's
   * job and therefore Release & Infrastructure's path.
   *
   * When that ships: flip `RECORDING_NOTICE_RENDERED`, delete `xoot-call-recording-enabled-
   * without-notice` from `.semgrep/rules/xoot.yaml`, and this test starts asserting the other
   * direction.
   */
  it("keeps recording disabled until the notice is actually on screen", () => {
    const semgrep = readFileSync(join(process.cwd(), ".semgrep/rules/xoot.yaml"), "utf8");
    const rulePresent = semgrep.includes("xoot-call-recording-enabled-without-notice");

    if (!RECORDING_NOTICE_RENDERED) {
      expect(
        rulePresent,
        "recording notice is not rendered yet, so the Semgrep guard must stay",
      ).toBe(true);
      return;
    }

    // Once the indicator ships the guard has done its job and should come out in that commit,
    // rather than lingering as a rule everyone has learned to ignore.
    expect(
      rulePresent,
      "notice is rendered — remove the Semgrep rule in the commit that shipped the indicator",
    ).toBe(false);
  });
});
