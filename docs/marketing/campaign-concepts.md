# Campaigns — including the record attempt, done properly

Written 2026-09-03 at the founder's request for *"marketing campaigns that we haven't come up with
yet"*, and to place the Guinness attempt they are planning.

## ⛔ The test every campaign has to pass

**A campaign that generates demand is aimed at the wrong constraint.**

`growth-strategy-2026.md` and `hormozi-corpus-findings.md` establish — from two independent passages
that both reach for a domestic-cleaning business as the example — that a done-for-you service
business is **supply constrained**: *"you're actually not in the cleaning business, you're in the
recruiting cleaners business."* `launch-protocol.md` gate 5 already ordered supply before demand.

So every concept below is scored on **which constraint it relieves**, and a concept that only brings
customers ranks below one that brings Xooters, however good the idea.

⚠️ **And the measurement will disagree with you.** Recruiting content measures **0.59× outlier
against a 1.16× baseline** on the channel that produced this advice. Judge supply campaigns on
**applications**, never reach.

---

# 🥇 1. The Guinness attempt — reframed to hit the binding constraint

The founder is planning a **Guinness World Record attempt for publicity**, tied to the training
modules. Framed correctly it is the strongest campaign available, for a reason nothing else can
match.

## ⚠️ First, the three rules that keep it legal

1. ⛔ **It is an *attempt* — future or present tense — until Guinness certifies it.**
   *"We're attempting…"* ✅ · *"Record-breaking"* before certification ⛔. That is a **CPA s41
   misleading representation**, the same rule that killed the before/after asset.
2. ⚠️ **Guinness is a real process, not a press release.** Application, category approval (or a
   new-category proposal, which is slower), an evidence standard, independent witnesses, video and
   timing logs, and a fee. **Budget and schedule it before announcing anything.**
3. ⚠️ **Public participation plus any prize triggers CPA s36** — written rules, no required
   consideration, records kept.

## 🥇 Why it should be a *training* record, not a cleaning one

The instinct is *"most homes cleaned in a day."* ⛔ **That is a demand stunt against a supply
constraint.** It needs Xooters Xoot does not have, and it risks a bad customer experience at scale —
the one thing a premium brand cannot afford in week one.

**The aligned version: the largest simultaneous professional-cleaning training session in South
Africa.**

| It produces | Why that matters here |
|---|---|
| **A room full of trained candidate Xooters** | Relieves the binding constraint directly — gate 5 |
| **Publicity with a real news hook** | Not a stunt about a brand. A stunt about employment, in a country where that is the story |
| **Real, unfabricated footage of real people** | ⚠️ **The only non-fabricated proof asset available.** Zero completed bookings means every customer claim is blocked under CPA s41. This is not |
| **Use of the training modules** | `growth-strategy-2026.md`: training is *"the asset a competitor cannot copy by scraping the site"* |

**Nothing else in the entire marketing plan does more than one of those.**

## ⚠️ Partner — do not do it alone

`cleaning-school-partnership-proposal.md` already exists and is unsent. A training school brings the
venue, the accreditation and the third-party credibility that makes a record attempt believable;
Xoot brings the curriculum and the jobs at the end of it. **That proposal stops being a side quest
and becomes this campaign's spine.**

## ⛔ Blocked by exactly one thing

**LRA s200A.** A mass training event for prospective Xooters is recruitment-facing, and nothing
recruitment-facing publishes until employment classification is settled. One legal decision blocks
the best campaign, the primary growth channel, and the Xooter referral. **It is the highest-value
item on the founder's list and it is not close.**

## What would prove it worked

Not coverage. **Applications, and the proportion that convert to activated Xooters in a launch
suburb.** A record with a hundred press mentions and eleven activated Xooters has failed at the
thing it was for.

---

# 2. The transparent ladder — newly available, and the cheapest thing here

⚠️ **ZD-037 just unblocked this at zero cost.** With the pricing conflict closed, Xoot can publish
**the full per-hour ladder and what the Xooter earns from it** — as a positioning act rather than a
price list.

The argument, and it is already half-made in `company-social.md`: workers at other platforms
reportedly lose up to half their pay to travel; Xoot matches on suburb-centroid proximity in
`ai-match`, `create-booking` and `request-replacement`. **This is that argument made with numbers
instead of adjectives.**

What it can honestly say today: the ladder (R250 at 4h → R470 at 10h on `REGULAR`), the **R47/h
floor and why it exists** — a 10-hour clean used to return R27.95/h, below minimum wage, so the
floor was added — and that referral credits and cadence discounts are funded from **commission,
never from Xooter pay** (`DISCOUNT_FUNDING`, `REFERRAL_FUNDING`).

⛔ **What it may not say:** the commission percentage as a boast. 35% starting is not obviously
generous and inviting that comparison unprompted is a fight on someone else's terms.

⚠️ **The tension worth deciding deliberately:** `intellectual-property.md` §5 notes that the ladder
and the floor logic are protected *only* by not being published. **Radical transparency and trade
secrecy are mutually exclusive here.** This campaign spends the secret. That is probably the right
trade for a company with no customers, but it is a trade and it should be made on purpose.

