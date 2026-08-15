import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Building2, ShieldCheck, Sparkles } from "lucide-react";

const operatorSegments = [
  "Residential property managers",
  "Estate agencies",
  "Airbnb hosts",
  "Landlords",
  "Office administrators",
  "Guesthouse teams",
  "Facilities coordinators",
  "Body corporate trustees",
];

const articleLinks = [
  "How Xoot verifies Xooters",
  "Care+ and Home Memory",
  "Airbnb turnover checklists",
];

export const HomeExpansion = () => (
  <>
    <section className="border-y border-border bg-muted/35 py-14">
      <div className="container grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Built for high-trust operators
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Designed for the people who cannot afford messy handovers.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Xoot is being shaped around real cleaning operations for property managers, short-term rental hosts, landlords, offices and homes. These are target operator groups, not unsupported partnership or customer-logo claims.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {operatorSegments.map((segment) => (
            <div key={segment} className="rounded-2xl border border-border bg-card px-4 py-3 text-center text-sm font-bold leading-5 shadow-card">
              <Building2 className="mx-auto mb-2 h-4 w-4 text-primary" />
              {segment}
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="py-14">
      <div className="container flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-ink">
            <BookOpen className="h-3.5 w-3.5" /> Articles
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Useful reads before you book.</h2>
        </div>
        <Link to="/articles" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          View articles <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="container mt-6 grid gap-3 md:grid-cols-3">
        {articleLinks.map((title) => (
          <Link key={title} to="/articles" className="group rounded-3xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card">
            <Sparkles className="mb-4 h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-bold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Read the practical Xoot guide.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </div>
    </section>
  </>
);
