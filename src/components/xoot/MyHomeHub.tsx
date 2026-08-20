import { Smartphone, Wallet, ShieldCheck, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const features = [
  { icon: Wallet, title: "You set the pay", desc: "Decide your worker's daily rate. They get 100% — Xoot never deducts." },
  { icon: Smartphone, title: "Manage in the Xooter App", desc: "Schedule, payments, attendance and payslips — all in one place." },
  { icon: ShieldCheck, title: "We handle compliance", desc: "Vetted workers, UIF guidance and dispute mediation when you need it." },
  { icon: Headphones, title: "Expert support", desc: "Real humans on call when you have questions about your worker or the app." },
];

export const MyHomeHub = () => {
  return (
    <section id="myhome-hub" className="py-20 md:py-28 bg-secondary/40 border-y border-border">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">MyHome Hub</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance mb-5">
              Manage your private domestic worker via the Xooter App.
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mb-8">
              With MyHome Hub, you set your own pay, your worker gets the full amount,
              and you get easy tools to manage it all — plus expert support when you need it.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/care-plus">Find full-time help</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/app">Open the app</Link>
              </Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-3xl bg-card border border-border p-5 shadow-card transition-all duration-500">
                  <div className="grid place-items-center h-11 w-11 rounded-2xl bg-primary/10 text-primary mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-semibold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
