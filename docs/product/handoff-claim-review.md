# Handoff claim review — the founder's one-pass ruling list

The founder instructed on 2026-09-05: **port the 2026-09-03 handoff's copy verbatim and flag what
is unbacked**, rather than rewriting each claim as it is reached (which is what the five sections
ported before this did).

This file is that flag list, and it is **executable**. `src/lib/handoff-claim-review.test.ts`
reads the table below and fails if:

- a `PENDING` or `APPROVED` claim is **not** actually in the file it names — the ledger has gone
  stale and is describing code that no longer exists;
- a `REWRITTEN` claim is **still** in the file — the ruling was recorded but never applied;
- **any row is still `PENDING`** — the release gate. This is the failure that says the branch is
  not shippable yet, and it names every outstanding ruling in one message.

> ⚠️ **Do not make the suite green by editing this file.** The gate exists because an unbacked
> safety or money claim on the public site is a Consumer Protection Act problem, not untidiness.
> Green comes from a ruling, applied.

## How to rule

For each row, pick one and tell the session:

- **Keep it** → status becomes `APPROVED`, and the words stay exactly as the handoff wrote them.
  Only choose this where the claim is actually true today and you can evidence it.
- **Rewrite it** → status becomes `REWRITTEN`, the source moves to the approved wording in the
  last column, and the guard then checks the handoff's words are *gone*.

## The ledger

| ID | Status | File | The handoff's words | Why it is unbacked | Approved wording |
|---|---|---|---|---|---|
| HIW-01 | PENDING | `src/components/xoot/HowItWorks.tsx` | `About a minute.` | A speed claim about the booking flow with no measurement behind it. Nothing in the repo times the flow, and the booking composer's length depends on service, property and add-ons. | `It takes a few minutes.` |
| HIW-02 | PENDING | `src/components/xoot/HowItWorks.tsx` | `Every Xooter is background-checked` | 🔴 The claim the repo deliberately reworded on 2026-09-02. "Background-checked" names or implies a third-party screening bureau, and no such commercial relationship is evidenced anywhere in this repo. `SafetyTrust.tsx` carries the reasoning in a comment block; `PeopleBand` was reworded for the weaker word "vetted" alone. | `Every Xooter is admin-reviewed before activation` — no Xooter is activated until an admin has reviewed their ID, selfie, proof of address, banking details and references. |

## Carve-outs — already decided, not pending

These are **not** in the table because they were never ported, so there is no source to check.

### XootCover — not ported, and the handoff forbids itself

`design/handoff-2026-09-03/xoot/app/Profile.jsx:263` reads *"XootCover is built into the price of
every Xoot visit. There's nothing to tick, nothing to add, and no separate charge."*
`Booking.jsx:611` reads *"XootCover is included."*

Three things make this un-portable rather than merely unbacked:

1. **It states a charge that is false.** The server bills `BOOKING_COVER_CENTS` = R22 as an
   optional line and `BookingConfirm.tsx:333` already renders it as its own row. "No separate
   charge" is the under-stating direction, which is the direction this repo has shipped wrong
   three times.
2. **`locked-commercial-facts.md` mandates different wording** — `Booking Cover by Genric`, R22,
   optional, Xoot is not the insurer, claim approval is never guaranteed.
3. **The handoff forbids it in its own voice.** `Xoot Legal.dc.html:522`: *"XootCover is not yet
   in force… nothing on this page is insurance and it should not be described as insurance
   anywhere on the site or in the app."*

The one line of the handoff's cover copy that is worth keeping, and is: *"Xoot is not the insurer,
and cover is subject to the policy terms — we'll always help you lodge a claim, but approval sits
with the insurer."*

**Reversible.** Say so and the lines go in verbatim like everything else, and into the table above.

### Sections not ported at all

- **`Reviews`** — zero bookings have completed, so any review on the page is a fabricated
  testimonial under CPA s41.
- **`BugBounty`** — safe harbour, two response SLAs, a disclosure window and R15 000–R40 000
  rewards, with no team, hours or budget behind any of them. `NEEDS-FOUNDER.md` §12.
- **`SafetyTrust`** — the handoff's *layout* is portable; its *words* are not. The repo's wording
  was set on 2026-09-02 after the previous version overstated screening.
