# ⛔ HELD — the gift campaign

> ## This cannot be published yet
>
> **Waits on four things, all of them absent today:**
>
> 1. **PayFast merchant credentials.** `ops-workflow/index.ts` stamps every gift order
>    `provider_required: "PayFast credentials not connected"`. **A gift cannot be paid for at all.**
> 2. **A delivery path.** Nothing sends a card, a link or an email to a recipient.
> 3. **A redemption path.** No writer sets a gift to `redeemed`; credit cannot be spent.
> 4. **The CPA s63 expiry decision.** s63 governs unredeemed prepaid vouchers and credit. The
>    "never expires / refundable to the sender" promise below is a **money commitment**, and it is
>    the founder's to make with an attorney — not a copy decision.
>
> The homepage `GiftClean` section ships today with none of these claims. This file is what it says
> when they are true.

---

## Why this campaign is worth holding rather than dropping

The founder's brief asked for the launch video to *"clearly target different people, young
professionals, older people helping each other out by gifting each other a clean"*, and gifting is
the one Xoot product with a genuinely intergenerational shape: the buyer and the beneficiary are
different people, usually a generation apart, and the purchase is an act of care rather than a
convenience.

That is rare and it is defensible. It is also the reason the claims matter more here than anywhere
else — someone buying a gift is spending money on behalf of a person who has no way to check what
was promised.

## The mechanic, once it is true

Four steps, in the sender's order. **Each line is a claim; the gate it needs is named.**

| Step | Copy | Needs |
|---|---|---|
| 1 | **You pay once, now.** The full amount, including their booking fee. Nothing is charged to them later, and there is no gifting markup — it is exactly what these cleans cost to book yourself. | PayFast |
| 2 | **They get a card, not a code.** By email or a link you send yourself. No app download to open it, no voucher number to type, no minimum spend. | Delivery path |
| 3 | **They pick the day and the Xooter.** The credit sits in their account. You are not booking a visit on their behalf. | Redemption path |
| 4 | **Unused credit comes back to you.** Until they book the first visit, you can ask for it back in full. | Refund path + **CPA s63** |

⚠️ **Step 4 is the one that sells it and the one most likely to be wrong.** "Never expires" and
"refundable in full" are the two statements a consumer tribunal would read first. Do not soften them
into vagueness when the gate clears — either they are true and stated plainly, or the step is cut.

## The occasions

Taken from the handoff, each with its own card wording, because — as the design puts it — *"a single
generic 'Enjoy the quiet.' under four different buttons makes the buttons decorative."*

| Occasion | Card says | The note under it |
|---|---|---|
| Mother's Day | *Happy Mother's Day* | "You have cleaned up after all of us for long enough." |
| A new baby | *Congratulations* | "One less thing. Sleep instead." |
| Moving in | *Welcome home* | "Start in a place that is already clean." |
| Just because | *No occasion* | "Go and sit down. It is handled." |

⛔ **The design's Mother's Day hint is cut and must stay cut**: *"the most-gifted day of the year on
Xoot."* Zero bookings have completed. There is no most-gifted anything, and inventing one is the
same fabricated-evidence class the `Reviews` section is excluded from the site for.

## The bundles

1 visit · 4 visits ("a month of Fridays") · 12 visits ("a season").

⛔ **Not offered on the live section**, because `gift_clean_orders` records no multi-visit
commitment — the choice would collect a preference the writer discards. Bundles need a schema
change, not just copy.

## The video, when it can be made

The intergenerational cut the founder asked for, in three beats:

1. A daughter in her twenties, at work, phone out. She is not buying a product; she is solving
   something she feels bad about.
2. Her mother's kitchen, some days later. The clean has happened. **No dialogue about the app.**
3. A phone call. The mother is mildly cross about the fuss and obviously pleased.

⚠️ **Natural, not high-energy** — the founder was explicit. South African English, and the register
of two people who know each other well, not of an advertisement.

⛔ Cannot be shot with a real customer until **Gate 6** and **signed POPIA consent**. Cannot be
generated with an AI presenter without the AI-generated marker `ugc-and-ads.md` requires.
