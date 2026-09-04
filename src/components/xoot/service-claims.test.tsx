import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SERVICE_ALIASES, quote } from "@/lib/xoot-pricing";
import { Footer } from "./Footer";
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
