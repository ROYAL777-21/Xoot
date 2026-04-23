import { Navbar } from "@/components/zoot/Navbar";
import { Footer } from "@/components/zoot/Footer";
import { ShieldCheck, FileSearch, Star, HeartHandshake } from "lucide-react";

const items = [
  { icon: FileSearch, title: "Verified identities", desc: "Government ID, address proof, and references checked before any Zooter is approved." },
  { icon: ShieldCheck, title: "Background screening", desc: "Criminal background checks performed via licensed third-party providers." },
  { icon: Star, title: "Continuous quality", desc: "Every booking is rated. Zooters falling below our standards are removed." },
  { icon: HeartHandshake, title: "Insurance & disputes", desc: "Booking-level insurance plus a dedicated support team to resolve issues fast." },
];

const TrustSafety = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container max-w-4xl py-12 md:py-20">
      <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Trust & Safety</p>
      <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">Built on trust.</h1>
      <p className="text-lg text-muted-foreground mb-12">Every Zooter on the platform has cleared identity, reference and background checks. Here's how we keep your home safe.</p>
      <div className="grid sm:grid-cols-2 gap-5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.title} className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <div className="grid place-items-center h-12 w-12 rounded-2xl bg-primary/10 text-primary mb-4"><Icon className="h-6 w-6" /></div>
              <h3 className="font-display font-semibold text-lg mb-1">{it.title}</h3>
              <p className="text-sm text-muted-foreground">{it.desc}</p>
            </div>
          );
        })}
      </div>
    </main>
    <Footer />
  </div>
);
export default TrustSafety;
