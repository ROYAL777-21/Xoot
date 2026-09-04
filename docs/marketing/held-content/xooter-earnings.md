# ⛔ HELD — Xooter earnings creative

> ## This cannot be published yet
>
> **Waits on one thing: the employment-classification answer, under LRA s200A.**
>
> `xooter-hiring-ad.md` sets it out. Nothing in this repository states the legal relationship between
> Xoot and a Xooter — searches for "independent contractor", "self-employed", "employee" and
> "employment" across `docs/product/`, `BRAND_GUIDE.md` and `xoot-master-brief.md` return **no
> matches**. The product is built contractor-shaped, and that is not the same as it being decided.
>
> Under **LRA s200A** a person earning below the BCEA threshold is *presumed to be an employee* if
> any one of seven factors applies — including that their hours are controlled, that they work for
> one client, or that they are provided with tools. The presumption is rebuttable and the burden
> falls on Xoot. Get it wrong and the CCMA treats every Xooter as an employee retrospectively:
> leave, UIF, notice, unfair dismissal.
>
> ⚠️ **The written hiring ad in `xooter-hiring-ad.md` is already correct and already guarded** —
> `marketing-claim-rules.test.ts` now checks its earnings figures against the ladder crossed with
> `COMMISSION_BANDS`. What is held here is the **video and image creative**, because a person on
> screen saying what they earn is a far stronger representation than the same sentence in a job ad.

---

## Why creative is held even though the ad copy is not

A written figure in a job listing is read as an example. A person on camera saying *"I made this
last month"* is read as a promise, and it is the single most litigated line in gig recruitment.

It is also the format where the numbers most easily drift: a script gets shortened, "up to" falls
off, and a band becomes a guarantee.

## The rule when it clears

**Every figure computed, none typed.** The permitted set is the residential ladder crossed with
`COMMISSION_BANDS` in `_shared/pricing.ts`, through `xooterPayout()` — the same function the payout
writer uses. Today that means:

- 4-hour clean at R250 → **R162.50** at New rank (65%), **R200** at Platinum (80%)
- 8-hour clean at R376 → **R244.40** at New, **R300.80** at Platinum

⚠️ These are what the ladder currently produces. **Re-derive them before shooting** — if a band or a
price has moved, the guard will fail the written ad and a shot video will simply be wrong.

## ⛔ Never, in any format

| Not said | Why |
|---|---|
| A monthly income figure | There is no booking volume to support one. **CPA s41** |
| "Be your own boss" | The exact phrase quoted back at an s200A hearing |
| "Guaranteed work" | Nothing guarantees it |
| A per-hour rate | Xooters are paid per booking. An hourly figure invites the classification problem and is an approximation, not a fact |

## The one thing that is true and under-used

**The R47/hour floor on long jobs.** It is a locked commercial fact
(`LONG_JOB_FLOOR_CENTS_PER_HOUR`), it exists specifically to keep a Xooter above the national
minimum wage on a ten-hour clean, and it is the most defensible recruitment claim Xoot has —
because it is a promise about the *worst* case rather than the best.

⚠️ Its own expiry is written down: the national minimum wage rises each March, and
`care-plus.test.ts` fails on 2027-01-31 to force the review before the ladder becomes illegal.

## The measurement rule, which is not optional

⛔ **Judge this creative on applications, never on reach.**

`hormozi-corpus-findings.md` records the measurement inversion, and it has been measured seven
times: "Careers" content is the **worst** topic on the channel by engagement — a 0.59× outlier
against a 1.16× baseline, on 30% of the engagement. Recruitment content underperforms on every
vanity metric and is the constraint the business actually has.

Xoot is supply-constrained. Optimising this creative for views would systematically kill the
version that works.
