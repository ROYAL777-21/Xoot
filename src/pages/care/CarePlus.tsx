import { Link } from "react-router-dom";
import { ArrowRight, BedDouble, Building2, CheckCircle2, Crown, Home, ShieldCheck, Sparkles } from "lucide-react";
import { Navbar } from "@/components/zoot/Navbar";
import { Footer } from "@/components/zoot/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CarePlusMark } from "@/components/care-plus/CarePlusMark";
import {
  CarePlusBenefitCard,
  CarePlusComparisonTable,
  CarePlusStatusPanel,
  CarePlusSupportPromise,
  FavouriteZooterShowcase,
  HomeMemoryShowcase,
  PropertyProfileCard,
  SmartReminderList,
  ZootCredShowcase,
  defaultPropertyExamples,
} from "@/components/care-plus/CarePlusShowcase";
import { carePlusBenefits, carePlusMoatBenefits } from "@/data/care-plus";
import { haptic } from "@/lib/haptics";

const pillars = [
  {
    title: "Memory",
    body: "Care+ saves the details that make a clean feel personal: pets, parking, access, products, allergies, fragile areas and default add-ons.",
    icon: Home,
  },
  {
    title: "Continuity",
    body: "Favourite Zooter and one-tap rebook patterns help the same home rhythm carry from one booking to the next.",
    icon: CheckCircle2,
  },
  {
    title: "Priority",
    body: "Earlier access to high-demand slots, recurring schedules and support handling when plans need attention.",
    icon: Crown,
  },
  {
    title: "Protection",
    body: "Priority replacement support reduces cancellation anxiety without promising unsupported guarantees.",
    icon: ShieldCheck,
  },
];

const CarePlus = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="relative overflow-hidden bg-[#faf4e8] dark:bg-background">
          <div className="container grid gap-10 py-14 sm:py-16 lg:min-h-[760px] lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12 lg:py-24">
            <div className="animate-fade-up">
              <h1 className="font-display text-4xl font-bold leading-[1.04] tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
                <CarePlusMark /> keeps your home ready.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                Save your home preferences, rebook your favourite Zooter, earn boosted ZootCred, and get priority support when your home-care plans need attention.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="h-14 w-full justify-center rounded-full gradient-warm px-7 text-base font-semibold shadow-warm sm:w-auto" onClick={() => haptic("success")}>
                  <Link to="/app/plans">Join Care<span className="text-primary-glow">+</span> for R99/month <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 w-full justify-center rounded-full px-7 text-base sm:w-auto" onClick={() => haptic("selection")}>
                  <a href="#included">See what&apos;s included</a>
                </Button>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                A membership for homes that should not need constant managing.
              </p>
            </div>

            <div className="grid gap-5">
              <CarePlusStatusPanel />
              <div className="grid gap-5 md:grid-cols-2">
                <Card className="rounded-3xl border-border/70 bg-card/90 p-5 shadow-card">
                  <p className="text-sm font-semibold text-sage-deep">Smart reminder</p>
                  <p className="mt-2 text-lg font-semibold">Your home still has that after-clean calm. Nomsa has a nearby slot before the week gets busy.</p>
                  <Button asChild className="mt-5 w-full rounded-full sm:w-auto" onClick={() => haptic("impact")}>
                    <Link to="/app">Keep the rhythm</Link>
                  </Button>
                </Card>
                <Card className="rounded-3xl border-border/70 bg-card/90 p-5 shadow-card">
                  <p className="text-sm font-semibold text-sage-deep">Monthly value</p>
                  <p className="mt-2 text-lg font-semibold">R30 add-on credit plus 1.5x ZootCred on completed bookings.</p>
                  <p className="mt-4 text-xs text-muted-foreground">Credit expires monthly and cannot be withdrawn.</p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">The problem</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Home care should not reset every time you book.</h2>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Standard bookings can solve the clean but still leave the household manager repeating access notes, pet instructions, product preferences, room priorities and support context. <CarePlusMark /> turns Zoot into a reliability, memory, priority and loyalty layer for the home.
            </p>
          </div>
        </section>

        <section id="included" className="border-y border-border bg-secondary/35 py-20 md:py-28">
          <div className="container">
            <div className="mb-12 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">What&apos;s included</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">The R99/month no-brainer bundle.</h2>
              <p className="mt-4 text-muted-foreground"><CarePlusMark /> gives emotional security, practical convenience and tangible monthly value without cheapening the Zoot brand.</p>
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
              <p className="max-w-md text-sm text-muted-foreground">The mobile comparison stacks each row so members can scan the difference without side scrolling.</p>
            </div>
            <CarePlusComparisonTable />
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">Airbnb and landlords</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Guest-ready homes without constant chasing.</h2>
              <p className="mt-4 text-muted-foreground">Property profiles help hosts and landlords save turnover instructions, access notes, cleaning history, photo proof expectations and preferred recurring slots.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild className="w-full justify-center rounded-full gradient-warm sm:w-auto" onClick={() => haptic("impact")}>
                  <Link to="/app/properties/airbnb"><BedDouble className="mr-2 h-4 w-4" /> Open host dashboard</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-center rounded-full sm:w-auto" onClick={() => haptic("selection")}>
                  <Link to="/app/properties/office"><Building2 className="mr-2 h-4 w-4" /> Open office dashboard</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-4">
              {defaultPropertyExamples.map((profile) => <PropertyProfileCard key={profile.id} profile={profile} />)}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-secondary/35 py-20 md:py-28">
          <div className="container grid gap-6 lg:grid-cols-3">
            <ZootCredShowcase />
            <HomeMemoryShowcase />
            <FavouriteZooterShowcase />
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">Smart reminders</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"><CarePlusMark /> feels quietly intelligent.</h2>
              <p className="mt-4 text-muted-foreground">Prompts turn once-off usage into continuity: rebook a favourite Zooter, reserve a usual slot, prep for guests, or save a frequent add-on as a default.</p>
            </div>
            <SmartReminderList />
          </div>
        </section>

        <section className="bg-[#faf4e8] py-20 dark:bg-background md:py-28">
          <div className="container grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="rounded-[2rem] gradient-sage p-6 text-primary-foreground shadow-warm sm:p-8 md:p-12">
              <Sparkles className="mb-5 h-8 w-8" />
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Join Care<span className="text-primary-glow">+</span> for R99/month.</h2>
              <p className="mt-4 max-w-2xl text-base opacity-90 sm:text-lg">Home Memory, Favourite Zooter priority, priority replacement support, R30 monthly add-on credit, 1.5x ZootCred, smart reminders and priority support.</p>
              <Button asChild size="lg" variant="secondary" className="mt-8 h-14 w-full justify-center rounded-full px-7 text-base font-semibold sm:w-auto" onClick={() => haptic("success")}>
                <Link to="/app/plans">Join <CarePlusMark /> for R99/month</Link>
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

export default CarePlus;
