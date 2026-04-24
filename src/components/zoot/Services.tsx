import { Home, Building2, Sparkles, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const services = [
  { icon: Home, title: "Residential cleaning", desc: "Weekly tidies, fortnightly deep cleans, one-off resets.", tone: "primary" },
  { icon: Building2, title: "Office & commercial", desc: "After-hours office, retail and small commercial cleans.", tone: "sage" },
  { icon: BedDouble, title: "Airbnb turnovers", desc: "Same-day turnovers with linen, restock and photo proof.", tone: "primary" },
  { icon: Sparkles, title: "Move-in / move-out", desc: "Inside-of-oven, behind appliances, baseboards — the works.", tone: "sage" },
];

export const Services = () => (
  <section id="services" className="py-20 md:py-28">
    <div className="container">
      <div className="max-w-2xl mb-12 md:mb-16">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">What we clean</p>
        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
          Specialists in cleaning the spaces you live and work in.
        </h2>
        <p className="text-lg text-muted-foreground mt-4">
          Homes, offices and Airbnbs across South Africa — vetted, rated and insured.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <article key={s.title} className="group relative rounded-3xl border border-border bg-card p-6 md:p-7 shadow-card hover:shadow-warm transition-all duration-500 hover:-translate-y-1 overflow-hidden">
              <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${s.tone === "primary" ? "bg-primary/30" : "bg-accent/30"}`} />
              <div className="relative">
                <div className={`inline-grid place-items-center h-12 w-12 rounded-2xl mb-5 transition-transform group-hover:scale-110 ${s.tone === "primary" ? "bg-primary/10 text-primary" : "bg-accent/15 text-sage-deep"}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="rounded-full gradient-warm shadow-warm"><Link to="/app">Book a clean</Link></Button>
        <Button asChild size="lg" variant="outline" className="rounded-full"><Link to="/care-plus">Find full-time help</Link></Button>
      </div>
    </div>
  </section>
);
