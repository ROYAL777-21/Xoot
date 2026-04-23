import { Navbar } from "@/components/zoot/Navbar";
import { Footer } from "@/components/zoot/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Sparkles, ShieldCheck, Calendar, Repeat, Heart, ArrowRight,
  CheckCircle2, Search, UserCheck, Coffee, Home,
} from "lucide-react";

const steps = [
  { icon: Search, title: "Tell us what you're looking for", desc: "Share your home, schedule and ideal candidate." },
  { icon: UserCheck, title: "Review carefully selected matches", desc: "Up to 5 vetted candidates curated for your home." },
  { icon: Coffee, title: "Meet your favourites", desc: "Interview or trial-book to make sure they're the right fit." },
  { icon: Home, title: "Choose the right helper", desc: "Pick the helper that fits your home and family." },
];

const faqs = [
  {
    q: "How many interviews and trial bookings can I do?",
    a: "You can interview up to 5 candidates. After that, you'll need to book a trial session with one or more to move forward with the process.",
  },
  {
    q: "What's included in the placement fee?",
    a: "The placement fee covers expert sourcing, vetting, and coordination of interviews and trials — plus support until you find the right helper.",
  },
];

const CarePlus = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="gradient-hero">
          <div className="container py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Care+ — Premium subscription</span>
              </div>
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight text-balance">
                Reliable home help, on schedule, every time.
              </h1>
              <p className="mt-6 text-xl text-muted-foreground max-w-xl">
                Same Zooter every visit. Locked-in pricing. Free replacements when life happens.
                <span className="block mt-2 font-semibold text-foreground">From R99/month.</span>
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full gradient-warm shadow-warm h-14 px-7 text-base">
                  <Link to="/care-plus/apply">Hire a housekeeper <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full h-14 px-7 text-base">
                  <Link to="/app">Make a one-off booking</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] bg-card border border-border p-8 shadow-warm">
              <div className="flex items-center gap-3 mb-6">
                <div className="grid place-items-center h-12 w-12 rounded-2xl gradient-warm shadow-warm">
                  <Heart className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold">Care+ subscription</h3>
                  <p className="text-sm text-muted-foreground">For dedicated, recurring help</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="font-display text-6xl font-bold">R99</span>
                <span className="text-muted-foreground">/month platform fee</span>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "Same trusted Zooter every visit",
                  "You set the daily pay — Zooter gets 100%",
                  "Free replacement if your Zooter is unavailable",
                  "Priority booking & schedule lock",
                  "Cancel anytime — no lock-in",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-sage-deep shrink-0 mt-0.5" /> {p}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full rounded-2xl gradient-warm h-12 font-semibold">
                <Link to="/app/plans">Activate Care+</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Hire a housekeeper */}
        <section className="py-20 md:py-28">
          <div className="container max-w-4xl text-center">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Make a placement</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance mb-5">
              Hire a housekeeper.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We source reliable, full-time housekeepers — to be managed by you or through the Zooter App.
              Our expert agents are here to find your perfect match.
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full gradient-warm shadow-warm">
              <Link to="/care-plus/apply">Start your placement <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 md:py-28 bg-secondary/40 border-y border-border">
          <div className="container">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-sage-deep uppercase tracking-wider mb-3">How it works</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
                Let's find your permanent housekeeper.
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

            <div className="mt-10 rounded-3xl bg-card border border-border p-6 md:p-8 max-w-3xl mx-auto">
              <p className="text-sm text-muted-foreground leading-relaxed">
                To get started, we charge a <span className="font-semibold text-foreground">non-refundable admin fee of R399</span>. Once you've submitted the form,
                one of our placement agents will be in touch to guide you through each step. If you decide to hire
                someone through Zoot, a placement fee applies.{" "}
                <Link to="/legal/terms" className="text-primary hover:underline">View the full price breakdown here</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Happiness guarantee */}
        <section className="py-20 md:py-28">
          <div className="container max-w-3xl">
            <div className="rounded-[2rem] gradient-sage p-10 md:p-14 text-primary-foreground shadow-warm">
              <div className="grid place-items-center h-14 w-14 rounded-2xl bg-primary-foreground/15 backdrop-blur mb-5">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="font-display text-3xl md:text-4xl font-bold mb-4">Our happiness guarantee</h3>
              <p className="text-lg opacity-95 mb-2">
                If you're not completely satisfied within the first 90 days of hiring your helper,
                we'll match you with a replacement helper at no extra cost.
              </p>
              <Link to="/legal/terms" className="text-sm font-semibold underline underline-offset-4 opacity-90 hover:opacity-100">
                Learn more here
              </Link>
            </div>
          </div>
        </section>

        {/* FAQs */}
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

        {/* CTA band */}
        <section className="py-16">
          <div className="container max-w-3xl text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Ready to find your perfect match?</h2>
            <Button asChild size="lg" className="rounded-full gradient-warm shadow-warm">
              <Link to="/care-plus/apply">Make a booking <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CarePlus;
