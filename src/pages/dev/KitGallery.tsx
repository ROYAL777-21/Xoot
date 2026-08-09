import { Bath, BedDouble, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ChipGrid, ChoiceRow, DockedCTA, SectionLabel, ServiceRow } from "@/components/kit";
import { Button } from "@/components/ui/button";

/**
 * Every kit primitive on one page, in both schemes, so the port can be *looked at*.
 *
 * WHY THIS EXISTS
 *
 * The five primitives in `src/components/kit/` shipped with token assertions and jsdom
 * behaviour tests and **no visual verification at all** — the honest "Not verified" line on the
 * PR that added them. jsdom does not lay out, does not resolve a custom property and does not
 * paint, so every one of those tests would pass on a component that renders as a stack of
 * invisible boxes. The only remaining consumer, `Book.tsx`, sits behind `RequireAuth`, so there
 * was nowhere to point a browser.
 *
 * WHY IT IS DEV-ONLY
 *
 * Mounted behind `import.meta.env.DEV` in `App.tsx`, so Rollup drops the whole route from a
 * production build — this is a workshop, not a page, and a design gallery on a live marketplace
 * is a leak of unfinished work rather than a feature.
 *
 * Reachable at `/dev/kit` with `bun run dev`. `scripts/dev/shoot-kit.mjs` drives it with the
 * pre-installed Chromium and writes both schemes to `docs/screenshots/`.
 *
 * Keep every prop combination that changes rendering, not every combination that exists: a
 * gallery nobody trusts to be complete gets checked once and then ignored.
 */

const EXTRAS = ["Inside fridge", "Inside oven", "Interior windows", "Ironing", "Laundry"];

export default function KitGallery() {
  const [dark, setDark] = useState(false);
  const [extras, setExtras] = useState<string[]>(["Inside oven"]);
  const [frequency, setFrequency] = useState("weekly");
  const [service, setService] = useState("indoor");
  const [open, setOpen] = useState({ morning: true, evening: false });

  /*
   * Two scopes, deliberately kept in step.
   *
   * The kit's tokens live under `[data-theme="dark"]` on the wrapper below; shadcn's semantic
   * roles (`--primary`, `--destructive`) live under a `.dark` class on the html element. The
   * first version of this page only flipped the wrapper, so the "dark" screenshot showed kit
   * components in dark and every shadcn Button still in light — including the destructive pair,
   * which meant the dark half of the #38 fix was not in the picture at all.
   *
   * Cleaned up on unmount so this workshop cannot leave the rest of the app in dark.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    return () => root.classList.remove("dark");
  }, [dark]);

  return (
    <div
      // The kit's dark scope is `[data-theme="dark"]`, not a `.dark` class — set it on the
      // wrapper rather than the html element so both schemes can be shot without a reload,
      // and so this page cannot leave the app in dark mode when you navigate away.
      data-theme={dark ? "dark" : undefined}
      style={{
        minHeight: "100vh",
        background: "var(--xoot-surface-page)",
        color: "var(--xoot-text-primary)",
        fontFamily: "var(--xoot-font-core)",
        padding: "24px 20px 160px",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 28 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--xoot-display)", fontWeight: 700, letterSpacing: "var(--xoot-track-tight)" }}>
              Kit primitives
            </h1>
            <p style={{ fontSize: "var(--xoot-body-sm)", color: "var(--xoot-text-muted)" }}>
              Ported from design/Xoot_App.html. Dev only.
            </p>
          </div>
          <Button variant="outline" onClick={() => setDark((d) => !d)} data-testid="scheme-toggle">
            {dark ? "Light" : "Dark"}
          </Button>
        </header>

        <section data-shot="chipgrid" style={{ display: "grid", gap: 10 }}>
          <SectionLabel slot="plain" label="ChipGrid" />
          <ChipGrid label="Extra tasks" options={EXTRAS} value={extras} onChange={setExtras} theme={dark ? "dark" : "light"} />
        </section>

        <section data-shot="choicerow" style={{ display: "grid", gap: 10 }}>
          <SectionLabel slot="plain" label="ChoiceRow" />
          <ChoiceRow
            label="Weekly"
            description="Every 7 days, same Xooter where possible"
            selected={frequency === "weekly"}
            onClick={() => setFrequency("weekly")}
            theme={dark ? "dark" : "light"}
          />
          <ChoiceRow
            label="Fortnightly"
            description="Every 14 days"
            selected={frequency === "fortnightly"}
            onClick={() => setFrequency("fortnightly")}
            theme={dark ? "dark" : "light"}
          />
          {/* `multi` squares the ring — the only affordance separating pick-one from pick-many. */}
          <ChoiceRow
            label="One-off visit"
            multi
            selected={frequency === "once"}
            onClick={() => setFrequency("once")}
            theme={dark ? "dark" : "light"}
          />
        </section>

        <section data-shot="servicerow" style={{ display: "grid", gap: 8 }}>
          <SectionLabel slot="plain" label="ServiceRow" />
          <ServiceRow
            icon={<Sparkles size={20} strokeWidth={2.1} />}
            title="Indoor clean"
            meta="R520"
            description="3 bedrooms, 2 bathrooms, 4.5 hours"
            selected={service === "indoor"}
            onClick={() => setService("indoor")}
          />
          <ServiceRow
            icon={<BedDouble size={20} strokeWidth={2.1} />}
            title="Airbnb turnover"
            meta="R680"
            description="Linen change, restock, photos on completion"
            selected={service === "airbnb"}
            onClick={() => setService("airbnb")}
          />
          {/* No meta, no description — the row must not collapse or misalign without them. */}
          <ServiceRow
            icon={<Bath size={20} strokeWidth={2.1} />}
            title="Deep clean"
            onClick={() => setService("deep")}
          />
        </section>

        <section data-shot="sectionlabel" style={{ display: "grid", gap: 10 }}>
          <SectionLabel slot="plain" label="SectionLabel" />
          <SectionLabel
            slot="morning"
            label="Morning"
            count={2}
            open={open.morning}
            onToggle={() => setOpen((o) => ({ ...o, morning: !o.morning }))}
            onAdd={() => undefined}
            addLabel="Add a morning visit"
          />
          <SectionLabel
            slot="evening"
            label="Evening"
            count={1}
            open={open.evening}
            onToggle={() => setOpen((o) => ({ ...o, evening: !o.evening }))}
          />
          {/* Static: no onToggle, so no chevron and no aria-expanded. */}
          <SectionLabel slot="high" label="Needs attention" />
          <SectionLabel slot="anytime" label="Anytime" count={4} />
        </section>

        <section data-shot="destructive" style={{ display: "grid", gap: 10 }}>
          <SectionLabel slot="plain" label="Destructive (#38)" />
          {/* Here because the fix is a contrast one and contrast is the thing a number cannot
              settle on its own. Light darkened 56% to 48%; dark kept the fill and took an ink
              label, matching accent, success and warning. */}
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="destructive">Cancel booking</Button>
            <Button variant="destructive" disabled>
              Cancelling…
            </Button>
          </div>
        </section>
      </div>

      <DockedCTA note="You will not be charged until a Xooter accepts.">
        <Button className="w-full h-12 rounded-2xl">
          <Wand2 className="h-4 w-4 mr-1" /> Continue
        </Button>
      </DockedCTA>
    </div>
  );
}
