import { Link } from "react-router-dom";
import {
  BedDouble,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  Crown,
  Heart,
  Home,
  LifeBuoy,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Star,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  comparisonRows,
  mockCarePlusMembership,
  mockFavouriteZooter,
  mockHomeMemoryProfile,
  mockPropertyProfiles,
  mockZootCredBalance,
  smartReminders,
} from "@/data/care-plus";
import type { CarePlusBenefit, PropertyProfile, SmartReminder } from "@/types/care-plus";
import { haptic } from "@/lib/haptics";

const benefitIcons = {
  "home-memory": Home,
  "favourite-zooter": Heart,
  "priority-booking": CalendarClock,
  "priority-replacement": ShieldCheck,
  "one-tap-rebook": Repeat2,
  "zootcred-boost": WalletCards,
  "monthly-credit": Crown,
  "smart-reminders": Sparkles,
  "home-readiness-score": CheckCircle2,
  "seasonal-reset": Star,
  "photo-proof": Camera,
  "guest-ready-mode": BedDouble,
} as const;

const priorityLabel = (priority: SmartReminder["priority"]) => {
  if (priority === "high") return "Timely";
  if (priority === "normal") return "Helpful";
  return "Quiet";
};

export const CarePlusBenefitCard = ({ benefit }: { benefit: CarePlusBenefit }) => {
  const Icon = benefitIcons[benefit.id as keyof typeof benefitIcons] ?? Sparkles;

  return (
    <Card className="group p-5 rounded-3xl border-border/70 bg-card/85 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-warm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-xl font-bold mb-2">{benefit.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground mb-4">{benefit.summary}</p>
      <p className="text-xs font-semibold text-sage-deep">{benefit.memberProof}</p>
    </Card>
  );
};

export const CarePlusComparisonTable = () => (
  <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 bg-muted/60 px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground max-md:hidden">
      <span>Feature</span>
      <span>Standard Zoot</span>
      <span>Care+</span>
    </div>
    <div className="divide-y divide-border">
      {comparisonRows.map((row) => (
        <div key={row.feature} className="grid grid-cols-[1fr_1fr_1fr] gap-0 px-4 py-4 text-sm max-md:grid-cols-1 max-md:gap-2">
          <p className="font-semibold text-foreground">{row.feature}</p>
          <p className="text-muted-foreground max-md:rounded-2xl max-md:bg-muted/40 max-md:p-3">{row.standard}</p>
          <p className="font-semibold text-sage-deep max-md:rounded-2xl max-md:bg-sage/15 max-md:p-3">{row.carePlus}</p>
        </div>
      ))}
    </div>
  </div>
);

export const ZootCredPreview = () => (
  <Card className="p-6 rounded-3xl bg-card shadow-card border-border/70">
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <p className="text-sm font-semibold text-sage-deep">ZootCred preview</p>
        <h3 className="font-display text-3xl font-bold mt-1">1.5x loyalty value</h3>
      </div>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <WalletCards className="h-6 w-6" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3 text-center">
      <div className="rounded-2xl bg-muted/50 p-3">
        <p className="font-display text-2xl font-bold">R{mockZootCredBalance.availableZar}</p>
        <p className="text-xs text-muted-foreground">Available</p>
      </div>
      <div className="rounded-2xl bg-muted/50 p-3">
        <p className="font-display text-2xl font-bold">R{mockZootCredBalance.pendingZar}</p>
        <p className="text-xs text-muted-foreground">Pending</p>
      </div>
      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
        <p className="font-display text-2xl font-bold">R{mockZootCredBalance.projectedNextBookingZar}</p>
        <p className="text-xs">Next booking</p>
      </div>
    </div>
    <p className="mt-4 text-sm text-muted-foreground">Care+ members also receive a R{mockZootCredBalance.monthlyAddOnCreditZar} monthly add-on credit that expires monthly and can only be used with a completed booking.</p>
  </Card>
);

export const HomeMemoryPreview = () => (
  <Card className="p-6 rounded-3xl bg-card shadow-card border-border/70">
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <p className="text-sm font-semibold text-sage-deep">Home Memory</p>
        <h3 className="font-display text-3xl font-bold mt-1">Your home remembered</h3>
      </div>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sage/15 text-sage-deep">
        <Home className="h-6 w-6" />
      </div>
    </div>
    <div className="grid sm:grid-cols-2 gap-3">
      {[
        ["Pet notes", mockHomeMemoryProfile.petNotes.join(", ")],
        ["Room priorities", mockHomeMemoryProfile.roomPriorities.join(", ")],
        ["Fragile areas", mockHomeMemoryProfile.fragileAreas.join(", ")],
        ["Favourite add-ons", mockHomeMemoryProfile.favouriteAddOns.join(", ")],
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm font-medium">{value}</p>
        </div>
      ))}
    </div>
    <p className="mt-4 text-sm text-muted-foreground">Access notes and sensitive instructions should stay inside the authenticated app, not in SMS or push notifications.</p>
  </Card>
);

