import { Star, FileSearch, Briefcase, Shield } from "lucide-react";

const items = [
  { icon: Star, title: "Visible quality signals", desc: "Profiles show ratings, reliability score, completion rate, repeat-client count and trust badges." },
  { icon: FileSearch, title: "Admin-reviewed vetting", desc: "ID, selfie, proof of address, bank, references and MIE screening status are reviewed before activation." },
  { icon: Briefcase, title: "Training gate", desc: "Required onboarding covers etiquette, client interaction, luxury-home expectations, pets, fragile items and punctuality." },
  { icon: Shield, title: "Incident system", desc: "Lateness, poor quality, damages, suspicious behaviour and escalations are routed into trust review queues." },
];

export const SafetyTrust = () => {
  return (
    <section id="safety" className="py-20 md:py-28">
      <div className="container">
        <div className="max-w-2xl mb-12 md:mb-16">
          <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-3">
            Safety & Security
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance mb-4">
            Trust is built into the workflow, not added as decoration.
          </h2>
          <p className="text-lg text-muted-foreground">
            Xoot combines vetting, training, reliability scoring, arrival tracking and admin review queues to protect marketplace quality.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <article key={it.title} className="rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-500 hover:-translate-y-1">
                <div className="grid place-items-center h-12 w-12 rounded-2xl bg-accent/15 text-accent-ink mb-4">
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
