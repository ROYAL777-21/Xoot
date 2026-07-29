import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

const proofItems = [
  { stat: "Verified", label: "Badge path" },
  { stat: "MIE", label: "Screening queue" },
  { stat: "Training", label: "Required modules" },
  { stat: "Recurring", label: "Client continuity" },
];

export const CtaBand = () => (
  <section id="pro" className="py-20 md:py-28">
    <div className="container">
      <div className="relative overflow-hidden rounded-[2.5rem] gradient-warm p-10 md:p-16 shadow-warm">
        <div className="relative grid md:grid-cols-2 gap-10 items-center">
          <div className="text-primary-foreground">
            <span className="inline-block text-xs font-bold tracking-widest uppercase bg-primary-foreground/20 backdrop-blur-sm rounded-full px-3 py-1 mb-5">Become a Xooter</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance mb-4">Build a stronger contractor profile.</h2>
            <p className="text-primary-foreground/85 text-lg max-w-md">Xoot helps high-quality independent contractors show experience, suburb coverage, reliability, repeat clients, training and trust badges.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="rounded-full font-semibold"><Link to="/zooter/apply">Become a Xooter <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="ghost" className="rounded-full text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"><Link to="/zooter/training"><Smartphone className="mr-1 h-4 w-4" /> See training</Link></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-primary-foreground">
            {proofItems.map((s) => (
              <div key={s.label} className="rounded-2xl bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 p-5">
                <p className="font-display text-3xl md:text-4xl font-bold">{s.stat}</p>
                <p className="text-sm text-primary-foreground/85 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);
