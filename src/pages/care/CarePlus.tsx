import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Crown,
  Heart,
  Home,
  Loader2,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/zoot/Navbar";
import { Footer } from "@/components/zoot/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { CarePlusMark } from "@/components/care-plus/CarePlusMark";
import { CarePlusBenefitCard, CarePlusComparisonTable, CarePlusSupportPromise } from "@/components/care-plus/CarePlusShowcase";
import { carePlusBenefits, carePlusMoatBenefits } from "@/data/care-plus";
import { useCarePlus } from "@/hooks/useCarePlus";
import { useZootCred } from "@/hooks/useZootCred";
import { formatZAR } from "@/lib/format";
import { haptic } from "@/lib/haptics";

const pillars = [
  {
    title: "Memory",
    body: "Save pets, parking, product preferences, allergies, fragile areas and default add-ons once.",
    icon: Home,
  },
  {
    title: "Continuity",
    body: "Keep a preferred Zooter close to repeat bookings when availability allows.",
    icon: Heart,
  },
  {
    title: "Priority",
    body: "Get earlier support handling when a booking, cancellation or replacement needs attention.",
    icon: Crown,
  },
  {
    title: "Loyalty",
    body: "Track ZootCred from the ledger and use monthly add-on credit before it expires.",
    icon: WalletCards,
  },
];

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value)) : "Not available";

