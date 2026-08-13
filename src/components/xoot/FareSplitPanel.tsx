import { useMemo, useState } from "react";
import { Check, Copy, Loader2, Mail, MessageCircle, Plus, Users, X } from "lucide-react";
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
import {
  inviteUrlFor,
  mailtoInviteUrl,
  serviceLabelFor,
  whatsappInviteUrl,
} from "@/lib/fare-split-invite";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Split this booking's cost with other people.
 *
 * ── What it promises, and what it does not ──────────────────────────────────────
 * It records who owes what, and gives the organiser a link per person to send. **It does not
 * charge anyone**, because no payment provider is connected — `create-booking` still writes
 * `provider_required: "PayFast credentials not connected"`.
 *
 * The panel says so on screen rather than leaving it implied. A split that looks settled while
 * nothing can be collected is discovered by the organiser at the worst possible moment, and the
 * cost of the honest sentence now is far lower than the cost of that conversation later.
 *
 * ── ⚠️ CORRECTED 2026-08-12: this screen used to claim an email had been sent ────
 * The success toast read "Split saved and everyone has been emailed their share." Nobody was
 * emailed. `split-booking-fare` queues one `integration_outbox` row per invitee on the
 * `brevo_email` channel and **nothing drains that table** — there is no Brevo integration, no
 * sender, no scheduled job. So the organiser was told their housemates had been notified, and
 * would find out otherwise from the housemates.
 *
 * That sentence is the exact failure the rest of this component was written to prevent, and I put
 * it here. It is replaced with the thing that actually happens: the organiser gets a link per
 * person and sends it themselves, from WhatsApp or their own mail client. In South Africa that is
 * the channel people read, it needs no provider, and it is true at the moment the button is
 * tapped.
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
  /** Used to label the invitation. Never the address — see `fare-split-invite.ts`. */
  serviceType?: string | null;
  scheduledAt?: string | null;
};

/** One saved invitation, ready to send. */
type SavedShare = {
  email: string;
  amountCents: number;
  inviteToken: string;
};

