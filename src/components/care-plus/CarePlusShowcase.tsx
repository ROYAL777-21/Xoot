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
import { CarePlusMark } from "@/components/care-plus/CarePlusMark";
import {
  comparisonRows,
  smartReminders,
} from "@/data/care-plus";
import type { CarePlusBenefit, PropertyProfile, SmartReminder } from "@/types/care-plus";
import { haptic } from "@/lib/haptics";

const benefitIcons = {
  "home-memory": Home,
  "favourite-xooter": Heart,
  "priority-booking": CalendarClock,
  "priority-replacement": ShieldCheck,
  "one-tap-rebook": Repeat2,
  "xootcred-boost": WalletCards,
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
    <Card className="group rounded-3xl border-border/70 bg-card/85 p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-warm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-2 font-display text-xl font-bold">{benefit.title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{benefit.summary}</p>
      <p className="text-xs font-semibold text-sage-deep">{benefit.memberProof}</p>
    </Card>
  );
};

export const CarePlusComparisonTable = () => (
  <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 bg-muted/60 px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground max-md:hidden">
      <span>Feature</span>
      <span>Standard Xoot</span>
      <span><CarePlusMark /></span>
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

export const SmartReminderList = ({ reminders = smartReminders }: { reminders?: SmartReminder[] }) => (
  <div className="space-y-3">
    {reminders.map((reminder) => (
      <div key={reminder.id} className="rounded-3xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{reminder.message}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{priorityLabel(reminder.priority)} prompt</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-center rounded-full sm:w-auto" onClick={() => haptic("selection")}>
            {reminder.cta}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    ))}
  </div>
);

export const PropertyProfileCard = ({ profile }: { profile: PropertyProfile }) => (
  <Card className="rounded-3xl border-border/70 bg-card p-5 shadow-card">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="font-display text-xl font-bold">{profile.name}</p>
        <p className="text-sm text-muted-foreground capitalize">{profile.type.replace(/_/g, " ")} - {profile.suburb}</p>
      </div>
      <span className="w-fit rounded-full bg-sage/15 px-3 py-1 text-xs font-bold text-sage-deep">{profile.readinessScore}% ready</span>
    </div>
    <Progress value={profile.readinessScore} className="my-4" />
    <p className="text-sm text-muted-foreground">{profile.turnoverInstructions ?? profile.nextRecommendedBooking}</p>
  </Card>
);

export const CarePlusSupportPromise = () => (
  <Card className="rounded-3xl border-border/70 bg-card p-5 shadow-card sm:p-6">
    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
      <LifeBuoy className="h-6 w-6" />
    </div>
    <h3 className="mb-3 font-display text-2xl font-bold sm:text-3xl">Priority support when plans need attention</h3>
    <p className="text-sm leading-relaxed text-muted-foreground"><CarePlusMark /> members receive faster support handling for booking issues, cancellations, service concerns and replacement matching. Replacement is prioritised, not guaranteed.</p>
  </Card>
);
