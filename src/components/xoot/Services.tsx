import { Home, Building2, Sparkles, BedDouble, Truck, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const services = [
  { icon: Home, title: "Residential cleaning", desc: "Weekly tidies, fortnightly deep cleans, and one-off resets.", tone: "primary" },
  { icon: TimerReset, title: "Express cleaning", desc: "Focused resets for smaller spaces and tighter windows.", tone: "sage" },
  { icon: Building2, title: "Office & commercial", desc: "Office, estate and small commercial cleans with admin follow-up.", tone: "sage" },
  { icon: BedDouble, title: "Airbnb turnovers", desc: "Turnovers with host notes, readiness checks and photo proof.", tone: "primary" },
  { icon: Truck, title: "Moving cleans", desc: "Move-in and move-out cleans with before-and-after proof.", tone: "primary" },
  { icon: Sparkles, title: "Premium clean", desc: "Detailed home care for high-attention spaces and special resets.", tone: "sage" },
];

export const Services = () => (
  <section id="services" className="py-20 md:py-28">
    <div className="container">
      <div className="max-w-2xl mb-12 md:mb-16">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">What we clean</p>
        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
          Specialists in cleaning the spaces you live, host and work in.
        </h2>
        <p className="text-lg text-muted-foreground mt-4">
          Homes, offices and Airbnbs in the current Xoot launch area, with vetting, ratings, arrival tracking and completion proof where required.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <article key={s.title} className="group relative rounded-3xl border border-border bg-card p-6 md:p-7 shadow-card transition-all duration-500 hover:-translate-y-1 overflow-hidden">
              <div className="relative">
                <div className={`inline-grid place-items-center h-12 w-12 rounded-2xl mb-5 transition-transform group-hover:scale-110 ${s.tone === "primary" ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent-ink"}`}>
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
        <Button asChild size="lg" className="rounded-full"><Link to="/app">Book a clean</Link></Button>
        <Button asChild size="lg" variant="outline" className="rounded-full"><Link to="/care-plus">Find full-time help</Link></Button>
      </div>
    </div>
  </section>
);
