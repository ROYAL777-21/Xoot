import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { ChipGrid, ChoiceRow, DockedCTA, SectionLabel, ServiceRow } from "./index";

/**
 * Two kinds of check, because the kit port can fail in two unrelated ways.
 *
 * **Structural** — a `var(--xoot-typo)` does not throw, does not warn, and does not fail a
 * render. The property is simply dropped and the element inherits whatever was there before, so
 * a mistyped token is invisible in every test that only asserts on rendered text. The first
 * block parses `kit-tokens.css` and asserts every token these components name is declared.
 *
 * **Behavioural** — the parts of the kit that carry meaning rather than appearance: the toggle
 * semantics of a chip, the `aria-pressed` state a screen reader reads out, the disclosure state
 * of a section header.
 */

const root = process.cwd();
const kitDir = join(root, "src/components/kit");
const css = readFileSync(join(root, "src/styles/kit-tokens.css"), "utf8");

const sources = readdirSync(kitDir)
  .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
  .map((f) => [f, readFileSync(join(kitDir, f), "utf8")] as const);

describe("kit primitives — tokens", () => {
  const declared = new Set(
    [...css.matchAll(/^\s*(--xoot-[a-z0-9-]+):/gm)].map((m) => m[1]),
  );

  it.each(sources)("%s only names tokens the kit declares", (_file, src) => {
    const used = [...src.matchAll(/var\((--xoot-[a-z0-9-]+)\)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((t) => !declared.has(t))).toEqual([]);
  });

  /**
   * The kit's dark scope re-declares semantic aliases only — `kit-tokens.test.ts` asserts that
   * rule from the token side. This is the consumer side of it: a component that reaches past the
   * aliases into a raw palette entry (`--xoot-violet-500` as a *text* colour, say) will not
   * change in dark mode, and will be unreadable there.
   *
   * The listed exceptions are the ones the kit itself writes as raw entries, checked against the
   * kit source rather than waved through. Each is a surface fill with its own foreground supplied
   * beside it, not a colour that has to adapt.
   */
  it("reaches into the raw palette only where the kit does", () => {
    const RAW_BY_DESIGN = new Set([
      // ChipGrid selected-on-dark: fill plus an explicit #FFFFFF label on top.
      "--xoot-violet-700",
      // ChipGrid selected-on-light ring, ChoiceRow selected ring. Borders, not text.
      "--xoot-violet-300",
      "--xoot-violet-400",
      // ServiceRow selected ring and the default icon accent, which is passed to color-mix.
      "--xoot-violet-500",
      // SectionLabel slot fills, each paired with its own -ink foreground in the same row.
      "--xoot-violet-50",
      "--xoot-honey-wash",
      "--xoot-honey-ink",
      "--xoot-mist-wash",
      "--xoot-mist-ink",
      // Neutrals used as hairlines, tile grounds and disc fills.
      "--xoot-neutral-0",
      "--xoot-neutral-50",
      "--xoot-neutral-100",
      "--xoot-neutral-300",
      "--xoot-neutral-400",
      // ChoiceRow's selected ring on dark.
      "--xoot-lilac-mid",
    ]);

    const rawPattern = /^--xoot-(violet|coral|honey|mist|lilac|neutral|ink|blush|sage)-/;
    const offenders = new Set<string>();
    for (const [, src] of sources) {
      for (const m of src.matchAll(/var\((--xoot-[a-z0-9-]+)\)/g)) {
        if (rawPattern.test(m[1]) && !RAW_BY_DESIGN.has(m[1])) offenders.add(m[1]);
      }
    }
    expect([...offenders].sort()).toEqual([]);
  });

  /**
   * `--xoot-dur-*` is zeroed under `prefers-reduced-motion` in `index.css`. That only helps if
   * the components animate through the tokens rather than through literal milliseconds — a
   * hard-coded `170ms` here would keep moving for someone who asked the OS to stop.
   */
  it.each(sources)("%s animates through the duration tokens, not literal ms", (_file, src) => {
    const timings = [...src.matchAll(/(transition|animation):\s*"([^"]+)"/g)].map((m) => m[2]);
    for (const timing of timings) {
      expect({ timing, literal: /\d+m?s\b/.test(timing) }).toEqual({ timing, literal: false });
    }
  });

  it("declares xoot-pop, which ChoiceRow animates its check with", () => {
    // A missing keyframe renders with no animation and no error, so this is the only thing
    // standing between "the check lands" and "the check appears".
    const index = readFileSync(join(root, "src/index.css"), "utf8");
    expect(index).toMatch(/@keyframes\s+xoot-pop\s*\{/);
  });
});

describe("ChipGrid", () => {
  it("toggles a value on and off, and reports state through aria-pressed", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ChipGrid options={["Pets", "Ironing"]} value={[]} onChange={onChange} label="Extras" />,
    );

    const pets = screen.getByRole("button", { name: "Pets" });
    expect(pets).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(pets);
    expect(onChange).toHaveBeenCalledWith(["Pets"]);

    rerender(
      <ChipGrid options={["Pets", "Ironing"]} value={["Pets"]} onChange={onChange} label="Extras" />,
    );
    expect(screen.getByRole("button", { name: "Pets" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Pets" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("accepts the kit's bare-string shorthand and its object form", () => {
    render(
      <ChipGrid
        options={["Pets", { value: "ironing", label: "Ironing" }]}
        value={["ironing"]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Pets" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Ironing" })).toHaveAttribute("aria-pressed", "true");
  });

  it("exposes the group so the question is announced, not just the chips", () => {
    render(<ChipGrid options={["Pets"]} value={[]} onChange={vi.fn()} label="What applies?" />);
    expect(screen.getByRole("group", { name: "What applies?" })).toBeInTheDocument();
  });
});

describe("ChoiceRow", () => {
  it("announces selection and fires once per tap", () => {
    const onClick = vi.fn();
    render(<ChoiceRow label="Weekly" description="Every 7 days" selected onClick={onClick} />);

    const row = screen.getByRole("button", { name: /Weekly/ });
    expect(row).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Every 7 days")).toBeInTheDocument();

    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not announce the check ring separately from the row", () => {
    // The row already carries aria-pressed. A second announcement of the same fact is the kind
    // of duplication that makes a screen reader tedious enough to switch off.
    const { container } = render(<ChoiceRow label="Weekly" selected />);
    expect(container.querySelectorAll("[aria-hidden]").length).toBeGreaterThan(0);
  });
});

describe("ServiceRow", () => {
  it("renders title, meta and description, and clicks through", () => {
    const onClick = vi.fn();
    render(
      <ServiceRow
        icon={<span data-testid="icon" />}
        title="Indoor clean"
        meta="R520"
        description="3 bedrooms, 2 bathrooms"
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Indoor clean/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("R520")).toBeInTheDocument();
    expect(screen.getByText("3 bedrooms, 2 bathrooms")).toBeInTheDocument();
  });

  it("leaves aria-pressed off when the row is not a selection", () => {
    // `aria-pressed="false"` on a plain navigation row tells a screen reader it is a toggle that
    // is currently off, which is a different control from the one on screen.
    render(<ServiceRow icon={null} title="Settings" onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Settings" })).not.toHaveAttribute("aria-pressed");
  });
});

describe("SectionLabel", () => {
  it("is a disclosure only when it can disclose", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<SectionLabel slot="morning" label="Morning" count={2} onToggle={onToggle} />);

    const toggle = screen.getByRole("button", { name: /Morning/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<SectionLabel slot="morning" label="Morning" count={2} />);
    expect(screen.getByRole("button", { name: /Morning/ })).not.toHaveAttribute("aria-expanded");
  });

  it("gives the add button a name a screen reader can distinguish", () => {
    render(<SectionLabel slot="evening" label="Evening" onAdd={vi.fn()} addLabel="Add an evening visit" />);
    expect(screen.getByRole("button", { name: "Add an evening visit" })).toBeInTheDocument();
  });

  it("pairs every slot fill with its own foreground token", () => {
    // The kit's rule: a slot is a background *and* an ink, chosen against each other. A slot with
    // a fill and an inherited foreground is how a header ends up dark grey on dark violet.
    const src = readFileSync(join(kitDir, "SectionLabel.tsx"), "utf8");
    const slots = [...src.matchAll(/^\s+\w+: \{ icon: .+?, bg: (.+?), fg: (.+?) \},$/gm)];
    expect(slots.length).toBe(8);
    for (const [, bg, fg] of slots) {
      expect({ bg, hasFg: fg.trim().length > 0 }).toEqual({ bg, hasFg: true });
    }
  });
});

describe("DockedCTA", () => {
  it("renders the note above the action", () => {
    render(
      <DockedCTA note="No card needed">
        <button type="button">Continue</button>
      </DockedCTA>,
    );
    expect(screen.getByText("No card needed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("keeps the fade from swallowing taps", () => {
    // The failure this prevents only appears on a touch device: the gradient is invisible, sits
    // above the content, and eats every tap in the bottom 100px of the screen.
    const { container } = render(
      <DockedCTA>
        <button type="button">Continue</button>
      </DockedCTA>,
    );
    const fade = container.firstElementChild as HTMLElement;
    expect(fade.style.pointerEvents).toBe("none");
    expect((fade.firstElementChild as HTMLElement).style.pointerEvents).toBe("auto");
  });
});
