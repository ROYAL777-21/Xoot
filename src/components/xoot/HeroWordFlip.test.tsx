import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HeroWordFlip } from "./HeroWordFlip";

const source = readFileSync(join(process.cwd(), "src/components/xoot/HeroWordFlip.tsx"), "utf8");

describe("HeroWordFlip", () => {
  it("never rotates a price or value claim through the headline", () => {
    const phrases = source.match(/const PHRASES = \[(.*?)\]/s)?.[1];
    expect(phrases).toBeDefined();
    for (const banned of ["affordable", "cheap", "budget", "discount", "bargain", "value"]) {
      expect(phrases!.toLowerCase()).not.toContain(banned);
    }
    expect(phrases).not.toMatch(/R\s?\d/);
  });

  it("renders one crisp phrase without a transformed text layer", () => {
    const { container } = render(<HeroWordFlip />);
    const phrase = container.querySelector(".whitespace-nowrap");
    expect(phrase).not.toBeNull();
    expect(phrase?.getAttribute("style")).toBeNull();
    expect(phrase?.textContent).toMatch(/built on trust/i);
  });

  it("keeps the phrase available to assistive technology", () => {
    const { container } = render(<HeroWordFlip />);
    expect(screen.getByText(/built on trust/i, { selector: ".xoot-flip-phrase > span" })).toBeInTheDocument();
    expect(container.querySelector(".xoot-flip-sizer")).toHaveAttribute("aria-hidden", "true");
  });

  it("does not scale or blur the headline phrase", () => {
    expect(source).not.toMatch(/transform:\s*`scale|filter:\s*blur|will-change/);
    expect(source).not.toContain("getBoundingClientRect");
  });
});
