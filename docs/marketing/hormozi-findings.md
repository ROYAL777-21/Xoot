# Hormozi corpus — findings for Xoot

Queried from the MoreMozi corpus (2,039 episodes, 9,330 timestamped segments) via
`scripts/ops/ask-hormozi-search.mjs`. **Findings and citations only** — the corpus is redistributed
with permission, copyright is retained by the rights holders, and it is explicitly not covered by
that repo's MIT licence, so it is never vendored here.

## ⚠️ The correction that produced this file

I previously reported that `ask-hormozi` "cannot retrieve anything" and recorded it as a blocker in
the plan and in `growth-doctrine.md`. **That was wrong.** The corpus ships inside the repo as plain
Markdown; only `qmd`, the semantic indexer, is blocked by this environment's egress policy. The
corpus was usable the whole time.

Recorded because the failure mode is one this repo keeps paying for: **a claim that something does
not work, made without testing it, then propagated into documents as fact.** The check that would
have caught it was one `git clone`.

---

## 1. Attribution before scaling

Asked to help a door-to-door service business get more customers, Hormozi's first move is not a new
channel. It is **attribution**: get tracking in place before spending more, and explicitly *don't*
go after a new avatar and build a whole new acquisition method while two existing ones are working.

[Helping a Door-to-Door Service Business Get More Customers — 03:00](https://www.youtube.com/watch?v=FV2atvb2Uuw&t=180s)

**Directly supports the existing plan ordering.** Phase 1 instrumentation before Phase 2 growth was
argued from this repo's own state (no analytics, no crash reporting, ~0 rows). This is independent
agreement from the founder's chosen reference, and it is worth more than either argument alone.

**For Xoot:** the same sequencing already written down. Do not scale distribution until the funnel
is measured, and do not open a fourth target market while the first has no data.

## 2. Discounts — and the conflict that must not be smoothed over

Hormozi's position, in a video titled for exactly Xoot's situation:

- A 10–20% discount is *"no point"* — too small to change behaviour.
- If you discount, make it large (80–90%) on something that **costs you very little**, purely as an
  entry point into an upsell.
- His preferred lead magnet: **"give something that other people charge for."** The more real the
  thing is — the more it genuinely costs — the better it works.

[Charge Premium Prices in a Commoditized Market — 12:00](https://www.youtube.com/watch?v=9NK1YsX6IWc&t=720s)

> ### ⚠️ NOT ADOPTABLE AS WRITTEN
>
> `docs/BRAND_GUIDE.md` bans `cheap`, `budget`, `discount` and `bargain` outright, and bans
> `subscribe` for Care+. The discount mechanics above cannot be used, however they are framed.
>
> There are two further reasons beyond brand tone:
>
> - **CPA s30** bars presenting a price as a reduction from one never actually charged. A large
>   "was" price constructed to make a discount look big is precisely what that section addresses.
> - **The R47/R54 hourly figures are legal floors, not pricing levers.** They cannot absorb a
>   discount at all, so the "make it big on something that costs little" mechanic has nothing to
>   operate on where labour is the cost.
>
> **The half that does transfer is "give something that other people charge for"** — which is
> value-first, brand-safe, and already what the content plan does. The company set's *"What is
> actually included in a deep clean"* is exactly this: a comparison checklist that agencies use as a
> sales tool, given away with "print it, take it to whoever you're using."

## 3. Offer levers — speed, ease, risk-reversal

From the same segment: most offers fail because they promise nothing around **speed**, nothing
around **ease**, and do nothing to **reverse risk**. His instruction is not to do all three —
*"just focus on one and hammer it and do it really well."*

**For Xoot, the lever is risk-reversal, and it is already built.** Vetting, the reliability record,
and the shown-price guarantee all reduce the buyer's risk of letting a stranger into their home.
That is the fear the category actually runs on, and it is the one Xoot can evidence rather than
claim.

Speed is a weak lever pre-launch (supply is the ceiling — a fast promise into a suburb with no
Xooter coverage is a cancellation). Ease is real but undifferentiated; every competitor claims it.

**Pick one and hammer it: risk-reversal.**

---

## How to query this yourself

```bash
git clone https://github.com/poseljacob/ask-hormozi ~/.local/share/ask-hormozi
node scripts/ops/ask-hormozi-search.mjs "pricing against a cheaper competitor" --show-text
```

No `setup.sh` needed — that installs `qmd` for semantic search, which the script deliberately does
not require. It is keyword search, so **an empty result is not proof the corpus is silent**; try
different terms before concluding anything.
