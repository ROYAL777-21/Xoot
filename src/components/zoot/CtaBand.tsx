import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

export const CtaBand = () => (
  <section id="pro" className="py-20 md:py-28">
    <div className="container">
      <div className="relative overflow-hidden rounded-[2.5rem] gradient-warm p-10 md:p-16 shadow-warm">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary-glow/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-accent/40 blur-3xl" />
        <div className="relative grid md:grid-cols-2 gap-10 items-center">
          <div className="text-primary-foreground">
            <span className="inline-block text-xs font-bold tracking-widest uppercase bg-primary-foreground/20 backdrop-blur rounded-full px-3 py-1 mb-5">Become a Zooter</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance mb-4">Earn on your terms with Zoot.</h2>
            <p className="text-primary-foreground/85 text-lg max-w-md">Set your rates, choose your hours, build your client base. Anyone who meets the requirements can join. Established Zooters earn up to R7 500/week.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="rounded-full font-semibold"><Link to="/zooter/apply">Become a Zooter <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="ghost" className="rounded-full text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"><Link to="/zooter/training"><Smartphone className="mr-1 h-4 w-4" /> See training</Link></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-primary-foreground">
            {[{ stat: "R7 500", label: "Avg weekly earnings" },{ stat: "12K+", label: "Active Zooters" },{ stat: "4.9★", label: "Average rating" },{ stat: "0%", label: "Sign-up fee" }].map((s) => (
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
