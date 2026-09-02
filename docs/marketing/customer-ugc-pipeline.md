# Customer UGC — consent, capture, and where it lives

Written 2026-09-02, at the founder's request, so it is ready the day bookings exist rather than
built in a hurry afterwards.

---

## Why this is worth building before there is anything to capture

**Real customer content is the asset that cannot be manufactured later.** `launch-protocol.md`
gate 6 asks for 10–20 friendly bookings precisely for this, and the reasoning is now backed from two
directions:

> *"in my earlier days I would spend so much time on my promise… and I wrote a whole book on
> promises, which is basically offers… the offer is super important, but the only thing that's more
> important is proof."* — Hormozi, read in full in `growth-levers-2026.md`

**The first ten cleans happen once.** If nobody asks for consent at the time, that footage does not
exist and cannot be recreated — a customer will not re-stage a clean six weeks later for a camera.

**So the pipeline exists now and stays dormant.** The cost of having it ready is one form and one
script. The cost of not having it is the first ten bookings.

---

## ⚠️ POPIA, and why the form is not a formality

A photograph or video of an identifiable person is **personal information** under South Africa's
**Protection of Personal Information Act**. Their home interior, in context, arguably is too.

Consent under POPIA must be **voluntary, specific and informed** — which rules out three things
people do by default:

| Don't | Why |
|---|---|
| Bury it in the booking T&Cs | Not specific. Consent to a service is not consent to be filmed |
| Ask "can I post this?" over WhatsApp and screenshot the yes | Not informed. It does not say where, for how long, or how to withdraw |
| Treat consent as permanent | POPIA gives a **right to withdraw**. The pipeline must be able to honour it |

⚠️ **Extra care where a child, a domestic worker, or another person is visible.** Consent from the
customer is not consent from everyone in the frame. **Frame them out, or get separate consent.**

⚠️ **Never film a Xooter without their own written consent.** They are the people with the least
power in the transaction and the most to lose. A Xooter who feels unable to say no has not consented.

---

## The consent form

Plain language on purpose — a form nobody understands is not informed consent. Digital or paper;
both work if it is signed and stored.

> **Xoot — permission to use photos and video**
>
> We would like to use photos or video from your clean in Xoot's marketing. This is completely
> optional, and saying no changes nothing about your booking, your price, or your service.
>
> **What we would use:** photos and/or video taken on ____________ at your home, and any written or
> spoken comments you choose to give us.
>
> **Where we would use it:** Xoot's website, and Xoot's accounts on TikTok, Instagram, Facebook, X,
> LinkedIn and YouTube. We may also use it in paid advertising on those platforms.
>
> **How you will be identified:** please choose one —
> ☐ My first name only ☐ My first name and suburb ☐ No name at all
>
> **How long:** two years from the date above, unless you tell us to stop sooner.
>
> **Changing your mind:** you can withdraw at any time by emailing ____________. We will stop using
> it within 7 days and remove it from anything we control. **We cannot recall a copy someone else
> has already saved or shared**, and we want you to know that before you sign rather than after.
>
> **What we will never do:** put words in your mouth, edit your comments so they say something you
> did not mean, show your street number or anything that identifies your address, or pass this to
> anyone outside Xoot.
>
> Name: ____________ Signature: ____________ Date: ____________
> Contact for withdrawal: ____________

⚠️ **The "cannot recall a shared copy" line stays in.** It is the sentence most brands leave out and
the one that makes the consent genuinely informed.

---

## The ask, and when

**After the clean is finished and they have seen it. Never before.** Asking up front makes the clean
feel like a performance, and a customer who feels performed at gives a worse clean review and a worse
piece of footage.

**Script, for the founder or an ops person — not the Xooter:**

> *"Glad it worked out. One thing, and it's a genuine no-problem-if-not: we're just starting out, so
> real customers' words are worth more to us than anything we could write ourselves. Would you be
> open to a couple of photos, or thirty seconds of you saying what you thought? You choose whether
> your name appears at all, and you can pull it any time."*

**Why the Xooter never asks.** They depend on the rating. A request from the person who just cleaned
your home is not a free choice, and consent that is not free is not consent.

**If they hesitate, stop.** A reluctant yes produces unusable footage and a customer who feels
managed.

---

## What to capture, in priority order

1. **Thirty seconds, phone-shot, unedited, of them answering one question.** *"What made you book,
   and did it do what you wanted?"* Unpolished beats produced here — it is the only kind of content
   Xoot can currently make that no competitor can fake.
2. **Before and after of one room**, same angle, same framing. ⚠️ Requires the before shot, so ask
   at booking whether they would be open to it, then get the signed form afterwards.
3. **A written line**, if they will not be filmed. Quoted verbatim, attributed as they chose.

**Never:** re-shoot, re-stage, or ask for a second take that sounds better. The value is that it is
real; a directed customer is a paid actor without the paperwork.

---

## Where it lives

```
docs/marketing/ugc/
  consent/     signed forms, one per customer, named <date>-<first-name>
  raw/         original files, untouched
  approved/    cleared for use, with the consent reference in the filename
  withdrawn/   moved here on withdrawal, never deleted — proof of when use stopped
```

⚠️ **Nothing moves to `approved/` without a signed form in `consent/`.** The check is: can you name
the file that permits this asset? If not, it does not ship.

⚠️ **`withdrawn/` retains rather than deletes** — the record that use stopped, and when, is the
evidence you would need. The asset stops being used; the audit trail does not stop existing.

⛔ **Do not commit customer media to this repository.** The directory structure is the convention;
the files belong in private storage. A public repo is not a consent-managed store, and this repo has
a secret scanner precisely because things end up in git that should not.

---

## Ready-state checklist

Nothing here is blocked on the site, the plan, or the domain. It is blocked only on there being a
customer.

- [ ] Consent form finalised and hosted somewhere signable
- [ ] Withdrawal email address created and monitored
- [ ] Storage created, outside this repository
- [ ] The ask script practised once, out loud, before the first real clean
- [ ] Whoever asks is **not** the Xooter who did the work