**Constraint: trust / demand. Cost: zero. Blocked by: nothing.**

---

# 3. Suburb-by-suburb, in public

Open **one suburb at a time**, publicly, and gate each opening on **named, activated Xooters** —
which is gate 5's own definition.

Why it is better than a general launch: it makes the supply constraint **visible and legible** to
both sides at once. A customer in an unopened suburb sees a waitlist and a reason; a prospective
Xooter sees that their suburb opening depends on people like them. **One mechanic, both sides of the
marketplace.**

It also matches the product: `resolveLaunchRegion` and `isApprovedLaunchRegion` already refuse
bookings outside coverage, so this markets what the code already does rather than promising around
it.

**Constraint: supply and demand together. Cost: low. Blocked by: gate 2 (DNS).**

---

# 4. The build-in-public defect series

The strongest material Xoot has, and it is already written: the GoDaddy discovery, the deploy check
that checked nothing for three weeks, the migration staging refused, the price the document had
never charged.

⚠️ **This is the one category where having zero customers is an advantage.** Every competitor markets
outcomes; Xoot cannot, and so it markets its reasoning instead — which is both true and rarer.

**Constraint: demand / credibility. Cost: zero, drafts exist. Blocked by: gate 2.**

---

# 5. Ghost products — the highest-trust mechanic available

From the highest-engagement reference measured (3.71%, 22.66× outlier): *"I said — hey, by the way,
you can get this one cheaper down the street at Costco… As soon as I made that switch, everyone
bought what I recommended afterwards."*

The Xoot version: **tell a customer when they need less than they selected.** A two-room flat that
does not need the medium tier. An Airbnb host whose unit fits a smaller turnover slot.

⚠️ **The mechanism half-exists.** `serviceFit()` already re-prices when the property does not match
the service — and it fails in the **over-stating** direction on purpose. The honest inverse is the
ghost product: *this is less than you asked for, and it is what you need.*

⛔ **This is a product change, not copy.** The concierge and the booking flow both need to be able to
say it, and it would be the first mechanism that deliberately moves a total **down**.

**Constraint: trust / retention. Cost: engineering. Blocked by: founder decision.**

---

# 6. Xooter-refers-Xooter

The higher-leverage half of ZD-036. The customer referral shipped; the **supply-side** one did not —
and supply is the constraint.

From the corpus, on a supply-constrained service business: *"you have word of mouth from your
existing staff… we have to approach this the same way we approach getting customers. **They are just
now the customer.**"*

⚠️ **The schema already supports it.** `public.referrals` is keyed on `user_id` and the signup
trigger issues a code to **every** user — Xooters included. This is wiring, not a new system.

⚠️ **But note the honest caveat in the source:** *"Now, small, not as much."* A staff referral
programme compounds from a base of nearly nobody. **Right mechanism, wrong moment** — build it when
there is a base.

**Constraint: 🥇 supply. Cost: low. Blocked by: LRA s200A.**

---

# The ranking, and the one thing that unlocks three of six

| # | Campaign | Relieves | Cost | Blocked by |
|---|---|---|---|---|
| 1 | Training record attempt | 🥇 Supply | High | **LRA s200A** |
| 2 | The transparent ladder | Trust / demand | **Zero** | **Nothing** |
| 3 | Suburb-by-suburb in public | Both | Low | Gate 2 |
| 4 | Build-in-public defects | Credibility | Zero | Gate 2 |
| 5 | Ghost products | Trust / retention | Engineering | Founder decision |
| 6 | Xooter-refers-Xooter | 🥇 Supply | Low | **LRA s200A** |

⚠️ **#2 is the only one blocked by nothing at all**, and it became free today when ZD-037 closed the
pricing conflict.

⛔ **LRA s200A blocks #1 and #6 — both supply campaigns, which is to say both of the campaigns aimed
at the actual constraint.** Gate 2 blocks two more. **One legal decision and one DNS record stand
between this list and four of its six entries.**

## Claim rules every campaign here has been checked against

- **Prices permitted** since ZD-037, from the locked table only: R250 / R296 / R376, R39, R30, R22,
  R99, and the per-hour ladder. ⚠️ These are intended to rise — use **"from R250"** in anything
  long-lived.
- **CPA s41** — no outcome claim, no testimonial, no completed-job implication. Zero bookings.
- **CPA s36** — no giveaway or competition mechanic, and this is live for #1 if participation is
  involved.
- **LRA s200A** — nothing recruitment-facing publishes.
- **POPIA** — no identifiable person without written, withdrawable consent. ⚠️ Relevant to #1: a
  training hall full of people is a hall full of personal information, and consent must be collected
  **at the door, in writing, before filming**.
- **`BRAND_GUIDE`** — never `cheap` / `budget` / `discount` / `bargain`; no competitor named.
- **Nothing publishes without the founder approving that exact text.**
