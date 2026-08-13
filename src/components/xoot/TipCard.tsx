import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { haptic } from "@/lib/haptics";
import { formatRand } from "@/lib/xoot-pricing";
import {
  MAX_TIP_CENTS,
  TIP_PRESETS_CENTS,
  canOfferTip,
  formatCustomTipInput,
  isWritableTip,
  parseCustomTipCents,
  tipAssurance,
} from "@/lib/tipping";
import { cn } from "@/lib/utils";

/**
 * Add a tip, at the post-service moment.
 *
 * Controlled: the amount lives with the review it is submitted alongside, so a customer
 * cannot end up having rated without tipping or tipped without rating because two
 * components disagreed about which had been sent.
 *
 * Nothing is selected by default and skipping costs one tap. See `lib/tipping.ts` for
 * why that, and why rand amounts rather than percentages.
 */
export function TipCard({
  value,
  onChange,
  disabled,
  className,
}: {
  /** Cents, or null for no tip. */
  value: number | null;
  onChange: (cents: number | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  // The typed text is separate from the amount so the field can hold "0" or a
  // half-typed number without that becoming a committed tip.
  const [typed, setTyped] = useState("");

  // Nothing behind it yet — see TIP_READINESS. Rendering a tip row that fails on
  // submit reads as a broken payment at precisely the wrong moment.
  if (!canOfferTip()) return null;

  const isPreset = value !== null && (TIP_PRESETS_CENTS as readonly number[]).includes(value);
  const capped = value === MAX_TIP_CENTS && typed !== "" && Number(typed) > MAX_TIP_CENTS / 100;

  const choosePreset = (cents: number) => {
    // Tapping the chosen amount again clears it — otherwise the only way out of a tip
    // is to select a different one, which is not a way out.
    const next = value === cents ? null : cents;
    haptic(next === null ? "selection" : "impact");
    onChange(next);
    setTyped("");
  };

  const typeCustom = (raw: string) => {
    const cents = parseCustomTipCents(raw);
    // Show back what was actually taken, so the cap is visible rather than silent.
    setTyped(cents === null ? raw.replace(/[^\d]/g, "").slice(0, 6) : formatCustomTipInput(cents));
    onChange(isWritableTip(cents) ? cents : null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">Add a tip</p>
        {value !== null && (
          <span className="font-display text-sm font-bold text-primary">{formatRand(value)}</span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{tipAssurance()}</p>

      <div className="grid grid-cols-4 gap-2">
        {TIP_PRESETS_CENTS.map((cents) => (
          <Button
            key={cents}
            type="button"
            variant={value === cents ? "default" : "outline"}
            disabled={disabled}
            aria-pressed={value === cents}
            className="h-11 rounded-full text-sm font-semibold"
            onClick={() => choosePreset(cents)}
          >
            {formatRand(cents)}
          </Button>
        ))}
        <Input
          inputMode="numeric"
          disabled={disabled}
          placeholder="Other"
          aria-label="Custom tip amount in rand"
          value={isPreset ? "" : typed}
          onChange={(e) => typeCustom(e.target.value)}
          className="h-11 rounded-full text-center"
        />
      </div>

      {capped && (
        <p role="status" className="text-xs text-muted-foreground">
          Tips are capped at {formatRand(MAX_TIP_CENTS)}.
        </p>
      )}
    </div>
  );
}
