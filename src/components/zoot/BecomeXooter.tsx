import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export const BecomeXooter = () => {
  return (
    <section id="become-zooter" className="py-20 md:py-28 bg-secondary/40 border-y border-border">
      <div className="container">
        <div className="rounded-4xl gradient-warm p-10 md:p-16 shadow-warm text-primary-foreground relative overflow-hidden">
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 mb-5 backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              <span className="text-xs font-semibold">Join the Xoot marketplace</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance mb-5">
              For independent contractors who want premium work standards.
            </h2>
            <p className="text-lg opacity-95 max-w-xl mb-8">
              Apply with your experience, references, transport, supplies, suburb coverage, pet comfort and trust documents. Activation requires verification and training.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="rounded-full font-semibold">
                <Link to="/zooter/apply">Apply now</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="rounded-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/zooter/training">View training</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
