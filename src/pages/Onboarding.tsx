import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Zoey, type Pose } from "@/components/zoot/mascot/Zoey";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import {
  CADENCES,
  CUSTOMER_TYPES,
  HOME_SIZES,
  clearDraft,
  emptyAnswers,
  readDraft,
  stepsFor,
  writeDraft,
  type CustomerType,
  type OnboardingAnswers,
} from "@/lib/onboarding";
import { ArrowLeft, Bell, Building2, Home, KeyRound, Check } from "lucide-react";

/**
 * Onboarding, curated by customer type (master brief §5.1b).
 *
 * One question per screen, Headspace-style, with Zoey changing pose between steps so
 * she reads as a companion moving through the flow rather than a sticker on each card.
 *
 * The step list is derived from the chosen type, not hardcoded — an Airbnb host is asked
 * about listings and linen, an office about headcount and billing, and neither is ever
 * shown "how many bedrooms?".
 */

type Step = {
  key: string;
  pose: Pose;
  /** Required steps show no Skip. Linen is required at booking time (§4.6), so
      skipping it here would just move the question into the booking flow. */
  required?: boolean;
  render: () => JSX.Element;
};

/** Big tappable answer. The whole row is the target, not a radio dot beside it. */
function Choice({
  label,
  hint,
  selected,
  onSelect,
  icon: Icon,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
  icon?: typeof Home;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40",
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
        aria-hidden="true"
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(() => readDraft());
  const [index, setIndex] = useState(0);

  const patch = (next: Partial<OnboardingAnswers>) => {
    haptic("selection");
    setAnswers((prev) => {
      const merged = { ...(prev ?? {}), ...next } as OnboardingAnswers;
      writeDraft(merged);
      return merged;
    });
  };

  const chooseType = (type: CustomerType) => {
    haptic("impact");
    const fresh = emptyAnswers(type);
    setAnswers(fresh);
    writeDraft(fresh);
    setIndex(1);
  };

  const steps: Step[] = useMemo(() => {
    if (!answers) return [];
    const list: Step[] = [];

    if (answers.type === "household") {
      list.push({
        key: "size",
        pose: "point",
        render: () => (
          <Question
            title="How big is your place?"
            blurb="This sets the hours we book by default. You can always change it."
          >
            {HOME_SIZES.map((s) => (
              <Choice
                key={s.id}
                label={s.label}
                hint={`${s.beds} · about ${s.defaultHours} hours`}
                icon={Home}
                selected={answers.size === s.id}
                onSelect={() => patch({ size: s.id } as Partial<OnboardingAnswers>)}
              />
            ))}
          </Question>
        ),
      });
    }

    if (answers.type === "airbnb") {
      list.push({
        key: "listings",
        pose: "point",
        render: () => (
          <Question title="How many places do you turn over?" blurb="So we can line up the right cover.">
            {[1, 2, 3].map((n) => (
              <Choice
                key={n}
                label={n === 3 ? "3 or more" : n === 1 ? "Just one" : `${n} places`}
                icon={KeyRound}
                selected={answers.listings === n}
                onSelect={() => patch({ listings: n } as Partial<OnboardingAnswers>)}
              />
            ))}
          </Question>
        ),
      });
    }

    if (answers.type === "airbnb") {
      // Required single-select at booking time (master brief §4.6). Asked here so the
      // first booking is one confirmation rather than a fresh form.
      list.push({
        key: "linen",
        pose: "think",
        required: true,
        render: () => (
          <Question title="What should we do about linen?" blurb="Pick one. You can change it per booking later.">
            {[
              { id: "replace-no-wash", label: "Replace it, don't wash", hint: "You handle the laundry" },
              { id: "wash-hang-dry", label: "Wash and hang to dry", hint: "Left drying when we leave" },
              { id: "wash-dry-repack", label: "Wash, dry and repack on-site", hint: "Needs a 5-hour minimum" },
              { id: "no-bedding", label: "Leave the bedding alone", hint: "We'll skip it entirely" },
            ].map((o) => (
              <Choice
                key={o.id}
                label={o.label}
                hint={o.hint}
                selected={answers.linenHandling === o.id}
                onSelect={() => patch({ linenHandling: o.id } as Partial<OnboardingAnswers>)}
              />
            ))}
          </Question>
        ),
      });
    }

    if (answers.type === "office") {
      list.push({
        key: "headcount",
        pose: "point",
        render: () => (
          <Question title="How many people work there?" blurb="Offices are booked by hours, not by rooms.">
            {[
              { n: 10, label: "Up to 10" },
              { n: 30, label: "11 to 30" },
              { n: 100, label: "More than 30" },
            ].map((o) => (
              <Choice
                key={o.n}
                label={o.label}
                icon={Building2}
                selected={answers.headcount === o.n}
                onSelect={() => patch({ headcount: o.n } as Partial<OnboardingAnswers>)}
              />
            ))}
          </Question>
        ),
      });
    }

    list.push({
      key: "cadence",
      pose: "idle",
      render: () => (
        <Question
          title="How often should we come?"
          blurb="Booking the same slot every week is the cheapest way to keep on top of it."
        >
          {CADENCES.map((c) => (
            <Choice
              key={c.id}
              label={c.label}
              hint={c.hint}
              selected={answers.cadence === c.id}
              onSelect={() => patch({ cadence: c.id } as Partial<OnboardingAnswers>)}
            />
          ))}
        </Question>
      ),
    });

    list.push({
      key: "notifications",
      pose: "wave",
      render: () => (
        <Question
          title="Know the moment they're on their way."
          blurb="We'll tell you when your Xooter sets off, arrives and finishes — with photos. Nothing else, ever."
        >
          <Button
            size="lg"
            className="h-12 w-full rounded-full"
            onClick={() => {
              haptic("success");
              patch({ notificationsPrimed: true } as Partial<OnboardingAnswers>);
              finish();
            }}
          >
            <Bell className="size-4" aria-hidden="true" />
            Turn on notifications
          </Button>
          {/* A decline that feels trapped poisons the rest of onboarding, so this is
              full-contrast text at a real tap size — never greyed out. */}
          <button
            type="button"
            onClick={finish}
            className="mx-auto mr-16 rounded-full px-4 py-3 text-sm font-semibold text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Not now
          </button>
        </Question>
      ),
    });

    return list;
    // `patch` and `finish` are stable for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  function finish() {
    // The draft stays until the first booking is confirmed, so a user who drops out
    // here and comes back does not answer everything twice.
    navigate("/app");
  }

  const labels = answers ? stepsFor(answers.type) : ["About you"];
  const total = labels.length;
  const current = Math.min(index, total - 1);
  const step = answers ? steps[index - 1] : undefined;

  const back = () => {
    haptic("selection");
    if (index === 0) return navigate("/welcome");
    if (index === 1) {
      clearDraft();
      setAnswers(null);
    }
    setIndex((i) => Math.max(0, i - 1));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <SEO title="Setting up your Xoot" description="A few quick questions so booking is one tap." canonical="/onboarding" noIndex />

      <header className="flex items-center gap-3 px-5 pt-4">
        <button
          type="button"
          onClick={back}
          aria-label="Go back"
          className="grid size-9 place-items-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <div
          className="flex flex-1 gap-1"
          role="progressbar"
          aria-valuenow={current + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Step ${current + 1} of ${total}: ${labels[current]}`}
        >
          {labels.map((l, i) => (
            <span key={l} className={cn("h-[3px] flex-1 rounded-full", i <= current ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
      </header>

      <div className="flex items-center justify-center py-5">
        <Zoey pose={step?.pose ?? "wave"} size={104} />
      </div>

      <div className="flex flex-1 flex-col rounded-t-[1.75rem] bg-card px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {answers && step ? (
          step.render()
        ) : (
          <Question title="What are we looking after?" blurb="We'll shape the rest around your answer.">
            {CUSTOMER_TYPES.map((t) => (
              <Choice
                key={t.id}
                label={t.label}
                hint={t.blurb}
                icon={t.id === "office" ? Building2 : t.id === "airbnb" ? KeyRound : Home}
                selected={answers?.type === t.id}
                onSelect={() => chooseType(t.id)}
              />
            ))}
          </Question>
        )}

        {answers && step && step.key !== "notifications" ? (
          // pb keeps the last control clear of the floating concierge button.
          <div className="mt-auto flex flex-col gap-2 pt-6 pb-1">
            <Button
              size="lg"
              className="h-12 w-full rounded-full"
              onClick={() => {
                haptic("impact");
                setIndex((i) => i + 1);
              }}
            >
              Continue
            </Button>
            {/* Every non-essential step is skippable; secondary detail can be collected
                later in-app rather than blocking the first booking. Required steps get
                no Skip — offering one would only defer the question to booking. */}
            {step.required ? null : (
              <button
                type="button"
                onClick={() => {
                  haptic("selection");
                  setIndex((i) => i + 1);
                }}
                className="mx-auto mr-16 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Skip for now
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Question({ title, blurb, children }: { title: string; blurb?: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="rise-in font-display text-[1.55rem] font-bold leading-[1.15] tracking-tight text-balance">{title}</h1>
      {blurb ? <p className="rise-in mt-2 text-[0.8rem] leading-relaxed text-muted-foreground [animation-delay:55ms]">{blurb}</p> : null}
      <div className="rise-in mt-5 flex flex-col gap-2 [animation-delay:110ms]">{children}</div>
    </>
  );
}
