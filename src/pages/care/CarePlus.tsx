import { Navbar } from "@/components/zoot/Navbar";
import { Footer } from "@/components/zoot/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, ShieldCheck, ArrowRight, CheckCircle2, Search, UserCheck, Coffee, Home } from "lucide-react";

const steps = [
  { icon: Search, title: "Tell us what you need", desc: "Share the home, schedule, preferred work style and service expectations." },
  { icon: UserCheck, title: "Review vetted matches", desc: "Review candidates only after the required trust checks and admin review steps." },
  { icon: Coffee, title: "Meet your favourites", desc: "Interview or trial-book before deciding who fits your household best." },
  { icon: Home, title: "Keep continuity", desc: "Use HomeCare+ to save preferences, schedules, favourite contractors and support context." },
];

const faqs = [
  {
    q: "How does HomeCare+ help retention?",
    a: "It keeps favourite contractors, household notes, recurring schedule lock, priority support and loyalty context in one place.",
  },
  {
    q: "What happens before activation?",
    a: "Contractors require identity, selfie, address, banking, references, MIE screening status, and required training review before activation.",
  },
];

const CarePlus = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="gradient-hero">
          <div className="container py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">HomeCare+ membership</span>
              </div>
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight text-balance">
                Recurring home care, kept simple.
              </h1>
              <p className="mt-6 text-xl text-muted-foreground max-w-xl">
                HomeCare+ brings favourite contractors, saved home notes, recurring schedules, priority support and loyalty context into one membership.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full gradient-warm shadow-warm h-14 px-7 text-base">
                  <Link to="/app/plans">Request HomeCare+ <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full h-14 px-7 text-base">
                  <Link to="/app">Make a one-off booking</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] bg-card border border-border p-8 shadow-warm">
              <div className="flex items-center gap-3 mb-6">
                <div className="grid place-items-center h-12 w-12 rounded-2xl gradient-warm shadow-warm">
                  <ShieldCheck className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold">What HomeCare+ keeps</h3>
                  <p className="text-sm text-muted-foreground">Convenience continuity for your home</p>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "Favourite contractor continuity",
                  "Preferred team and recurring favourites",
                  "Saved household notes and preferences",
                  "Recurring schedule lock",
                  "Emergency booking priority",
                  "Flexible cancellation controls",
                  "Loyalty rewards and seasonal home-care tips",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-sage-deep shrink-0 mt-0.5" /> {p}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full rounded-2xl gradient-warm h-12 font-semibold">
                <Link to="/app/plans">Open HomeCare+</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-secondary/40 border-y border-border">
          <div className="container">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-sage-deep uppercase tracking-wider mb-3">How it works</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
                Build a home-care system, not a once-off booking habit.
              </h2>
            </div>
            <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={s.title} className="rounded-3xl bg-card border border-border p-6 shadow-card">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-display text-xs font-bold text-muted-foreground tracking-widest">0{i + 1}</span>
                      <span className="grid place-items-center h-10 w-10 rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container max-w-3xl">
            <div className="rounded-[2rem] gradient-sage p-10 md:p-14 text-primary-foreground shadow-warm">
              <div className="grid place-items-center h-14 w-14 rounded-2xl bg-primary-foreground/15 backdrop-blur mb-5">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="font-display text-3xl md:text-4xl font-bold mb-4">Replacement support</h3>
              <p className="text-lg opacity-95 mb-2">
                If a recurring helper or placement no longer fits your needs, Zoot support can review replacement options under the active policy terms.
              </p>
              <Link to="/legal/terms" className="text-sm font-semibold underline underline-offset-4 opacity-90 hover:opacity-100">
                View policy terms
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-secondary/40 border-t border-border">
          <div className="container max-w-3xl">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-8">Frequently asked questions</h2>
            <div className="space-y-4">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-3xl bg-card border border-border p-6">
                  <summary className="cursor-pointer font-display font-semibold text-lg flex items-center justify-between gap-4">
                    {f.q}
                    <span className="text-primary transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
                  </summary>
                  <p className="mt-4 text-muted-foreground text-sm leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CarePlus;
