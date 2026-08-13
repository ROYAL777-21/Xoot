import { Link } from "react-router-dom";
import { CheckCircle2, Home, Plus, Share, Smartphone, Sparkles } from "lucide-react";
import { Navbar } from "@/components/xoot/Navbar";
import { Footer } from "@/components/xoot/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { haptic } from "@/lib/haptics";

const installSteps = [
  { title: "Open Xoot in Safari", detail: "Use the live Xoot link on your iPhone.", icon: Smartphone },
  { title: "Tap Share", detail: "The iOS share button sits at the bottom of Safari.", icon: Share },
  { title: "Add to Home Screen", detail: "Choose Add to Home Screen, then confirm the Xoot icon.", icon: Plus },
  { title: "Launch Xoot", detail: "Open Xoot from your Home Screen for the app-style experience.", icon: Home },
];

const PwaInstall = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Install Xoot on iPhone - Home Screen app access"
        description="Add Xoot to your iPhone Home Screen for app-style access to booking, Care+, support and home-care workflows."
        canonical="/install"
      />
      <Navbar />
      <main>
        <section className="bg-[#faf4e8] py-16 dark:bg-background md:py-24">
          <div className="container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1">
                <Sparkles className="h-3 w-3 text-sage-deep" />
                <span className="text-xs font-medium text-sage-deep">iPhone app access</span>
              </div>
              <h1 className="font-display text-5xl font-bold leading-[1.03] tracking-tight md:text-6xl">
                Put Xoot on your iPhone Home Screen.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Use Xoot as an installable iPhone web app while the native TestFlight build waits for Apple Developer access and final bundle IDs.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-14 rounded-full gradient-warm px-7" onClick={() => haptic("impact")}>
                  <Link to="/auth">Open secure sign-in</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 rounded-full px-7" onClick={() => haptic("selection")}>
                  <Link to="/care-plus">Explore Care+</Link>
                </Button>
              </div>
            </div>

            <Card className="rounded-3xl border-border/70 bg-card p-6 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">iPhone-ready checklist</p>
                  <p className="text-sm text-muted-foreground">PWA first, TestFlight next.</p>
                </div>
              </div>
              <div className="space-y-3">
                {["Secure auth routes", "Standalone display mode", "iOS theme and status bar", "Service worker fallback", "Mobile-first dashboards"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-muted/45 p-3">
                    <CheckCircle2 className="h-5 w-5 text-sage-deep" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">Install steps</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">Four taps from browser to app-like Xoot.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {installSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card key={step.title} className="rounded-3xl border-border/70 p-6 shadow-card">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-sage-deep">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="font-display text-3xl font-bold text-muted-foreground/50">0{index + 1}</span>
                    </div>
                    <h3 className="font-display text-2xl font-bold">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PwaInstall;
