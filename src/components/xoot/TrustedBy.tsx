import { BedDouble, Building2, House, KeyRound, MapPin, ShieldCheck } from "lucide-react";
import { approvedLaunchRegions } from "@/lib/operations";

/*
 * Restyled to the 2026-09-03 handoff (`design/handoff-2026-09-03/xoot/site/SiteBody.jsx`).
 *
 * The copy was already word-for-word identical to the handoff's, so this is a restyle and not a
 * rewrite — which is the check `design-port-plan.md` asks for before touching any section here.
 *
 * What moved, and what deliberately did not:
 *
 * · Shape, type scale, spacing and layout come from the kit. The grid is the handoff's own
 *   reflow rule — `minmax(min(100%, 150px), 1fr)` — so a track can never demand more width than
 *   the viewport has and the row collapses on its own without a single breakpoint.
 * · Colour that carries text stays on the semantic layer. `text-brand` resolves to the AUDITED
 *   violet (600, 6.10:1) rather than the kit's raw violet-500, which measures 4.38:1 on white
 *   and fails AA. The handoff draws the icon in violet-500; rendering it through `text-brand` is
 *   the same intent at a weight that passes.
 * · The display face is weight 500, not bold. `tokens/typography.css` sets
 *   `--xoot-weight-display-strong: 500` and says the serif "sits at 400–500 (never bold — it
 *   loses its calm)". This section was `font-bold`, which is the one thing Newsreader must not be.
 *
 * The launch areas come from `approvedLaunchRegions`, not from the handoff's hardcoded list of
 * eight — the repo wins on fact, and the real list has twelve. Bedfordview, Melville, Dainfern
 * and Braamfontein are missing from the design.
 */
const operatorProfiles = [
  { label: "Property managers", icon: Building2 },
  { label: "Estate agents", icon: KeyRound },
  { label: "Airbnb hosts", icon: BedDouble },
  { label: "Office admins", icon: ShieldCheck },
  { label: "Landlords", icon: House },
];

export const TrustedBy = () => {
  return (
    <section className="border-y border-border bg-card py-[clamp(36px,5vw,56px)]">
      <div className="container">
        <div className="mx-auto mb-[30px] max-w-[680px] text-center">
          <p className="xoot-label text-muted-foreground">
            Built for real Johannesburg operating workflows
          </p>
          <p className="mt-[13px] text-[length:var(--xoot-body-sm)] leading-[1.6] text-muted-foreground">
            Built around the real operating needs of teams and households that need cleaner handovers, protected access notes, repeatable quality, and accountable support.
          </p>
        </div>
        {/*
         * Glass off, border off. `design/GLASS-SYSTEM.md` reserves glass for navigation, controls
         * and overlays and says outright that it "is not the default treatment for page sections,
         * forms, repeated content cards, or dashboards" — five repeated content cards in a row is
         * the case it names. The handoff agrees: these are flat tinted tiles on a card ground.
         */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3">
          {operatorProfiles.map((profile) => {
            const Icon = profile.icon;
            return (
              <div
                key={profile.label}
                className="rounded-3xl bg-secondary px-[14px] py-[18px] text-center"
              >
                <Icon className="mx-auto mb-[10px] h-5 w-5 text-brand" strokeWidth={1.9} />
                <p className="font-display text-[length:var(--xoot-title-3)] font-medium tracking-tight">
                  {profile.label}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-[30px] flex flex-wrap items-center justify-center gap-x-[22px] gap-y-2">
          <MapPin className="h-[15px] w-[15px] text-brand" strokeWidth={2} />
          {approvedLaunchRegions.map((region) => (
            <span
              key={region}
              className="text-[length:var(--xoot-body-sm)] font-bold capitalize text-muted-foreground"
            >
              {region}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
