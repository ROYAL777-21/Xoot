# Idea log — what the company's own data suggests doing next

Output of **loop 4** in `automation-loops.md`, armed 2026-09-03 as
`trig_01GZkAWJCuPdpx49s8ifdpXG`, firing Sundays 17:00 SAST.

**Append-only.** Nothing here is ever edited or deleted, including ideas that were rejected or that
turned out wrong. A log that quietly loses its bad entries teaches nothing, and this repo has already
been misled once by a document that asserted a cleaner state than the code was in.

---

## How to read an entry

Each entry is **at most five ideas**, ranked, each carrying:

| Field | What it must contain |
|---|---|
| **Idea** | One sentence. If it takes three, it is two ideas |
| **Evidence** | A quote from a file in the repository. Not a feeling, not a trend |
| **Cost** | Rough, honest, and including the founder's time — which is the scarce input |
| **Blocked by** | Named, or the word `nothing` |
| **Verdict** | `PROPOSED`, or `KILLED —` followed by which claim rule killed it |

⚠️ **Rank against the binding constraint, never against novelty.** Per
`growth-strategy-2026.md`, read from five full transcripts: a done-for-you service business is
**supply constrained**, so an idea that adds Xooter supply outranks an idea that adds customer
demand, even when the demand idea is more interesting.

⚠️ **Zero ideas is a valid entry.** The prompt says so in those words, because a loop with a quota
learns to invent the last one. A week where the honest answer is *"nothing the data supports"* should
produce one line saying that.

### The four rules that kill an idea before it is written down

1. **Price** — `locked-commercial-facts.md` §Current Pricing Conflict is **OPEN**. No idea states a
   number until it closes.
2. **CPA s41** — no outcome claim, no testimonial, no implied completed job. **Zero bookings have
   completed.** Intent is irrelevant under s41; the representation is the offence.
3. **LRA s200A** — nothing recruitment-facing, until employment classification is settled.
4. **Locked facts** — an idea that contradicts `locked-commercial-facts.md` needs a decision-log
   entry first, not a clever workaround.

---

## 2026-09-03 — seed entry, written by hand

Written in-session rather than by the loop, so the first firing has a format to follow and something
to compare against. Sources: `git log` (23 commits today), `growth-strategy-2026.md`,
`launch-protocol.md`, `NEEDS-FOUNDER.md`.

### 1. Settle LRA s200A, because it is blocking the primary growth channel — `PROPOSED`

**Evidence** — `growth-strategy-2026.md`, from the masterclass transcript:

> *"you will almost always be **supply constrained** in this business model"*

and, in this repo's own words, the consequence:

> ⛔ *"Nothing recruitment-facing may publish until employment classification is settled under LRA
> s200A. The most important growth channel in the business is waiting on one legal decision."*

**Cost** — one attorney consultation. **Blocked by** — nothing but the founder booking it.
**Why it is first** — every other supply-side idea is downstream of it. Ranking anything above it
would be ranking against the constraint.

### 2. Move `xoot.co.za` DNS off GoDaddy Website Builder — `PROPOSED`

**Evidence** — `launch-protocol.md` gate 2, and the measured fact recorded in the worklog: both
Netlify and Vercel hold correct production builds of the current site and **receive zero traffic**,
because the apex serves a GoDaddy Website Builder page.

**Cost** — minutes, in the GoDaddy DNS panel. `docs/release/godaddy-to-netlify.md` is the click-path.
**Blocked by** — founder access only. ⚠️ **Every marketing draft in `drafts/` is downstream of this.**
A campaign pointing at a domain that serves someone else's page is spend converted into confusion.

### 3. Ghost products in the booking flow — `PROPOSED`

**Evidence** — the highest-engagement reference of the five (3.71%, 22.66× outlier):

> *"I said: hey, by the way, you can get this one cheaper down the street at Costco… As soon as I
> made that switch, **everyone bought what I recommended afterwards**."*

**Cost** — a product change, not a copy change: the quote surface and the concierge both need to be
able to say *"you need less than you selected."* Days, not hours.
**Blocked by** — founder decision. ⚠️ It is the honest inverse of `serviceFit()`, which already
re-prices in the **over-stating** direction; this would be the first mechanism that deliberately
moves a total **down**.

### 4. Pay above the R47/h floor rather than at it — `PROPOSED`

**Evidence** — `growth-strategy-2026.md` §5, and the floor's own history: `LONG_JOB_FLOOR_CENTS_PER_HOUR`
exists because the ladder went sub-linear and pushed a Xooter's return under the national minimum
wage at 35% commission.

**Cost** — real and recurring, and it trades directly against `DISCOUNT_FUNDING` and the referral
credit. **Blocked by** — founder decision. ⚠️ **This one has a number attached**, so if it is acted
on it goes through the decision log and `locked-commercial-facts.md`, never straight into code.

### 5. `KILLED — CPA s41` — "post a before/after of a real Xoot clean"

The obvious first marketing asset, and it cannot be made. **Zero bookings have completed**, so there
is no real Xoot clean to photograph. An AI-generated before/after is an **illustration, not
evidence**, and presenting one as a job that happened is a misleading representation under s41 —
where intent is explicitly irrelevant. `marketing-studio-briefs.md` carries this boundary at the top
for the same reason.

**Recorded rather than dropped.** It becomes available the day a real booking completes with the
customer's written, withdrawable POPIA consent — and it will be one of the strongest assets Xoot has.
Killed today; not killed forever.
