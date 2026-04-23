import { Star, FileSearch, Briefcase, Shield } from "lucide-react";

const items = [
  { icon: Star, title: "Ratings and reviews", desc: "Every Zooter is rated by real customers after every visit." },
  { icon: FileSearch, title: "Reference & background checks", desc: "ID verification, criminal background and reference checks completed before joining." },
  { icon: Briefcase, title: "2+ years experience", desc: "Every Zooter brings at least 2 years of professional cleaning experience to your home." },
  { icon: Shield, title: "Insurance included", desc: "Every booking is covered by our insurance policy for peace of mind." },
];

export const SafetyTrust = () => {
  return (
    <section id="safety" className="py-20 md:py-28">
      <div className="container">
        <div className="max-w-2xl mb-12 md:mb-16">
          <p className="text-sm font-semibold text-sage-deep uppercase tracking-wider mb-3">
            Safety & Security
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance mb-4">
            Safety and security is our top priority.
          </h2>
          <p className="text-lg text-muted-foreground">
            We connect you to hardworking, trusted individuals who are experienced, vetted, rated and dependable.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <article key={it.title} className="rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-warm transition-all duration-500 hover:-translate-y-1">
                <div className="grid place-items-center h-12 w-12 rounded-2xl bg-accent/15 text-sage-deep mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-1">{it.title}</h3>
                <p className="text-sm text-muted-foreground">{it.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