const CarePlus = () => {
  const carePlus = useCarePlus();
  const zootCred = useZootCred();

  const joinCarePlus = async () => {
    try {
      haptic("impact");
      await carePlus.requestMembership();
      haptic("success");
      toast.success("Care+ setup started. Complete payment to activate member benefits.");
    } catch (error) {
      haptic("warning");
      toast.error(error instanceof Error ? error.message : "Care+ setup could not start.");
    }
  };

  const state = carePlus.state;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Zoot Care+ - Premium recurring home care and ZootCred"
        description="Join Zoot Care+ for saved home memory, preferred Zooter continuity, priority support and ledger-backed ZootCred add-on credit."
        canonical="/care-plus"
      />
      <Navbar />
      <main>
        <section className="relative overflow-hidden bg-[#faf4e8] dark:bg-background">
          <div className="container grid gap-10 py-14 sm:py-16 lg:min-h-[700px] lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12 lg:py-24">
            <div className="animate-fade-up">
              <h1 className="font-display text-4xl font-bold leading-[1.04] tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
                <CarePlusMark /> keeps your home ready.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                A real membership layer for repeat households: saved home memory, priority support, favourite Zooter continuity and ledger-backed ZootCred.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {state.status === "unauthenticated" ? (
                  <Button asChild size="lg" className="h-14 w-full justify-center rounded-full gradient-warm px-7 text-base font-semibold shadow-warm sm:w-auto" onClick={() => haptic("success")}>
                    <Link to="/auth">Sign in to join <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                ) : state.status === "not_member" || state.status === "cancelled" ? (
                  <Button size="lg" className="h-14 w-full justify-center rounded-full gradient-warm px-7 text-base font-semibold shadow-warm sm:w-auto" onClick={joinCarePlus} disabled={carePlus.actionLoading}>
                    {carePlus.actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
                    Join for {formatZAR(carePlus.plan.priceZar)}/month
                  </Button>
                ) : state.status === "pending_payment" ? (
                  <Button asChild size="lg" className="h-14 w-full justify-center rounded-full gradient-warm px-7 text-base font-semibold shadow-warm sm:w-auto">
                    <a href={state.checkout_url}>Complete setup <ArrowRight className="ml-1 h-4 w-4" /></a>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="h-14 w-full justify-center rounded-full gradient-warm px-7 text-base font-semibold shadow-warm sm:w-auto">
                    <Link to="/app">Book with Care+ <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                )}
                <Button asChild size="lg" variant="outline" className="h-14 w-full justify-center rounded-full px-7 text-base sm:w-auto" onClick={() => haptic("selection")}>
                  <a href="#included">See benefits</a>
                </Button>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                Signed-in member panels come from your live Supabase account data.
              </p>
            </div>

            {carePlus.loading ? (
              <Card className="grid min-h-80 place-items-center rounded-3xl p-8 shadow-card">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </Card>
            ) : (
              <CarePlusStatePanel carePlus={carePlus} zootCred={zootCred} />
            )}
          </div>
        </section>

        <section id="included" className="border-y border-border bg-secondary/35 py-20 md:py-28">
          <div className="container">
            <div className="mb-12 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">What&apos;s included</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">The {formatZAR(carePlus.plan.priceZar)}/month reliability layer.</h2>
              <p className="mt-4 text-muted-foreground"><CarePlusMark /> gives practical continuity and emotional calm without pretending support, refunds or replacement decisions are automatic.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {carePlusBenefits.map((benefit) => <CarePlusBenefitCard key={benefit.id} benefit={benefit} />)}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container">
            <div className="mb-12 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">Value pillars</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Remembered, protected, ready.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <Card key={pillar.title} className="rounded-3xl border-border/70 bg-card p-6 shadow-card">
                    <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-2xl font-bold">{pillar.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-[#faf4e8] py-20 dark:bg-secondary/30 md:py-28">
          <div className="container">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">Compare</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Standard Zoot vs <CarePlusMark /></h2>
              </div>
              <p className="max-w-md text-sm text-muted-foreground">Care+ adds continuity, priority handling and ledger-backed rewards to ordinary cleaning workflows.</p>
            </div>
            <CarePlusComparisonTable />
          </div>
        </section>

        {state.status === "active" && (
          <section className="py-20 md:py-28">
            <div className="container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">Smart reminders</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"><CarePlusMark /> follows your real booking rhythm.</h2>
                <p className="mt-4 text-muted-foreground">These prompts are based on your last completed booking, not generic example data.</p>
              </div>
              <div className="space-y-3">
                {carePlus.reminders.map((reminder) => (
                  <Card key={reminder.id} className="rounded-3xl border-border bg-card p-4 shadow-card">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{reminder.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Last completed booking: {formatDate(carePlus.lastBookingAt)}</p>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="rounded-full">
                        <Link to={reminder.intent === "default_addon" ? "/app/profile" : "/app"}>{reminder.cta}</Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="bg-[#faf4e8] py-20 dark:bg-background md:py-28">
          <div className="container grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="rounded-[2rem] gradient-sage p-6 text-primary-foreground shadow-warm sm:p-8 md:p-12">
              <Sparkles className="mb-5 h-8 w-8" />
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Home care should not reset every time.</h2>
              <p className="mt-4 max-w-2xl text-base opacity-90 sm:text-lg">Care+ keeps the useful context in the app: household notes, favourite people, ZootCred, property profiles and support handoff history.</p>
              <Button asChild size="lg" variant="secondary" className="mt-8 h-14 w-full justify-center rounded-full px-7 text-base font-semibold sm:w-auto" onClick={() => haptic("success")}>
                <Link to={state.status === "unauthenticated" ? "/auth" : "/app/plans"}>{state.status === "active" ? "Manage Care+" : "Start Care+"}</Link>
              </Button>
            </div>
            <div className="grid gap-5">
              <CarePlusSupportPromise />
              <div className="grid gap-5 sm:grid-cols-2">
                {carePlusMoatBenefits.slice(0, 2).map((benefit) => <CarePlusBenefitCard key={benefit.id} benefit={benefit} />)}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

type CarePlusHook = ReturnType<typeof useCarePlus>;
type ZootCredHook = ReturnType<typeof useZootCred>;

const CarePlusStatePanel = ({ carePlus, zootCred }: { carePlus: CarePlusHook; zootCred: ZootCredHook }) => {
  const state = carePlus.state;

  if (state.status === "unauthenticated") {
    return (
      <Card className="rounded-3xl border-border/70 bg-card/90 p-6 shadow-card">
        <Crown className="mb-5 h-8 w-8 text-primary" />
        <h2 className="font-display text-3xl font-bold">Sign in to see your Care+ status</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Membership status, ZootCred and property reminders are private account data. Sign in before joining or managing Care+.</p>
        <Button asChild className="mt-6 rounded-full gradient-warm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </Card>
    );
  }

  if (state.status === "not_member") {
    return (
      <Card className="rounded-3xl border-border/70 bg-card/90 p-6 shadow-card">
        <p className="text-sm font-semibold text-sage-deep">Not a member yet</p>
        <h2 className="mt-2 font-display text-4xl font-bold">{formatZAR(state.plan.priceZar)}/month</h2>
        <p className="mt-3 text-sm text-muted-foreground">Join to unlock priority support, Home Memory, favourite Zooter continuity and R30 monthly add-on credit.</p>
        <ul className="mt-5 space-y-2 text-sm">
          {state.plan.benefits.slice(0, 6).map((benefit) => (
            <li key={benefit} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-sage-deep" />{benefit}</li>
          ))}
        </ul>
      </Card>
    );
  }

  if (state.status === "pending_payment") {
    return (
      <Card className="rounded-3xl border-primary/30 bg-primary/10 p-6 shadow-card">
        <CalendarClock className="mb-5 h-8 w-8 text-primary" />
        <h2 className="font-display text-3xl font-bold">Complete your Care+ setup</h2>
        <p className="mt-3 text-sm text-muted-foreground">Your membership request exists, but benefits activate only after payment is confirmed by the backend payment flow.</p>
        <Button asChild className="mt-6 rounded-full gradient-warm">
          <a href={state.checkout_url}>Open payment link</a>
        </Button>
      </Card>
    );
  }

  if (state.status === "past_due") {
    return (
      <Card className="rounded-3xl border-destructive/25 bg-destructive/10 p-6 shadow-card">
        <ShieldCheck className="mb-5 h-8 w-8 text-destructive" />
        <h2 className="font-display text-3xl font-bold">Payment update needed</h2>
        <p className="mt-3 text-sm text-muted-foreground">Care+ is past due. Update payment to restore priority handling and monthly add-on credit.</p>
        <p className="mt-4 text-sm font-semibold">Last renewal date: {formatDate(state.membership.renewsAt)}</p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/app/support">Contact support</Link>
        </Button>
      </Card>
    );
  }

  if (state.status === "cancelled") {
    return (
      <Card className="rounded-3xl border-border/70 bg-card/90 p-6 shadow-card">
        <h2 className="font-display text-3xl font-bold">Care+ is cancelled</h2>
        <p className="mt-3 text-sm text-muted-foreground">Ended on {formatDate(state.cancelled_at)}. You can rejoin without reusing old membership placeholders.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      <Card className="rounded-3xl border-0 bg-foreground p-6 text-background shadow-warm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-background/70">Care<span className="text-primary-glow">+</span> active</p>
            <h2 className="font-display text-4xl font-bold">{formatZAR(state.membership.priceZar)}/month</h2>
          </div>
          <Crown className="h-10 w-10 shrink-0 text-accent" />
        </div>
        <div className="grid gap-3 text-center sm:grid-cols-3">
          <Metric label="Renews" value={formatDate(state.membership.renewsAt)} />
          <Metric label="ZootCred" value={zootCred.loading ? "..." : formatZAR(zootCred.availableBalance)} />
          <Metric label="Monthly credit" value={zootCred.loading ? "..." : formatZAR(zootCred.monthlyCredit)} />
        </div>
        <p className="mt-4 text-xs text-background/70">Monthly credit expiry: {formatDate(zootCred.monthlyCreditExpiresAt)}</p>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-3xl border-border/70 bg-card/90 p-5 shadow-card">
          <p className="text-sm font-semibold text-sage-deep">Favourite Zooter</p>
          {state.favourite ? (
            <>
              <h3 className="mt-2 font-display text-2xl font-bold">{state.favourite.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Rating {state.favourite.rating || "not rated yet"} - {state.favourite.preferredFor}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {state.favourite.specialties.map((specialty) => <span key={specialty} className="rounded-full bg-muted px-3 py-1 text-xs">{specialty}</span>)}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Save a Zooter from My Zooters to make repeat bookings easier.</p>
          )}
        </Card>

        <Card className="rounded-3xl border-border/70 bg-card/90 p-5 shadow-card">
          <p className="text-sm font-semibold text-sage-deep">Saved properties</p>
          <h3 className="mt-2 font-display text-2xl font-bold">{carePlus.properties.length}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Property profiles are loaded from your account.</p>
        </Card>
      </div>

      {carePlus.properties.length > 0 && (
        <div className="grid gap-3">
          {carePlus.properties.map((property) => (
            <Card key={property.id} className="rounded-3xl border-border/70 bg-card/90 p-5 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-display text-xl font-bold">{property.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{property.type.replace(/_/g, " ")} - {property.defaultService}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{property.turnoverInstructions}</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-background/10 p-3">
    <p className="font-display text-xl font-bold">{value}</p>
    <p className="text-xs text-background/70">{label}</p>
  </div>
);

export default CarePlus;
