import { Star, FileSearch, Briefcase, Shield } from "lucide-react";

/*
 * ⚠️ EVERY LINE HERE IS A REPRESENTATION TO A CONSUMER.
 *
 * Under the Consumer Protection Act s41 a misleading representation is misleading regardless of
 * intent, so "we built the queue" and "we screen every Xooter through it" are not the same
 * sentence and only one of them is currently true. Production has one user and zero completed
 * bookings; the workflow exists and has not been operated at scale. Each claim below is therefore
 * scoped to what the product *requires or displays*, which is checkable today, rather than to an
 * operational record that does not exist yet.
 *
 * Two specific things were removed on 2026-09-02, both raised as open questions in
 * `NEEDS-FOUNDER.md` §4:
 *
 *   1. **MIE screening.** `src/pages/admin/Kyc.tsx` has a `third_party_verification_status` field
 *      labelled "MIE / third-party screening", so the *field* exists. Naming MIE on the homepage
 *      asserts a commercial relationship with a specific screening bureau. Nothing in this repo
 *      evidences one. The vetting claim now describes the admin review, which is a real gate on
 *      activation, and names no bureau.
 *
 *   2. **The training topics were wrong**, which only shows up if you read the seed. The copy
 *      claimed etiquette, luxury-home expectations, pets, fragile items and punctuality. Those
 *      five are `contractor_screening_questions` — interview questions, seeded by
 *      `20260518123000`. The actual `training_modules` seeded by `20260421080011` are cleaning
 *      standards, hospitality and communication, eco-friendly practice, child-safety essentials
 *      and garden pruning. The line now lists the modules that exist.
 *
 * If any of this becomes provably true — a signed bureau, a training completion record, a worked
 * incident queue — say so here with the evidence rather than restoring the older, broader wording.
 */
const items = [
  { icon: Star, title: "Visible quality signals", desc: "Every Xooter profile carries a rating, reliability score, completion rate and repeat-client count, next to the badges they have earned." },
  { icon: FileSearch, title: "Admin-reviewed vetting", desc: "No Xooter is activated until an admin has reviewed their ID, selfie, proof of address, banking details and references." },
  { icon: Briefcase, title: "Training gate", desc: "Onboarding modules cover cleaning standards and chemical safety, hospitality and communication, child-safety essentials, eco-friendly practice and garden work." },
  { icon: Shield, title: "Incident system", desc: "Lateness, quality complaints, damage and escalations have a route into an admin trust-review queue, not an inbox." },
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
            Xoot combines admin vetting, required training, reliability scoring, arrival status and admin review queues to protect marketplace quality.
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
