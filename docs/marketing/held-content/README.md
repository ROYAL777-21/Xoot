# Held content — written, and deliberately not publishable

The founder, 2026-09-04:

> *"I don't intend to publish content that says we can do things we haven't validated on our side
> yet. I want to have the content ready for when that becomes a reality. So please still proceed in
> making it."*

That is exactly right, and it is why this directory exists rather than the work simply not being
done. Everything here is **finished copy** waiting on a **named gate**. It is not a scratchpad and
it is not a backlog of ideas — a file lands here only when it could be posted the day its gate
clears, unchanged.

## The rule

**Every file opens with a banner naming the one thing it waits on.** The banner is what excludes it
from the publish checklist — not the file being incomplete, and not somebody remembering.

⚠️ **Held ≠ sloppy.** The temptation is to leave a held draft half-written because "it can't ship
anyway". That guarantees a scramble on the day it can, which is the day there is least time.

## What is here

| File | Waits on |
|---|---|
| `gift-campaign.md` | The redemption path, the refund path, PayFast, and the **CPA s63** expiry decision |
| `customer-proof.md` | Gate 6 (a completed booking) **and** signed POPIA consent from the customer |
| `xooter-earnings.md` | The **LRA s200A** employment-classification answer |

## ⛔ Why these are held and not just unwritten

Each of these is a claim about something Xoot cannot currently do. Under **CPA s41** a
representation is misleading regardless of intent, and this repository has already shipped a screen
showing one price and charging another three times. The gap between "we intend to" and "we do" is
where that class of defect lives, and a marketing directory is exactly where it gets crossed by
accident.

`marketing-claim-rules.test.ts` scans `docs/marketing/**` — including this directory — so a rand
figure in here still has to be one `basePrice()` produces. **The guard does not know a file is held.
That is deliberate:** a held draft with a wrong price becomes a published one with a wrong price the
moment its gate clears.
