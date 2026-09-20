import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeopleBand } from "./PeopleBand";

/**
 * These are claim guards, not layout guards.
 *
 * The 2026-09-03 handoff's version of this section promised an on-time turnover and that "a
 * real person answers when it matters". Neither is backed: `locked-commercial-facts.md`
 * carries **no support hours, no response time and no SLA**, and **zero bookings have
 * completed**. Under the CPA a misleading representation is misleading regardless of intent.
 *
 * The failure mode this file exists for is somebody restoring the design's original copy
 * during a later visual pass, because it reads better. It does read better. It is also a
 * promise nobody has agreed to keep.
 */
describe("PeopleBand claims", () => {
  it("makes no timing promise", () => {
    render(<PeopleBand />);
    const copy = document.body.textContent ?? "";
    // "on time", "guaranteed", "always" — a timing guarantee with no SLA behind it is the
    // most expensive sentence that can appear on a marketing page.
    expect(copy).not.toMatch(/\bon time\b/i);
    expect(copy).not.toMatch(/\bguarantee/i);
    expect(copy).not.toMatch(/\balways\b/i);
  });

  it("makes no support-availability promise", () => {
    render(<PeopleBand />);
    const copy = document.body.textContent ?? "";
    expect(copy).not.toMatch(/answers when it matters/i);
    expect(copy).not.toMatch(/\b24\/7\b/i);
    expect(copy).not.toMatch(/\banytime\b/i);
  });

  it("describes the admin review rather than implying a screening bureau", () => {
    render(<PeopleBand />);
    // The wording SafetyTrust settled on in September: name what is actually reviewed.
    // `getAllByText` because the section says it twice on purpose — once in the sub-line and
    // once on the first card. Asserting a single match would fail for the wrong reason.
    expect(screen.getAllByText(/an admin reviews/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/ID, proof of address and references before they can take a booking/i),
    ).toBeInTheDocument();

    // No bureau, and no bare "vetted" standing on its own as the whole claim.
    const copy = document.body.textContent ?? "";
    expect(copy).not.toMatch(/\bMIE\b/);
    expect(copy).not.toMatch(/background check/i);
  });

  it("claims only capabilities that exist, in capability tense", () => {
    render(<PeopleBand />);
    const copy = document.body.textContent ?? "";
    // Arrival status and the support route are available; provider-dependent calling
    // must not become a public availability promise.
    expect(copy).toMatch(/arrival status/i);
    expect(copy).toMatch(/contact support from the booking/i);
    // No review, rating or testimonial: nothing has been completed to rate.
    expect(copy).not.toMatch(/\bstars?\b/i);
    expect(copy).not.toMatch(/\brated\b/i);
  });
});
