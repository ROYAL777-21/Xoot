import { Card } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, FileText, Heart, Camera, Clock } from "lucide-react";

const Insurance = () => {
  return (
    <div className="container py-8 lg:py-12 max-w-4xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-sage/15 px-3 py-1 mb-3">
          <ShieldCheck className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">Trust policy</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">Booking protection workflow</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">Zoot is launch-ready with trust records, admin queues and audit logs. Live insurance or legal cover claims should only be added after approved policy documents are connected.</p>
      </div>

      <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-sage-deep" /> What is active in the app</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {[
          { i: Heart, t: "On-platform booking records", d: "Bookings keep service type, payment status, contractor assignment, household notes and support context together." },
          { i: Clock, t: "Arrival timeline", d: "Confirmed, on the way, arrived, job started and completed statuses are stored as booking events." },
          { i: Camera, t: "Photo proof", d: "Airbnb, deep, moving and premium cleans require before-and-after completion photos." },
          { i: AlertTriangle, t: "Trust incident queue", d: "Lateness, poor quality, damages, suspicious behaviour and escalations create admin review records." },
        ].map(({ i: I, t, d }) => (
          <Card key={t} className="p-5 rounded-2xl">
            <I className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-display font-bold mb-1">{t}</h3>
            <p className="text-sm text-muted-foreground">{d}</p>
          </Card>
        ))}
      </div>

      <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-sage-deep" /> Policy status</h2>
      <Card className="p-6 rounded-3xl">
        <p className="text-sm mb-3">
          This build does not claim live insurance, UIF, COIDA, or legal cover. Those claims need approved policy support before publication.
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          <li>Use support tickets for customer concerns.</li>
          <li>Use trust incidents for safety, damage and quality concerns.</li>
          <li>Use admin operations queues for payment, provider and escalation follow-up.</li>
          <li>Keep all contractor and household sensitive data on-platform.</li>
        </ul>
      </Card>
    </div>
  );
};

export default Insurance;
