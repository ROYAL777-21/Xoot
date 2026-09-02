# Xooter recruitment — LinkedIn and Indeed

Written 2026-09-02. **Every number here is read from the code, not chosen for the ad.** Sources:
`src/lib/xooter-commission.ts` (the ladder), `docs/product/locked-commercial-facts.md` (prices),
`src/lib/xoot-pricing.ts` (the R47/hour floor on long jobs).

---

## ⛔ Read this before posting — three things are yours to settle

### 1. Employment classification is not defined anywhere in this repo

I searched `docs/product/`, `BRAND_GUIDE.md` and `xoot-master-brief.md` for "independent
contractor", "self-employed", "employee" and "employment". **There are no matches.** The product is
built contractor-shaped — commission per job, payout accounts, an application-and-activation flow —
but nothing states the legal relationship.

**This matters more in South Africa than almost anywhere.** Under **LRA s200A**, a person earning
below the BCEA threshold is *presumed to be an employee* if any one of seven factors applies —
including that their hours are controlled, that they work for one client, or that they are provided
with tools. A presumption is rebuttable, but the burden falls on you. Get this wrong and the CCMA
treats every Xooter as an employee retrospectively: leave, UIF, notice, unfair dismissal.

**The wording below is written for an independent-contractor engagement.** If you intend employment,
the ad must change — the pay section becomes a wage, not a commission share. **Confirm this with an
attorney before the first post goes out.** It is cheaper than the alternative by orders of magnitude.

### 2. Name your launch suburbs

The ad has `[SUBURBS]` placeholders. Recruiting outside your service area produces applicants you
cannot activate, and rejection at that stage costs you word-of-mouth in exactly the community you
need. `launch-protocol.md` gate 5 is "supply before demand" for the same reason.

### 3. Do not post until people can actually be paid

Gate 3 — PayFast merchant credentials — is open. A Xooter who completes a job and cannot be paid is
a worse outcome than a Xooter you never recruited.

---

## Version A — LinkedIn

> **Xooter — home-care professionals | [SUBURBS] | Independent contract, flexible hours**
>
> Xoot is building managed home-care infrastructure in [CITY]. We are onboarding our first Xooters —
> the professionals who do the work and carry the reputation.
>
> **What the work is**
> Residential cleaning across [SUBURBS]. Bookings come to you through the Xoot app with the address,
> the scope, the hours and the amount you will receive, agreed before you accept. You choose which
> jobs to take.
>
> **What you earn**
> You keep **65% of every booking's value from your first job**, and that share rises with completed
> work and reliability:
>
> | Rank | Completed jobs | You keep |
> |---|---|---|
> | New | from job 1 | 65% |
> | Bronze | 5 | 67.5% |
> | Silver | 15 | 70% |
> | Gold | 50 | 75% |
> | Platinum | 120 | 80% |
>
> On a standard 4-hour home clean at R280, that is **R182 to you at New rank and R224 at Platinum**.
> The rank also depends on a reliability score — arriving when you said you would, finishing the
> scope, and how clients rate the work. It is published in the app so you always know where you are
> and what the next rung needs.
>
> **What we do differently**
> We match jobs by suburb proximity. Travel between jobs is the single biggest unpaid cost in this
> industry, and reducing it is a design goal of our matching engine, not an afterthought.
>
> **What you need**
> - South African ID or a valid work permit
> - A bank account in your own name
> - A smartphone with data
> - Two contactable references from previous cleaning or domestic work
> - Proof of address
>
> Experience helps. It is not required — our onboarding modules cover cleaning standards and chemical
> safety, hospitality and communication, child-safety essentials, eco-friendly practice, and garden
> work.
>
> **How we vet**
> Every application is reviewed by a person before activation: ID, selfie, proof of address, banking
> details and references. We do this because our clients let a stranger into their home, and because
> a Xooter who has been properly checked is worth more per job than one who has not.
>
> **Apply:** [LINK]
>
> Xoot is an equal-opportunity organisation. We welcome applications from all South Africans.

