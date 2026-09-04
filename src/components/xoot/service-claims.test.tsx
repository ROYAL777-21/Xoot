import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SERVICE_ALIASES, quote } from "@/lib/xoot-pricing";
import { CarePlusBand } from "./CarePlusBand";
import { Footer } from "./Footer";
import { GiftClean } from "./GiftClean";
import { Services } from "./Services";

/**
 * The public site names only services Xoot actually sells.
 *
 * ⚠️ **Written 2026-09-04 after finding a retired product still on sale.** ZD-031 ended Care+
 * placement on 2026-08-13 — the route, the handler, the constants and the apply page all went. Its
 * removal table lists six code surfaces and no marketing one, so a "Find full-time help" button in
 * `Services` and a matching link in `Footer` kept offering it for three weeks afterwards.
 *
 * Under **CPA s41** a representation is misleading regardless of intent, and "we source a full-time
 * domestic worker for you" is a service claim, not decoration. Nothing in the suite could see it,
 * because the retirement was tested at the API and the copy was never in the test's field of view.
 */
const withRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("no surface sells the retired placement product", () => {
  /*
   * Matched on meaning, not on the exact old string. "Find full-time help" is one phrasing of a
   * promise with many — a guard pinned to that sentence would pass the moment someone wrote
   * "Get a full-time cleaner", which is the same claim about the same dead product.
   */
  const PLACEMENT = /full[- ]time|placement|permanent (?:helper|cleaner|domestic)|domestic worker/i;

  it.each([
    ["Services", <Services key="s" />],
    ["Footer", <Footer key="f" />],
  ])("%s makes no full-time or placement promise", (_name, ui) => {
    const { container } = withRouter(ui);
    expect(container.textContent ?? "").not.toMatch(PLACEMENT);
  });

  it("still offers Care+ itself, which was never retired", () => {
    // The negative above must not be satisfied by deleting the membership too. ZD-031 retired
    // placement; Care+ is a live product and the footer is where people look for it.
    withRouter(<Footer />);
    expect(screen.getByText("Care+ membership")).toBeInTheDocument();
  });
});

describe("every service the site names can actually be priced", () => {
  /**
   * ⛔ The trap this exists for is in the handoff itself.
   *
   * `design/handoff-2026-09-03/xoot/site/SiteBody.jsx` lists **"Laundry & ironing"** as the sixth
   * service card, and porting that list verbatim is the obvious way to finish the design. But
   * `SERVICES.laundry` in `xoot-pricing.ts` carries `ladder: {}` — an empty ladder — and `laundry`
   * has no `SERVICE_ALIASES` entry, so it cannot be quoted; `Book.tsx` does not offer it either.
   *
   * A homepage card for an unbookable service is a claim the product cannot keep. So the rule is
   * not "match the design", it is "name nothing `quote()` refuses", and this is what enforces it.
   */
  const cardTitles = () => {
    const source = readFileSync(join(process.cwd(), "src/components/xoot/Services.tsx"), "utf8");
    return [...source.matchAll(/title: "([^"]+)"/g)].map((m) => m[1]);
  };

  it("reads a real list of cards", () => {
    expect(cardTitles().length).toBeGreaterThanOrEqual(5);
  });

  it.each(cardTitles())("%s resolves to a priceable service", (title) => {
    /*
     * The card titles are prose ("Airbnb turnovers"), so the first word is the handle onto the
     * catalogue. That is enough to catch the defect this guards — a card for a service with no
     * ladder — without pretending a marketing title is a ServiceId.
     */
    const handle = title.toLowerCase().split(/[\s&]+/)[0];
    const id = SERVICE_ALIASES[handle];
    expect(id, `"${title}" names no service in SERVICE_ALIASES`).toBeTruthy();

    /*
     * Swept, not spot-checked at one duration.
     *
     * ⚠️ The first version quoted every service at 4 hours and failed on two true cards: `express`
     * caps at 3 hours and `moving` starts at 4.5, so `quote()` was refusing the *duration*, not the
     * service. That is a different fact from the one this test is about, and asserting it here
     * would have pushed someone to widen a real booking bound to make a marketing test pass.
     *
     * The claim a homepage card makes is "this is bookable", so the assertion is that the ladder
     * prices *somewhere* in the range the booking flow allows — 1 to 10 hours, half-hour steps.
     */
    const priced = Array.from({ length: 19 }, (_, i) => 1 + i * 0.5)
      .map((hours) => quote({ service: id, hours }))
      .filter((result) => result.ok);
    expect(
      priced.length,
      `"${title}" resolves to ${id}, which quote() refuses at every hour from 1 to 10`,
    ).toBeGreaterThan(0);
  });
});

describe("the retirement is recorded where the next person will look", () => {
  it("no component file still references the placement route", () => {
    // `/care-plus/apply` redirects rather than 404s — deliberately, per ZD-031, for notifications
    // and installed builds already carrying the deep link. That is a compatibility shim, not a
    // destination: nothing new should link a person into it.
    const dir = join(process.cwd(), "src/components/xoot");
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
      .filter((f) => /to="\/care-plus\/apply"|href="\/care-plus\/apply"/.test(
        readFileSync(join(dir, f), "utf8"),
      ));
    expect(offenders).toEqual([]);
  });
});

