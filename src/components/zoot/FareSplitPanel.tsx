import { useMemo, useState } from "react";
import { Loader2, Plus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatZARDecimal } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import {
  MAX_SPLIT_PARTIES,
  RATIO_PRESETS,
  organiserShareCents,
  splitByRatio,
  splitEvenly,
  validateSplit,
  type FareShare,
} from "@/lib/fare-split";

/**
 * Split this booking's cost with other people.
 *
 * ── What it promises, and what it does not ──────────────────────────────────────
 * It records who owes what and emails each person their share. **It does not charge anyone**,
 * because no payment provider is connected — `create-booking` still writes
 * `provider_required: "Ozow/Stitch credentials not connected"`.
 *
 * The panel says so on screen rather than leaving it implied. A split that looks settled while
 * nothing can be collected is discovered by the organiser at the worst possible moment, and the
 * cost of the honest sentence now is far lower than the cost of that conversation later.
 *
 * ── Why the organiser's own share is shown, not typed ───────────────────────────
 * The shares must sum to exactly the total. If the organiser typed their own share too, five
 * numbers would have to agree with a sixth and the arithmetic would fail in a form — leaving
 * someone to work out which field to change. Here the remainder is always theirs, so it always
 * sums, and `organiserShareCents` returns null rather than a negative when the others over-claim.
 */

type Props = {
  bookingId: string;
  /** The booking total in rands, as stored on `bookings.price`. */
  totalRands: number;
  /** Hidden once the booking is being paid — a split then has nothing to divide. */
  paymentStatus?: string | null;
};

export const FareSplitPanel = ({ bookingId, totalRands, paymentStatus }: Props) => {
  const totalCents = Math.round(totalRands * 100);
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>([""]);
  const [amounts, setAmounts] = useState<(number | null)[]>([null]);
  const [saving, setSaving] = useState(false);

  // Even split by default: it is what most people want and it is guaranteed to sum. A typed
  // amount overrides it for that person only.
  const evenShares = useMemo(() => splitEvenly(totalCents, emails.length + 1), [totalCents, emails.length]);
  const resolvedAmounts = amounts.map((amount, index) => amount ?? evenShares[index] ?? 0);
  const organiserCents = organiserShareCents(totalCents, resolvedAmounts);

  const shares: FareShare[] = emails.map((email, index) => ({
    email,
    amountCents: resolvedAmounts[index] ?? 0,
  }));

  /**
   * The problem to show, or null when the split is valid.
   *
   * A plain `string | null` rather than the `SplitValidation` union, because the component only
   * ever needs the message — carrying the union here means narrowing it again at every use, and
   * the first version of this file failed to compile for exactly that reason.
   */
  const validationError = useMemo<string | null>(() => {
    if (organiserCents === null) return "Those shares add up to more than the booking.";
    // The organiser is one of the parties, so their share is validated with the rest — the same
    // check the Edge Function runs, which is why a form that passes here is not rejected there.
    const result = validateSplit(
      [...shares, { email: "organiser@self", amountCents: organiserCents }],
      totalCents,
    );
    return result.ok ? null : result.reason;
  }, [shares, organiserCents, totalCents]);

  if (paymentStatus && paymentStatus !== "pending") return null;

  const addPerson = () => {
    if (emails.length + 1 >= MAX_SPLIT_PARTIES) return;
    setEmails((current) => [...current, ""]);
    setAmounts((current) => [...current, null]);
  };

  const removePerson = (index: number) => {
    setEmails((current) => current.filter((_, i) => i !== index));
    setAmounts((current) => current.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (validationError) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("split-booking-fare", {
        body: { action: "create", bookingId, shares },
      });
      if (error) throw error;
      haptic("success");
      // Deliberately not "paid" or "settled". The server returns `collectionConfigured: false`
      // and the copy follows it rather than the hopeful reading.
      toast.success(
        (data as { collectionConfigured?: boolean } | null)?.collectionConfigured
          ? "Split sent. Each person can now pay their share."
          : "Split saved and everyone has been emailed their share. Nobody is charged yet — card payments are not switched on.",
      );
      setOpen(false);
    } catch (err) {
      console.warn("fare split failed", err);
      toast.error("Could not save that split. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Card className="rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-base font-bold">Split this booking</p>
              <p className="text-xs text-muted-foreground">
                Share the cost with housemates or family
              </p>
            </div>
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => { haptic("selection"); setOpen(true); }}>
            Split
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-base font-bold">Split {formatZARDecimal(totalRands)}</p>
        <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setOpen(false)} aria-label="Cancel split">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {emails.map((email, index) => (
          <div key={index} className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(event) =>
                setEmails((current) => current.map((value, i) => (i === index ? event.target.value : value)))
              }
              placeholder="their@email.com"
              className="native-input rounded-full"
              aria-label={`Email for person ${index + 1}`}
            />
            <Input
              type="number"
              inputMode="decimal"
              value={resolvedAmounts[index] != null ? (resolvedAmounts[index] / 100).toFixed(2) : ""}
              onChange={(event) => {
                const rands = Number(event.target.value);
                setAmounts((current) =>
                  current.map((value, i) =>
                    i === index ? (Number.isFinite(rands) ? Math.round(rands * 100) : null) : value,
                  ),
                );
              }}
              className="native-input w-28 rounded-full"
              aria-label={`Amount for person ${index + 1}`}
            />
            {emails.length > 1 && (
              <Button size="icon" variant="ghost" className="rounded-full shrink-0" onClick={() => removePerson(index)} aria-label={`Remove person ${index + 1}`}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/*
        Ratio chips, only when the party is exactly two.

        A "ratio" of three people is not a ratio — it is three numbers, and expressing it as one
        percentage is how a UI ends up describing something it is not doing. Three or more keeps
        the amount fields above.

        Presets rather than a slider because the value is money: a drag control cannot land on
        R148.00, and the number someone finally lands on is what the other person is invoiced.
      */}
      {emails.length === 1 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">You pay</span>
          {RATIO_PRESETS.map((percent) => {
            const [organiser, other] = splitByRatio(totalCents, percent);
            const selected = organiserCents === organiser && resolvedAmounts[0] === other;
            return (
              <button
                key={percent}
                type="button"
                onClick={() => {
                  haptic("selection");
                  // Set the *other* person's share; the organiser's is always the remainder, so
                  // the split cannot stop summing however the chips are tapped.
                  setAmounts([other]);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-card"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={selected}
              >
                {percent}%
              </button>
            );
          })}
        </div>
      )}

      {emails.length + 1 < MAX_SPLIT_PARTIES && (
        <Button variant="ghost" size="sm" className="mt-2 rounded-full" onClick={addPerson}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add someone
        </Button>
      )}

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Your share</span>
        <span className="font-bold">
          {organiserCents === null ? "—" : formatZARDecimal(organiserCents / 100)}
        </span>
      </div>

      {validationError && (
        <p className="mt-2 text-xs font-semibold text-destructive">{validationError}</p>
      )}

      {/* The honest line. No provider is connected, so this records who owes what and nothing
          more — and saying it here costs far less than the organiser discovering it later. */}
      <p className="mt-3 text-xs text-muted-foreground">
        Everyone gets an email with their share. Nobody is charged yet — card payments are not
        switched on, so shares are recorded and settled with you directly for now.
      </p>

      <Button
        className="mt-4 w-full rounded-full"
        disabled={Boolean(validationError) || saving}
        onClick={submit}
      >
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Send the split
      </Button>
    </Card>
  );
};
