import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GapArrow } from "./GapArrow";

/**
 * `GapArrow` is decoration, so what is worth guarding is not how it looks — it is that it
 * cannot affect anything else on the page. Three properties do that work, and each has a
 * failure mode that would only ever be noticed after it shipped.
 */
describe("GapArrow", () => {
  it("is hidden from assistive technology and carries no text", () => {
    // A decorative flourish announced as "image" between two sections is noise in a screen
    // reader, and there is no alt text that would improve it — the arrow means nothing that
    // the section order does not already say.
    const { container } = render(<GapArrow />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
    expect(container.textContent).toBe("");
  });

  it("occupies no vertical space, so it cannot re-space the page", () => {
    // The whole reason these could be dropped into a finished layout. If the wrapper ever
    // gains height, every section below every arrow moves, and the arrows are the last place
    // anyone would look for that.
    const { container } = render(<GapArrow offset={-58} />);
    expect(container.firstElementChild?.className).toContain("h-0");

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("absolute");
    expect(svg).toHaveStyle({ top: "-58px" });
  });

  it("keeps the kit's own path data rather than an approximation", () => {
    // Redrawing a curve by eye from a screenshot is how a port stops looking like the
    // design. These two paths are copied from the handoff's `ARROWS.down`, and pinning them
    // means an accidental "tidy-up" of the numbers fails here instead of shipping.
    const { container } = render(<GapArrow />);
    const paths = [...container.querySelectorAll("path")].map((p) => p.getAttribute("d"));
    expect(paths).toEqual(["M30,4 C22,34 38,58 30,96", "M30,96 L20,80 M30,96 L41,80"]);
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 60 110");
  });

  it("takes the colour it is given, so consecutive arrows can differ", () => {
    const { container } = render(<GapArrow colour="var(--xoot-violet-600)" />);
    expect(container.querySelector("svg")?.getAttribute("stroke")).toBe("var(--xoot-violet-600)");
  });
});