/**
 * The two sections ported from the handoff on 2026-09-04 say only what the product can keep.
 *
 * ⚠️ **The handoff is the source of truth for how these look. It is not the source of truth for what
 * Xoot may promise** — and reading it against `Xoot Legal.dc.html`, `care-plus.ts` and
 * `ops-workflow/index.ts` turned up eight statements the product cannot back. The obvious way to
 * "finish" either section is to restore them from the design, so each is pinned here.
 *
 * Matched by meaning rather than by the design's exact sentence: a guard pinned to "It never
 * expires" passes the moment someone writes "yours forever", which is the same promise.
 */
const renderText = (ui: React.ReactElement) => {
  const { container } = render(<MemoryRouter>{ui}</MemoryRouter>);
  return container.textContent ?? "";
};

describe("CarePlusBand claims only what the code backs", () => {
  it("never says XootCover is included", () => {
    /*
     * ⛔ The single most important assertion in this file.
     *
     * The design's CARE_COMPARE lists "XootCover included" as a tick on BOTH columns. But
     * `design/handoff-2026-09-03/Xoot Legal.dc.html` states, in its own drafting constraints, that
     * "XootCover is described as intended cover with Genric, NOT as cover in force, because it is
     * not placed yet" — and `locked-commercial-facts.md` agrees: Booking Cover is "optional and only
     * preselected when legally and commercially approved."
     *
     * Two of the three sources say the cover does not exist yet. Telling a customer an insurance
     * product covers them when it has not been placed is the worst claim in this repo to get wrong.
     */
    expect(renderText(<CarePlusBand />)).not.toMatch(/xootcover|cover included|insured|insurance/i);
  });

  it("quotes no cadence discount the server does not give", () => {
    // `care-plus.ts` documents 15% weekly / 10% fortnightly / 5% monthly and then flags, in its own
    // header, that `create-booking` applies a FLAT 10% and ignores cadence entirely. A band quoting
    // 15% quotes a discount the server will not apply — the defect this repo has shipped three times.
    const text = renderText(<CarePlusBand />);
    expect(text).not.toMatch(/\b(15|5)\s?%/);
    expect(text).not.toMatch(/weekly|fortnightly/i);
  });

  it("does not promise the same Xooter every time", () => {
    /*
     * `PREMIUM_OUTCOMES` says "The same person every time"; `STANDARD_OUTCOMES` hedges — "your
     * favourite, WHEN THEY'RE FREE". The live tier includes every outcome, so the pair contradicts
     * itself, and `launch-protocol.md` gate 5 is open: there are no activated Xooters.
     *
     * Promising a named person weekly from a roster that does not exist is a representation Xoot
     * cannot keep, and under CPA s41 intent is not the test.
     */
    const text = renderText(<CarePlusBand />);
    expect(text).not.toMatch(/same (person|Xooter) every time|every week|week after week/i);
  });

  it("states the break-even rather than only the best case", () => {
    // `care-plus.ts`: a monthly booker is R45 down and "the copy must keep saying so". A band that
    // showed only the four-visit gain would be quoting a saving most members do not get.
    const text = renderText(<CarePlusBand />);
    expect(text).toMatch(/costs you more than it saves/i);
  });

  it("mentions no rescheduling rule, because there is none", () => {
    // "Free rescheduling" is a row in the design's CARE_COMPARE and appears nowhere in this
    // codebase — zero hits in care-plus.ts. There is no rule to point at, free or otherwise.
    expect(renderText(<CarePlusBand />)).not.toMatch(/reschedul/i);
  });
});

describe("GiftClean promises nothing the gift path cannot do", () => {
  /*
   * Measured, not assumed: `ops-workflow/index.ts` handles `gift_clean_order_requested` by inserting
   * a `gift_clean_orders` row and a `payment_records` row stamped
   * `provider_required: "PayFast credentials not connected"`.
   *
   * So a gift cannot be paid for, delivered, redeemed or refunded today. The design's own header
   * sells all four.
   */
  it.each([
    ["payment", /pay once|pay now|pay today|checkout|charged now/i],
    ["delivery", /they get a card|we.ll send|sent to them|delivered to/i],
    ["refund", /comes back to you|refundable|ask for it back|money back/i],
    ["expiry", /never expires|no expiry|doesn.t expire|yours forever/i],
  ])("makes no %s promise", (_kind, pattern) => {
    expect(renderText(<GiftClean />)).not.toMatch(pattern);
  });

  it("shows a price the gift resolver produced, never a literal", () => {
    // ZD-038: this section's app-side twin quoted a hardcoded table — 270/365/315/420/455 — that
    // existed nowhere in the ladder. Two of those were ZD-037 phantom prices.
    const source = readFileSync(
      join(process.cwd(), "src/components/xoot/GiftClean.tsx"),
      "utf8",
    );
    expect(source).toMatch(/giftPriceCents\(/);
    expect(source).not.toMatch(/\b(270|365|315|420|455)\b/);
    expect(source).not.toMatch(/servicePrices/);
  });

  it("claims no popularity it has no bookings to support", () => {
    // The design's Mother's Day hint says "the most-gifted day of the year on Xoot". Production
    // holds zero completed bookings, so there is no most-gifted anything — the same fabricated
    // evidence class the Reviews section is excluded for.
    expect(renderText(<GiftClean />)).not.toMatch(/most[- ]gifted|most popular|customers love|thousands/i);
  });
});
