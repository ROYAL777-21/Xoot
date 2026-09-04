import { useState } from "react";
import { Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/format";
import { GIFT_HOURS, giftPriceCents } from "@/lib/xoot-pricing";

/**
 * Gift a clean — design position 2, ported from `xoot/site/SiteGift.jsx:76-288`.
 *
 * Built, as the handoff intends, as a near-twin of the hero: the same badge → headline → paragraph
 * → card rhythm, sitting immediately below it because gifting is the second thing this business
 * sells.
 *
 * ⛔ **Four of the design's five selling points are not here, and their absence is the point.**
 *
 * `SiteGift.jsx`'s own header lists what makes gifting worth explaining — the sender pays up front,
 * the recipient gets a card rather than a code, credit lands in their account, and *"unused credit
 * never expires, and is refundable to the SENDER until it is booked."* Every one of those is a good
 * answer to a real question. **None of them is true of this product today.**
 *
 * Measured, not assumed — `supabase/functions/ops-workflow/index.ts` handles
 * `gift_clean_order_requested` by inserting a `gift_clean_orders` row and a `payment_records` row
 * stamped `provider_required: "PayFast credentials not connected"`.
 *
 * | design says | why it cannot ship |
 * |---|---|
 * | "You pay once, now" | **PayFast is not connected.** No gift can be paid for at all |
 * | "They get a card, not a code" | There is no delivery path. Nothing sends anything |
 * | "Unused credit comes back to you… in full" | There is no refund path. This is a money promise |
 * | "It never expires" | **CPA s63** governs unredeemed vouchers and the expiry rule is undecided |
 *
 * The full versions are written and waiting in `docs/marketing/held-content/gift-campaign.md`, each
 * under the gate it needs. This section ships the part that is true: you tell Xoot who it is for,
 * and Xoot comes back to you. Under-promising is the survivable direction under the CPA;
 * over-promising a refund on money the system cannot yet take is not.
 *
 * ⛔ **The price comes from `giftPriceCents()` only.** ZD-038 found this exact section's app-side
 * twin quoting a hardcoded table — R270/R365/R315/R420/R455 — that existed nowhere in the ladder.
 * `gift-pricing-parity.test.ts` fails if a literal reappears in either writer.
 */

/*
 * Each occasion carries its own card wording, and the design's reason is worth keeping: *"A single
 * generic 'Enjoy the quiet.' under four different buttons makes the buttons decorative — the sender
 * picks an occasion and nothing changes, which reads as a control that does not work."*
 *
 * ⚠️ The design's Mother's Day hint — "the most-gifted day of the year on Xoot" — is dropped. Xoot
 * has completed zero bookings, so there is no most-gifted anything. It is the same fabricated-
 * evidence class as the `Reviews` section, which is excluded from the site for that reason.
 */
const OCCASIONS = [
  {
    label: "Mother's Day",
    title: "Happy Mother's Day",
    note: "You have cleaned up after all of us for long enough.",
    tint: "var(--xoot-petal-wash)",
    ink: "var(--xoot-petal-ink)",
  },
  {
    label: "A new baby",
    title: "Congratulations",
    note: "One less thing. Sleep instead.",
    tint: "var(--xoot-mist-wash)",
    ink: "var(--xoot-mist-ink)",
  },
  {
    label: "Moving in",
    title: "Welcome home",
    note: "Start in a place that is already clean.",
    tint: "var(--xoot-honey-wash)",
    ink: "var(--xoot-honey-ink)",
  },
  {
    label: "Just because",
    title: "No occasion",
    note: "Go and sit down. It is handled.",
    tint: "var(--xoot-sage-wash)",
    ink: "var(--xoot-sage-ink)",
  },
] as const;

/** The services the gift resolver can actually price. Anything else is not offered. */
const GIFT_SERVICES: { id: string; label: string }[] = [
  { id: "residential", label: "Regular clean" },
  { id: "deep", label: "Deep clean" },
  { id: "airbnb", label: "Airbnb turnover" },
  { id: "moving", label: "Moving clean" },
].filter((s) => s.id in GIFT_HOURS && giftPriceCents(s.id) !== null);

export const GiftClean = () => {
  const [occasion, setOccasion] = useState(0);
  const [service, setService] = useState(GIFT_SERVICES[0]?.id ?? "residential");

  const occ = OCCASIONS[occasion];
  const cents = giftPriceCents(service);

  return (
    <section
      id="gift"
      className="relative overflow-hidden py-16 md:py-24"
      style={{ background: "var(--xoot-grad-dusk)" }}
    >
      <div className="container">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <span
              className="mb-5 inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-xs font-bold shadow-sm"
              style={{ color: "var(--xoot-petal-ink)" }}
            >
              <Gift className="h-3.5 w-3.5" />
              Gift a clean
            </span>

            <h2 className="font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
              Give someone their
              <br />
              <span style={{ color: "var(--xoot-petal-ink)" }}>weekend back.</span>
            </h2>

            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              Choose the occasion and the kind of clean. Tell us who it is for, and we will come back
              to you to arrange it — they pick their own day, their own Xooter, and are never asked
              for a card at the door.
            </p>

            <div className="mt-7 rounded-3xl bg-card p-5 shadow-lg">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                What kind of clean
              </p>
              <div className="grid grid-cols-2 gap-2">
                {GIFT_SERVICES.map((s) => {
                  const on = s.id === service;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setService(s.id)}
                      aria-pressed={on}
                      className={`rounded-2xl px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                        on
                          ? "bg-foreground text-background"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/*
                ⛔ One visit, priced by the resolver. The design offers 1/4/12 bundles; a bundle is a
                multi-visit commitment and nothing in `gift_clean_orders` records one, so offering
                the choice would collect a preference the writer discards. One visit is what the
                order actually is.
              */}
              {cents !== null && (
                <p className="mt-4 border-t border-border/60 pt-4 text-sm">
                  <span className="text-muted-foreground">One visit, from </span>
                  <strong className="font-display text-lg font-bold">{formatZAR(cents / 100)}</strong>
                </p>
              )}

              <Button asChild size="lg" className="mt-4 w-full rounded-full">
                <Link to="/app/gifts">Arrange a gift</Link>
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-sm">
              <div
                className="rounded-[2rem] p-7 shadow-xl transition-colors"
                style={{ background: occ.tint }}
              >
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: occ.ink }}>
                  {occ.label}
                </p>
                <p className="mt-3 font-display text-3xl font-bold leading-tight">{occ.title}</p>
                <p className="mt-3 text-base leading-relaxed text-foreground/70">{occ.note}</p>
                <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-foreground/40">
                  A clean, from Xoot
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {OCCASIONS.map((o, i) => (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => setOccasion(i)}
                    aria-pressed={i === occasion}
                    className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      i === occasion
                        ? "bg-foreground text-background"
                        : "bg-card/70 text-muted-foreground hover:bg-card"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