---

## Version B — Indeed

Indeed rewards a plain structure and specific search terms. Same facts, different shape.

> **Job title:** Cleaning Professional (Xooter) — Independent Contract — [SUBURBS]
> **Job type:** Contract · Part-time · Flexible hours
> **Pay:** Commission per booking — you keep 65%–80% of the booking value
>
> **About Xoot**
> Xoot is a home-care platform in [CITY]. Clients book cleans through our app; Xooters — our
> professionals — accept the jobs that suit them and are paid per completed booking.
>
> **What you will do**
> - Residential cleaning in [SUBURBS]
> - Accept bookings through the Xoot app, with scope, hours and your payout shown before you accept
> - Arrive on time, complete the agreed scope, and update the job status in the app
> - Treat every home and every client's belongings with care
>
> **What you will earn**
> You keep **65% of the booking value from day one**, rising to **80%** as you complete jobs and
> maintain a strong reliability score:
>
> - New (from your first job) — 65%
> - Bronze (5 completed jobs) — 67.5%
> - Silver (15) — 70%
> - Gold (50) — 75%
> - Platinum (120) — 80%
>
> Worked examples at current prices:
> - 4-hour home clean, R280 → **R182** at New rank, **R224** at Platinum
> - 8-hour home clean, R400 → **R260** at New rank, **R320** at Platinum
>
> Payment is per completed booking into your own bank account. **We do not guarantee a number of
> bookings** — how much you earn depends on how many jobs you accept and complete.
>
> **Requirements**
> - South African ID or valid work permit
> - Bank account in your own name
> - Smartphone with data
> - Two contactable references
> - Proof of address
> - Willing to complete our onboarding modules before your first job
>
> **Nice to have**
> - Previous domestic, hotel or contract-cleaning experience
> - Own transport
> - Experience with pets, or with Airbnb turnovers
>
> **Vetting**
> Every applicant is reviewed by a person before activation — ID, selfie, proof of address, banking
> details and references.
>
> **Apply:** [LINK]

---

## What was deliberately left out, and why

| Not said | Why |
|---|---|
| "Earn R6,000+ a month" | There is no booking volume to support any monthly figure. Under **CPA s41** a representation is misleading regardless of intent, and an income claim you cannot evidence is the single most litigated line in gig recruitment |
| "MIE screened" | The field exists in the admin review screen; a screening-bureau contract does not. Same reason it was removed from the homepage on 2026-09-02 |
| "Guaranteed work" | Nothing guarantees it |
| "Flexible hours, be your own boss, unlimited earning potential" | `BRAND_GUIDE` bans `cheap / budget / discount / bargain` and the register is wrong for a premium positioning — and "be your own boss" is exactly the phrase that gets quoted back at a s200A hearing |
| A per-hour rate | Xooters are paid per booking, not per hour. Quoting an hourly figure invites the classification problem and would be an approximation, not a fact |

## Where these numbers come from, so they can be re-derived

- **Commission ladder** — `COMMISSION_BANDS` in `src/lib/xooter-commission.ts`: 3500, 3250, 3000,
  2500, 2000 basis points of commission, at 0, 5, 15, 50 and 120 completed jobs. The Xooter's share
  is the remainder.
- **Reliability thresholds** — `minScore` on the same bands: 85, 88, 93, 97, with a 3-point
  hysteresis so one bad week does not demote someone.
- **Prices** — `docs/product/locked-commercial-facts.md`: small R280 / 4h, medium R325 / 5.5h,
  large R400 / 8h.
- **Training modules** — seeded by `20260421080011`: cleaning standards and chemical safety,
  hospitality and communication, eco-friendly practices, child-safety essentials, garden pruning.

⚠️ **If the ladder or the prices change, this file is stale.** Locked commercial facts change only
through a decision-log entry; re-read both sources before reposting.
