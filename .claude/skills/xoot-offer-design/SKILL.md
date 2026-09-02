---
name: xoot-offer-design
description: >
  Design and price Xoot offers — service bundles, Care+ tiers, first-clean offers, promotions
  and price changes — using the offer and money-model frameworks translated into what South
  African consumer law and Xoot's own floors actually permit. Use when creating or changing an
  offer, setting or raising a price, designing a promotion, or deciding what to bundle.
user-invocable: true
---

# Xoot offer design

The frameworks work. Their default packaging does not survive contact with either the Consumer
Protection Act or `docs/BRAND_GUIDE.md`. This skill keeps the mechanism and changes the wrapper.

## Before anything: the constraint block

Every offer must clear all six. They are not preferences.

1. **CPA s41** — a misleading representation is unlawful *regardless of intent*.
2. **CPA s30** — no price presented as a reduction from one never actually charged.
3. **CPA s14** — fixed terms max 24 months, cancellable on 20 business days' notice.
4. **The hourly floors** — R47/hr and R54/hr exist for the Xooter. Price moves *up* from there.
   They are not a variable. Any change goes through a decision-log entry.
5. **Care+ breaks even at 2.54 bookings/month.** Below that the member loses money.
6. **BRAND_GUIDE bans** `cheap`, `budget`, `discount`, `bargain`, and `subscribe` for Care+.

**Supply is the seventh.** An offer that sells more bookings than Xooters can serve produces
cancellations, refunds and one-star reviews. Check coverage in the launch regions before
designing demand.

## The value equation, and which term to actually pull

`Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort)`

Most operators pull Dream Outcome, because it is the easiest to write. **In this market the
binding term is Perceived Likelihood.** A woman booking a stranger into her home is
risk-sensitive before she is price-sensitive. An offer that adds a service but does not address
"will she show up, and is she safe" has moved the wrong variable.

| Term | Strongest Xoot lever |
|---|---|
| Dream outcome | Coming home to it done. The mental load put down |
| **Perceived likelihood** | **Vetting specifics, ratings, same-Xooter continuity, a guarantee that is honoured** |
| Time delay | Faster matching, a clear arrival window |
| Effort | Saved household profile, recurring schedule, continuity |

Write the moment, not the service: the door, the light, the not-having-to.

## Building an offer

Dream outcome → every problem between here and it → a solution per problem → delivery vehicles →
trim high-cost/low-value, stack the rest.

The trim rule that matters: keep what is **created once and delivered many times**. A saved
household profile, a checklist, a standing slot. Those cost nothing per booking and raise
perceived likelihood.

## Enhancers — the legalised forms

| Mechanism | Do this | Never this |
|---|---|---|
| **Scarcity** | Real availability, read live: "3 Xooters open in Bryanston on Saturday" | An invented count |
| **Urgency** | A deadline that is actually honoured | A rolling "ends Friday" that never ends |
| **Anchoring** | Tiers side by side; anchor against *your own* higher tier | A struck-through price never charged (s30) |
| **Bonus** | Add value — an extra room, a priority slot, a locked founding rate | A discount. It invites s30 and trains negotiation |
| **Guarantee** | One specific promise operations will honour every time, written where support can see it | A guarantee quietly declined on contact |
| **Naming** | Reason + who + outcome + interval + container | Clever names that say nothing |

**On guarantees.** This is the highest-leverage item on the list and the most dangerous. Under
s41 a guarantee you do not honour is a misrepresentation, not a customer-service lapse. Before
proposing one, name the person who honours it and the budget it comes from.

**Not adopted without legal review:** win-your-money-back, giveaways, prize draws. SA
promotional-competition rules are specific and this is regulatory, not a growth experiment.

## Pricing

Value-based. Never competitor-matched — matching prices concedes that you are the same product,
which is the one thing this offer exists to deny.

Raising price is the strongest single lever: it lifts revenue per booking *and* cuts delivery
cost by lowering volume. The virtuous cycle is real — higher price → higher commitment → better
outcomes → lower churn.

**Raising on existing customers** — remind them of value already delivered, state the change
plainly, say what the money buys, reward loyalty with a transition period, and leave a door open
for anyone it genuinely hurts. Announce before it takes effect. Never bury it in a T&C update.

## When the offer fatigues

Change the wrapper, not the operations. New reason-why, new name, new interval, new creative.
The delivery stays identical, so nothing operational has to be rebuilt — which is the entire
point of the technique.

## Before shipping any offer

1. Every number traced to the live ladder or `docs/product/locked-commercial-facts.md`.
2. No claim that a readiness constant currently gates.
3. Xooter coverage checked for the suburbs it targets.
4. Care+ maths checked against 2.54 for the segment being sold to.
5. Read aloud — if it sounds like a sale, rewrite it. Xoot sells relief, not price.

---

## The Hormozi corpus — what is usable, and the one rule that is not

Findings and citations: **`docs/marketing/hormozi-findings.md`**. Query it yourself with
`node scripts/ops/ask-hormozi-search.mjs "<query>"` (keyword, not semantic — an empty result is not
proof of absence).

### ⛔ Hard rule: never propose a discount mechanic

Hormozi's position is that a 10–20% discount is pointless and that a discount should be large on
something that costs little, as an entry to an upsell. **Do not adopt it in any form.** Three
independent reasons, and each alone is sufficient:

1. `docs/BRAND_GUIDE.md` bans `cheap`, `budget`, `discount` and `bargain` outright.
2. **CPA s30** bars presenting a price as a reduction from one never actually charged — a "was"
   price constructed to make a discount look big is exactly what that section addresses.
3. **R47/R54 are legal floors, not levers.** Where labour is the cost, there is nothing to discount.

### ✅ What does transfer

- **"Give something that other people charge for."** The more genuinely valuable the giveaway, the
  better it works — and it is brand-safe because it adds value instead of cutting price.
- **Pick one offer lever and hammer it: speed, ease, or risk-reversal.** For Xoot the lever is
  **risk-reversal** — vetting, the reliability record, the shown-price guarantee. It is the fear the
  category runs on and the one Xoot can evidence rather than claim. Speed is weak pre-launch
  (supply is the ceiling); ease is undifferentiated.
- **Attribution before scaling.** Do not design a new offer for a new market while the first has no
  measurement.
