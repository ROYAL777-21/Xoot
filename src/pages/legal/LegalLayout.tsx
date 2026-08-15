import type { ReactNode } from "react";
import { Footer } from "@/components/xoot/Footer";
import { Navbar } from "@/components/xoot/Navbar";
import { SEO } from "@/components/SEO";

/**
 * The shell every legal page renders through — one file, eleven documents.
 *
 * ── Restyled 2026-08-13 ────────────────────────────────────────────────────────────────────────
 *
 * `LegalSection` wrapped each clause in `rounded-3xl border bg-card shadow-card`, so a terms
 * document read as a stack of a dozen floating cards. `design/DESIGN-SYSTEM.md` asks for unframed
 * bands and reserves shadow for temporary overlays, and `BRAND.md` asks for "premium through care
 * and restraint, not decoration". A legal document is the place that matters most: it is long,
 * it is read under stress, and card chrome between every clause is friction with no information
 * in it. Sections are now separated by a hairline rule and space.
 *
 * The eyebrow moved from `tracking-wider` (0.05em) to `tracking-widest` (0.1em), which is the
 * kit's `--xoot-track-label` — the same treatment its own `SectionLabel` uses.
 *
 * ── `lastUpdated` is a required prop, and that is the point ────────────────────────────────────
 *
 * It used to be one hardcoded line — "Last updated: 20 June 2026" — rendered identically on all
 * eleven documents. Every one of them was wrong: the pages were last edited on 29 July or
 * 13 August, so each understated its own currency by five to seven weeks.
 *
 * A shared constant cannot be right for eleven documents that change independently, and a date on
 * a terms page is not decoration — it is how a reader knows which version they agreed to. Making
 * it required means a new legal page cannot be added without someone stating one, and editing a
 * document puts the date in the diff where a reviewer sees it.
 *
 * ⚠️ The dates below record when the DOCUMENT TEXT last changed. A cosmetic edit — restyling,
 * a constant extracted with the same rendered value — must NOT bump them, or the field stops
 * meaning anything. They have not been confirmed by counsel; the standing note under every page
 * says these are operational drafts pending South African legal review.
 */

type LegalLayoutProps = {
  title: string;
  description: string;
  canonical: string;
  eyebrow: string;
  /** When this document's text last changed. Not the last commit — see the note above. */
  lastUpdated: string;
  children: ReactNode;
};

export const LegalLayout = ({
  title,
  description,
  canonical,
  eyebrow,
  lastUpdated,
  children,
}: LegalLayoutProps) => (
  <div className="min-h-screen bg-background">
    <SEO title={title} description={description} canonical={canonical} />
    <Navbar />
    <main className="container max-w-4xl py-12 md:py-20">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h1 className="mb-4 font-display text-4xl font-bold tracking-tight md:text-6xl">
        {title.replace("Xoot ", "")}
      </h1>
      <p className="mb-10 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
        {description}
      </p>
      <div className="divide-y divide-border">{children}</div>
      <p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        Last updated: {lastUpdated}. These pages are operational launch drafts and should be
        reviewed by South African legal counsel before public launch.
      </p>
    </main>
    <Footer />
  </div>
);

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="py-7 first:pt-0">
    <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
      {title}
    </h2>
    <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground md:text-base">
      {children}
    </div>
  </section>
);

export const LegalList = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc space-y-2 pl-5">{children}</ul>
);
