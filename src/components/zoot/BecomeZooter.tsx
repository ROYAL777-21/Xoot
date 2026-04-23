import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export const BecomeZooter = () => {
  return (
    <section id="become-zooter" className="py-20 md:py-28 bg-secondary/40 border-y border-border">
      <div className="container">
        <div className="rounded-[2rem] gradient-warm p-10 md:p-16 shadow-warm text-primary-foreground relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 mb-5 backdrop-blur">
              <Sparkles className="h-3 w-3" />
              <span className="text-xs font-semibold">For professional cleaners</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance mb-5">
              Want to work with Zoot?
            </h2>
            <p className="text-lg opacity-95 max-w-xl mb-8">
              Become your own boss, choose your own schedule, and work in your preferred areas — get a stable supply of clients.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="rounded-full font-semibold">
                <Link to="/zooter/apply">Apply now</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="rounded-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/zooter/apply">Learn more</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