export const FareSplitPanel = ({
  bookingId,
  totalRands,
  paymentStatus,
  serviceType,
  scheduledAt,
}: Props) => {
  const totalCents = Math.round(totalRands * 100);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>([""]);
  const [amounts, setAmounts] = useState<(number | null)[]>([null]);
  const [saving, setSaving] = useState(false);
  /** Non-empty once the split is saved: the panel switches from composing to sending. */
  const [saved, setSaved] = useState<SavedShare[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

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

  /**
   * What each invitation says, built from four scalars.
   *
   * Note what is not in scope here: there is no booking object. `inviteDetailsFor` cannot reach an
   * address even by accident, which is the reason the message builders live in
   * `fare-split-invite.ts` rather than being template strings composed inline next to a row that
   * has the address on it.
   */
  const organiserName = useMemo(() => {
    const fullName = (user?.user_metadata?.full_name ?? "") as string;
    const fromName = fullName.trim().split(/\s+/)[0];
    if (fromName) return fromName;
    // Falls back to the local part of the email rather than "Someone": the recipient is being
    // asked for money and needs to recognise who is asking.
    return (user?.email ?? "").split("@")[0] || "Your friend";
  }, [user]);

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

  const inviteDetailsFor = (share: SavedShare) => ({
    organiserName,
    serviceLabel: serviceLabelFor(serviceType),
    scheduledAt: scheduledAt ?? new Date().toISOString(),
    amountCents: share.amountCents,
    inviteUrl: inviteUrlFor(window.location.origin, share.inviteToken),
  });

  const copyLink = async (share: SavedShare) => {
    const url = inviteUrlFor(window.location.origin, share.inviteToken);
    try {
      await navigator.clipboard.writeText(url);
      haptic("success");
      setCopied(share.email);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard is permission-gated and refuses outright in some in-app browsers. Say so rather
      // than showing a tick for something that did not happen.
      toast.error("Could not copy. Long-press the link to copy it manually.");
    }
  };

  const submit = async () => {
    if (validationError) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("split-booking-fare", {
        body: { action: "create", bookingId, shares },
      });
      if (error) throw error;

      const payload = data as { shares?: SavedShare[] } | null;
      const savedShares = Array.isArray(payload?.shares) ? payload.shares : [];
      haptic("success");

      if (savedShares.length === 0) {
        // The split was recorded but no tokens came back — an older deployment of the function.
        // Say what is true (it is saved) and not what is not (that anyone can be told).
        toast.success("Split saved. Reload to get each person's link.");
        setOpen(false);
        return;
      }

      setSaved(savedShares);
      // Deliberately not "everyone has been emailed", which is what this said until 2026-08-12 and
      // which was false: nothing drains `integration_outbox`. The panel now hands over the links.
      toast.success("Split saved. Send each person their link.");
    } catch (err) {
      console.warn("fare split failed", err);
      toast.error("Could not save that split. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /*
   * Saved. Now the part that actually delivers.
   *
   * This screen exists because the previous version did not: it saved the split, claimed everyone
   * had been emailed, and closed. Nothing had been sent. Here the organiser is left holding three
   * ways to send each link, and the panel does not pretend the job is finished until they have.
   *
   * WhatsApp first, and not for stylistic reasons — it is the channel that gets read in South
   * Africa, and it is the one that works with no provider connected and no deliverability to
   * configure.
   */
  if (saved.length > 0) {
    return (
      <Card className="rounded-3xl p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <Check className="h-4 w-4" />
          </span>
          <p className="font-display text-base font-bold">Split saved — now send the links</p>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Xoot does not email these for you. Send each person their own link and they can confirm
          their share.
        </p>

        <div className="space-y-3">
          {saved.map((share) => {
            const details = inviteDetailsFor(share);
            return (
              <div key={share.email} className="rounded-2xl bg-muted/40 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{share.email}</span>
                  <span className="shrink-0 text-sm font-bold">
                    {formatZARDecimal(share.amountCents / 100)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => haptic("selection")}
                  >
                    <a
                      href={whatsappInviteUrl(details)}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Send ${share.email} their share on WhatsApp`}
                    >
                      <MessageCircle className="mr-1 h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <a
                      href={mailtoInviteUrl({ ...details, email: share.email })}
                      aria-label={`Email ${share.email} their share`}
                    >
                      <Mail className="mr-1 h-3.5 w-3.5" />
                      Email
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => copyLink(share)}
                    aria-label={`Copy the link for ${share.email}`}
                  >
                    {copied === share.email ? (
                      <Check className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <Copy className="mr-1 h-3.5 w-3.5" />
                    )}
                    {copied === share.email ? "Copied" : "Copy link"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Unchanged in substance and still the most important line on the card. */}
        <p className="mt-4 text-xs text-muted-foreground">
          Nobody is charged — card payments are not switched on, so shares are recorded and settled
          with you directly for now.
        </p>

        <Button
          variant="ghost"
          className="mt-3 w-full rounded-full"
          onClick={() => {
            setSaved([]);
            setOpen(false);
          }}
        >
          Done
        </Button>
      </Card>
    );
  }

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

      {/* The honest line, twice corrected. It used to promise an email nobody sends, and it still
          has to say that nothing is charged — both are things the organiser would otherwise
          discover from the person they asked for money. */}
      <p className="mt-3 text-xs text-muted-foreground">
        You will get a link for each person to send by WhatsApp or email — Xoot does not send it
        for you. Nobody is charged yet: card payments are not switched on, so shares are recorded
        and settled with you directly for now.
      </p>

      <Button
        className="mt-4 w-full rounded-full"
        disabled={Boolean(validationError) || saving}
        onClick={submit}
      >
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save and get the links
      </Button>
    </Card>
  );
};
