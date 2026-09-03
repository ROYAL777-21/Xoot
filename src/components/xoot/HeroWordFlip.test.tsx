import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HeroWordFlip } from "./HeroWordFlip";

const source = readFileSync(join(process.cwd(), "src/components/xoot/HeroWordFlip.tsx"), "utf8");

describe("HeroWordFlip", () => {
  it("never rotates a price or value claim through the headline", () => {
    // The handoff's rotation included "Affordable pricing". Xoot's locked position is premium
    // managed home-care infrastructure, and the locked facts say outright not to describe it
    // as cheap cleaning — so a headline alternating "Premium home care" with "Affordable
    // pricing" argues with itself. It is also a price claim while the locked document and
    // create-booking still disagree about what a clean costs.
    //
    // Asserted against the PHRASES array rather than the render, because only one phrase is on
    // screen at a time and a rendered check would pass by luck.
    //
    // Scoped to the array and not the whole file, which the first version got wrong: the doc
    // comment above it *quotes* the dropped phrase to explain why it went, so a file-wide
    // match failed against the explanation rather than against a real regression.
    const phrases = source.match(/const PHRASES = \[(.*?)\]/s)?.[1];
    expect(phrases).toBeDefined();

    for (const banned of ["affordable", "cheap", "budget", "discount", "bargain", "value"]) {
      expect(phrases!.toLowerCase()).not.toContain(banned);
    }
    expect(phrases).not.toMatch(/R\s?\d/);
  });

  it("renders exactly one phrase, on one line", () => {
    const { container } = render(<HeroWordFlip />);
    // Two nodes carry the phrase: the hidden sizer and the visible one. Both must be nowrap —
    // a wrapped headline in this column reads as a sentence cut in half.
    const nowrap = container.querySelectorAll(".whitespace-nowrap");
    expect(nowrap.length).toBe(2);
  });

  it("keeps the measuring node hidden from assistive technology", () => {
    // The sizer duplicates the phrase. Left in the accessibility tree, a screen reader says
    // the headline twice.
    const { container } = render(<HeroWordFlip />);
    const sizer = container.querySelector('[aria-hidden="true"].invisible');
    expect(sizer).not.toBeNull();
    expect(screen.getAllByText(/built on trust/i).length).toBe(2);
  });

  it("measures the hidden sizer, never the visible node", () => {
    // Reading the visible node returns a width that is already scaled, so the correction
    // compounds every cycle and the phrase creeps away to nothing. This looks like a
    // rendering glitch for a week before anyone finds it.
    expect(source).toMatch(/sizerRef\.current/);
    expect(source).toMatch(/sizer\.getBoundingClientRect\(\)/);
    expect(source).not.toMatch(/visible[A-Za-z]*\.getBoundingClientRect/);
  });
});
