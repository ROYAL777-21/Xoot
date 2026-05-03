import { Card } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, FileText, Heart, Sprout, Wrench, DollarSign } from "lucide-react";

const Insurance = () => {
  return (
    <div className="container py-8 lg:py-12 max-w-4xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-sage/15 px-3 py-1 mb-3">
          <ShieldCheck className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">Trust & coverage</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">Insurance, compliance & commission</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">Transparent answers about coverage, Zooter pay, and compliance.</p>
      </div>

      <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-sage-deep" /> What's covered</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {[
          { i: Heart, t: "Indoor cleaning", d: "Up to R50 000 per visit for accidental damage to floors, walls, furniture, and personal items." },
          { i: Sprout, t: "Deep cleaning", d: "Up to R50 000 for damage during deep cleans, move-in/out and Airbnb turnovers." },
          { i: Wrench, t: "Office & commercial", d: "Up to R100 000 for commercial cleaning jobs. Major incidents require a licensed inspection (we'll route you)." },
          { i: AlertTriangle, t: "What's not covered", d: "Pre-existing damage, items above R20 000 not declared at booking, jobs requiring permits we haven't issued." },
        ].map(({ i: I, t, d }) => (
          <Card key={t} className="p-5 rounded-2xl">
            <I className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-display font-bold mb-1">{t}</h3>
            <p className="text-sm text-muted-foreground">{d}</p>
          </Card>
        ))}
      </div>

      <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-sage-deep" /> How Zooters get paid</h2>
      <Card className="p-6 rounded-3xl mb-10">
        <p className="text-sm mb-4">
          Zoot's commission scales with Zooter tenure. New Zooters keep <span className="font-bold">65%</span>;
          experienced Zooters keep up to <span className="font-bold">96%</span> of every booking.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { tier: "New (0–6 mo)", split: "65%", color: "bg-muted" },
            { tier: "Established (6–18 mo)", split: "80%", color: "bg-accent-soft" },
            { tier: "Veteran (18+ mo)", split: "96%", color: "bg-primary/15" },
          ].map((t) => (
            <div key={t.tier} className={`rounded-2xl p-4 ${t.color}`}>
              <p className="text-xs text-muted-foreground">{t.tier}</p>
              <p className="font-display text-3xl font-bold">{t.split}</p>
              <p className="text-xs text-muted-foreground">to Zooter</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          On an average 7-hour booking (~R980), an established Zooter earns ~R784 per visit and ~R15 000–R20 000/month working 3–5 days/week.
        </p>
      </Card>

      <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-sage-deep" /> Compliance</h2>
      <Card className="p-6 rounded-3xl">
        <p className="text-sm mb-3">
          For Zooters working <span className="font-bold">100+ hours/month</span> through Zoot, we contribute to UIF and offer optional COIDA injury coverage —
          a hybrid model designed to protect Zooters without forcing rigid employment terms.
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          <li>Structured contract issued at the 100h/mo threshold</li>
          <li>Partial UIF contribution by Zoot (1% matched)</li>
          <li>Optional COIDA enrolment, fully funded by Zoot</li>
          <li>Annual transparency report shared with all Zooters</li>
        </ul>
      </Card>
    </div>
  );
};

export default Insurance;