export const FavouriteZooterPreview = () => (
  <Card className="p-6 rounded-3xl bg-card shadow-card border-border/70">
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <p className="text-sm font-semibold text-sage-deep">Favourite Zooter</p>
        <h3 className="font-display text-3xl font-bold mt-1">{mockFavouriteZooter.name} knows the rhythm</h3>
      </div>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Heart className="h-6 w-6" />
      </div>
    </div>
    <div className="rounded-3xl bg-gradient-to-br from-accent-soft to-background p-5 border border-accent/20">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="font-display text-2xl font-bold">{mockFavouriteZooter.name}</p>
          <p className="text-sm text-muted-foreground">Rating {mockFavouriteZooter.rating} - {mockFavouriteZooter.preferredFor}</p>
        </div>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-bold text-sage-deep">Preferred</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {mockFavouriteZooter.specialties.map((specialty) => (
          <span key={specialty} className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">{specialty}</span>
        ))}
      </div>
      <Button asChild className="rounded-full gradient-warm" onClick={() => haptic("impact")}>
        <Link to="/app">Book {mockFavouriteZooter.name} again</Link>
      </Button>
    </div>
  </Card>
);

export const SmartReminderList = ({ reminders = smartReminders }: { reminders?: SmartReminder[] }) => (
  <div className="space-y-3">
    {reminders.map((reminder) => (
      <div key={reminder.id} className="rounded-3xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{reminder.message}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{priorityLabel(reminder.priority)} prompt</p>
          </div>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => haptic("selection")}>
            {reminder.cta}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    ))}
  </div>
);

export const PropertyProfilePreview = ({ profile }: { profile: PropertyProfile }) => (
  <Card className="p-5 rounded-3xl bg-card border-border/70 shadow-card">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-display text-xl font-bold">{profile.name}</p>
        <p className="text-sm text-muted-foreground capitalize">{profile.type.replace(/_/g, " ")} - {profile.suburb}</p>
      </div>
      <span className="rounded-full bg-sage/15 px-3 py-1 text-xs font-bold text-sage-deep">{profile.readinessScore}% ready</span>
    </div>
    <Progress value={profile.readinessScore} className="my-4" />
    <p className="text-sm text-muted-foreground">{profile.turnoverInstructions ?? profile.nextRecommendedBooking}</p>
  </Card>
);

export const CarePlusStatusPanel = () => (
  <Card className="p-6 rounded-3xl bg-foreground text-background shadow-warm border-0">
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <p className="text-sm text-background/70">Care+ active</p>
        <h3 className="font-display text-4xl font-bold">R{mockCarePlusMembership.priceZar}/month</h3>
      </div>
      <Crown className="h-10 w-10 text-accent" />
    </div>
    <div className="grid grid-cols-3 gap-3 text-center">
      <div className="rounded-2xl bg-background/10 p-3">
        <p className="font-display text-2xl font-bold">{mockCarePlusMembership.homeReadinessScore}%</p>
        <p className="text-xs text-background/70">Readiness</p>
      </div>
      <div className="rounded-2xl bg-background/10 p-3">
        <p className="font-display text-2xl font-bold">R{mockCarePlusMembership.addOnCreditZar}</p>
        <p className="text-xs text-background/70">Add-on credit</p>
      </div>
      <div className="rounded-2xl bg-background/10 p-3">
        <p className="font-display text-2xl font-bold">{mockCarePlusMembership.zootCredMultiplier}x</p>
        <p className="text-xs text-background/70">ZootCred</p>
      </div>
    </div>
  </Card>
);

export const CarePlusSupportPromise = () => (
  <Card className="p-6 rounded-3xl bg-card border-border/70 shadow-card">
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-4">
      <LifeBuoy className="h-6 w-6" />
    </div>
    <h3 className="font-display text-3xl font-bold mb-3">Priority support when plans need attention</h3>
    <p className="text-sm leading-relaxed text-muted-foreground">Care+ members receive faster support handling for booking issues, cancellations, service concerns and replacement matching. Replacement is prioritised, not guaranteed.</p>
  </Card>
);

export const defaultPropertyPreviews = mockPropertyProfiles;
