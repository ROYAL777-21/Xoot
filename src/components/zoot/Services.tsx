import { Home, Sprout, Baby, Wrench, Shirt, Dog } from "lucide-react";

const services = [
  { icon: Home, title: "House cleaning", desc: "Deep cleans, weekly tidying", from: "$28/hr", tone: "primary" },
  { icon: Sprout, title: "Gardening", desc: "Lawn, hedges, planting", from: "$32/hr", tone: "sage" },
  { icon: Baby, title: "Childcare", desc: "Vetted nannies & sitters", from: "$22/hr", tone: "primary" },
  { icon: Wrench, title: "Handyman", desc: "Repairs, assembly, fixes", from: "$45/hr", tone: "sage" },
  { icon: Shirt, title: "Laundry & ironing", desc: "Pickup & delivery", from: "$24/hr", tone: "primary" },
  { icon: Dog, title: "Pet care", desc: "Walks, sitting, grooming", from: "$20/hr", tone: "sage" },
];

export const Services = () => {
  return (
    <section id="services" className="py-20 md:py-28">
      <div className="container">
        <div className="max-w-2xl mb-12 md:mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Every service
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
            One app for every kind of help around the home.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <article
                key={s.title}
                className="group relative rounded-3xl border border-border bg-card p-6 md:p-7 shadow-card hover:shadow-warm transition-all duration-500 hover:-translate-y-1 cursor-pointer overflow-hidden"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  s.tone === "primary" ? "bg-primary/30" : "bg-accent/30"
                }`} />
                <div className="relative">
                  <div className={`inline-grid place-items-center h-12 w-12 rounded-2xl mb-5 transition-transform group-hover:scale-110 ${
                    s.tone === "primary" ? "bg-primary/10 text-primary" : "bg-accent/15 text-sage-deep"
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mb-5">{s.desc}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">From</span>
                    <span className="font-display font-bold text-foreground">{s.from}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
