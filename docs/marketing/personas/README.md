# Persona registry

Founder instruction, 2026-09-02:

> *"there will be more in the future, that look different based on what the data shows us — we will
> produce more of the same of what works."*

That is an architecture requirement, not a folder. This is the architecture.

---

## ⚠️ The failure this exists to prevent

"More of what works" becomes **four personas nobody can compare** unless something forces the
comparison. The corpus is blunt about the shape of it:

> *"I think it's unwise to have two entirely different avatars. And the price of the business that
> you want at a million a month is giving up the very small business."*
> — [Hormozi, rMMOHeBzA50, 01:30](https://www.youtube.com/watch?v=rMMOHeBzA50&t=90s)

He also warns, in the same segment, that a cheaply-acquired segment can be the worst one you have,
and **you cannot tell until you have LTV, not just CAC** — so do not restructure on two weeks of
data.

## The four rules

1. **A persona enters only against a named avatar and a written hypothesis.** "She'd do well" is not
   a hypothesis. "Avatar B does not trust a presenter who reads as a customer, so a presenter who
   reads as an operator will out-convert on H3" is.
2. **A persona is retired whenever a third would otherwise be added.** Two live at a time. The
   registry is a bench, not a collection.
3. **Ranking is on profile visits per 1,000 impressions, never reach.** On every account measured,
   the highest-reach post had the worst engagement rate.
4. **A losing persona's file is kept, with what it cost.** Deleting the record means the next person
   re-runs the same test. `growth-log.md` exists for the same reason.

## The one measurement that matters first

Every persona is judged against **the same creative without a presenter**. Cells 1 and 2 of the
week-one grid are that pair: same avatar, same hook, one with her and one text-on-still.

**If the no-presenter cell wins, the answer is not a different persona.** It is no persona, and the
credits go somewhere else. A registry that cannot produce that conclusion is not measuring anything.

## File shape

`NN-shortname.md`, numbered in the order they entered rotation:

```
# Persona NN — <name>

| | |
|---|---|
| soul_id | <recorded at training, or the asset cannot be reused> |
| Trained from | <brief file> |
| Targets | Avatar <A-D> from ad-matrix-and-avatars.md |
| Hypothesis | <what we expect and why> |
| Entered rotation | <date> |
| Status | proposed / training / live / retired |
| Retirement condition | <stated BEFORE it runs> |

## Results
| Date | Asset | Impressions | Profile visits | PV/1k | Replies | Saves |

## Verdict
<Kept or retired, on what evidence, and what it cost.>
```

## Live

| # | Name | Status | Avatar | soul_id |
|---|---|---|---|---|
| 01 | The street presenter | **proposed** | A — The Reclaimed Weekend | not yet trained |

Brief: [`../ai-presenter-brief.md`](../ai-presenter-brief.md).
