import { Navbar } from "@/components/zoot/Navbar";
import { Footer } from "@/components/zoot/Footer";
import { SEO } from "@/components/SEO";
import { ShieldCheck, FileSearch, Star, HeartHandshake, LockKeyhole, Clock3 } from "lucide-react";

const items = [
  {
    icon: FileSearch,
    title: "Visible verification steps",
    desc: "Xoot shows identity, selfie, address, reference, training, and third-party screening status so trust is explained, not hidden behind a vague badge.",
  },
  {
    icon: ShieldCheck,
    title: "Activation gates",
    desc: "A Xooter cannot be activated until the required review areas are marked complete by the trust workflow and admin review.",
  },
  {
    icon: LockKeyhole,
    title: "Protected home details",
    desc: "Access notes, gate codes, parking, pets, and entry instructions are treated as sensitive and should only be shown inside authenticated booking windows.",
  },
  {
    icon: Clock3,
    title: "Cancellation response",
    desc: "When a booking is disrupted, Xoot routes the issue into support and replacement matching. We do not promise availability before it is confirmed.",
  },
  {
    icon: Star,
    title: "Reliability over time",
    desc: "Punctuality, completion, complaints, repeat bookings, and customer feedback feed the reliability model so quality is monitored after approval.",
  },
  {
    icon: HeartHandshake,
    title: "Human escalation",
    desc: "Low ratings, safety concerns, payment issues, and trust incidents are escalated for human review instead of being left to automation alone.",
  },
];

const TrustSafety = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Xoot Trust Centre - Verified home care and protected booking details"
      description="See how Xoot handles verification, protected household information, support escalation, and reliability monitoring for trusted home care."
      canonical="/trust-centre"
    />
    <Navbar />
    <main className="container max-w-5xl py-12 md:py-20">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Trust & Safety</p>
      <h1 className="mb-4 font-display text-4xl font-bold md:text-6xl">Trust that can be inspected.</h1>
      <p className="mb-10 max-w-3xl text-lg leading-relaxed text-muted-foreground">
        Xoot is designed around visible verification, protected household information, on-platform communication, and fast human escalation when something needs attention.
      </p>
      <div className="mb-10 rounded-3xl border border-border bg-card p-6 shadow-card">
        <p className="text-sm font-semibold text-sage-deep">No unsupported promises</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Xoot only shows guarantees, insurance, replacement timing, and background-check claims when the relevant operational support and verification evidence exist. If a backend workflow is still pending, the product presents it as a review or support process, not as a guarantee.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.title} className="rounded-3xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:shadow-warm">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div>
              <h3 className="mb-1 font-display text-lg font-semibold">{it.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{it.desc}</p>
            </div>
          );
        })}
      </div>
    </main>
    <Footer />
  </div>
);

export default TrustSafety;
