# Feature announcements — the pipeline

Written 2026-09-02. Xoot ships constantly and announces almost none of it. This is the rule for what
earns an announcement, the format per platform, and the backlog.

---

## ⚠️ The rule that governs every announcement

**Announce a capability a customer can use today. Never one behind a readiness constant.**

This repo's documented failure mode is optimism stated as present fact — *"in eight days this
codebase produced nine defects where a document asserted something worked and it did not"*
(`founder-voice.md`). An announcement is that failure with an audience.

**Before drafting, check whether the feature is gated:** `TIP_READINESS`, `SAFETY_READINESS`,
`canOfferTip`, `canArmSos`, and the `payment_provider_capabilities` row. If any gate is shut, the
feature does not exist publicly, whatever the code does.

✅ "We're building toward X" · ❌ "We have X" when X is gated.

---

## The three tests an announcement must pass

1. **Can a customer do it today?** If it needs a flag flipped, a credential set, or a deploy that has
   not happened, it is not an announcement — it is a roadmap post, and it goes on the founder
   account in future tense or nowhere.
2. **Does it change what someone does?** "We refactored the pricing module" changes nothing for a
   customer. "You can now split the fare with whoever you're sharing the clean with" does.
3. **Is every number in it locked?** Prices come from `locked-commercial-facts.md`, which changes
   only through a decision-log entry. A post is not a place to round a price.

---

## Format, per platform

| Platform | Shape | Length |
|---|---|---|
| **Facebook Page** | Plain sentence + one screenshot. Warm, calm, practical | 2–3 sentences |
| **Instagram** | Single still, feature named in the first line, detail in the caption | Caption ≤ 3 lines |
| **TikTok** | **Screen recording of the feature working.** Not a graphic | 12–20s |
| **X — company** | One line, one screenshot. Changelog register | 1 line |
| **X — founder** | Why it was built and what it cost. Different register entirely | 2–5 lines |
| **LinkedIn** | The founder version, more context, for someone who has read nothing | 1 paragraph |

⚠️ **Company and founder registers are never blurred.** The company account is warm, calm and
practical (`BRAND_GUIDE` §Copy Tone). The founder account is futuristic and sharp. A founder draft
is never reused as company copy.

---

## The backlog — shipped, unannounced

Drawn from the decision log and the commit history. **Each row's gate must be re-checked before
drafting**, because this table is a snapshot.

| Feature | Customer-visible? | Gate | Announce? |
|---|---|---|---|
| **Fare splitting** — split a booking with whoever shares the clean | Yes | None found | ✅ **Strongest candidate.** Concrete, unusual, easy to screen-record |
| **Proximity matching** — Xooters matched by suburb centroid | Yes, indirectly | Live in `ai-match` | ✅ Good. It is also the recruitment argument: travel is the biggest unpaid cost in this industry |
| **Favourite-Xooter continuity** — "Book Nomsa again" | Yes | ⚠️ Verify before claiming | 🟡 Verify first |
| **XootCred** | Yes | Redemption path live | 🟡 Check the ledger works end to end |
| **Care+ membership** — R99/month, booking fee waived | Yes | Live | ✅ But **never** the word `discount` — it is the member rate |
| **Commission ladder** — Xooters keep 65% → 80% | Xooter-facing | Live | ✅ **Recruitment, not customer.** Belongs in the hiring ad |
| **14-day earnings boost** | Xooter-facing | Live, granted manually | 🟡 Only once granted to a real Xooter |
| **Voice calling in-app** | Yes | ⛔ **Four of five gates shut** | ❌ **Do not announce.** No call has ever connected |
| **SOS** | Yes | ⛔ `SAFETY_READINESS` | ❌ Four prerequisites unanswered. A safety button that does nothing is worse than none |
| **Tipping** | Yes | ⛔ `TIP_READINESS` | ❌ |
| **PayFast checkout** | Yes | ⛔ No merchant account | ❌ Gate 3 |

**Two rows worth reading twice.** Voice and SOS are built, look finished, and are the two most
tempting things on this list to announce. Both are shut, and SOS is a safety feature — *"a person in
trouble pressing something that does nothing is worse than no button"* (`NEEDS-FOUNDER.md` §6).

---

## The first three to draft, in order

1. **Fare splitting.** Concrete, unusual in this category, screen-recordable, and nothing gates it.
2. **Proximity matching.** Does double duty — a customer benefit and the strongest recruitment
   argument Xoot has, because travel between jobs is reportedly the largest unpaid cost incumbent
   workers carry.
3. **Care+ member rate.** Locked at R99/month with the booking fee waived at every frequency. Watch
   the vocabulary: `BRAND_GUIDE` bans `discount`, and Care+ *"is not a discount plan"* by its own
   definition.

⛔ **All three wait for the site to be reachable.** An announcement whose link goes to a GoDaddy
placeholder is worse than no announcement.
