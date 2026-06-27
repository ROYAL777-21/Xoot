import type { ReactNode } from "react";
import { Footer } from "@/components/zoot/Footer";
import { Navbar } from "@/components/zoot/Navbar";
import { SEO } from "@/components/SEO";

type LegalLayoutProps = {
  title: string;
  description: string;
  canonical: string;
  eyebrow: string;
  children: ReactNode;
};

export const LegalLayout = ({ title, description, canonical, eyebrow, children }: LegalLayoutProps) => (
  <div className="min-h-screen bg-background">
    <SEO title={title} description={description} canonical={canonical} />
    <Navbar />
    <main className="container max-w-4xl py-12 md:py-20">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h1 className="mb-4 font-display text-4xl font-bold tracking-tight md:text-6xl">{title.replace("Zoot ", "")}</h1>
      <p className="mb-10 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p>
      <div className="space-y-9">{children}</div>
      <p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        Last updated: 20 June 2026. These pages are operational launch drafts and should be reviewed by South African legal counsel before public launch.
      </p>
    </main>
    <Footer />
  </div>
);

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-7">
    <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h2>
    <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground md:text-base">{children}</div>
  </section>
);

export const LegalList = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc space-y-2 pl-5">{children}</ul>
);
