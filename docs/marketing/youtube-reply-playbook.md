# YouTube replies, in the company voice

Written 2026-09-04 at the founder's request: *"I want the agent to respond to youtube comments in
the company voice."*

## ⚠️ Two things to know before using this

**1. There is nothing to reply to yet.** `drafts/youtube-channel-setup.md` has the channel as
*"reserved, dormant — claim the handle, post nothing."* No video, no comments.

**2. ⛔ `community-responder` cannot read or post to YouTube.** Its tools are
`Read, Grep, Glob, Bash, Skill` — there is no YouTube API tool in this repository, and no credential
for one. **The loop is not closed and nobody should assume it is.**

So this file is the thing that works on the day there is something to answer: the register, the
classes of comment Xoot will actually get, and the escalation rule. A human pastes the replies until
a YouTube tool exists.

---

## The voice

The same one the site is written in. Warm, calm, specific, slightly plain. It is the voice of
someone who does this for a living and is not selling you anything in this particular sentence.

| Do | Don't |
|---|---|
| Answer the actual question first, in the first line | Open with "Great question!" |
| Give a number or a name where one exists | Say "it depends" and stop |
| Say "we don't do that yet" plainly | Imply a roadmap that does not exist |
| Sign off as Xoot, not as a person | Invent a named support agent |
| One or two sentences | A paragraph with a CTA at the end |

⚠️ **You are answering the lurkers.** Most people who read a reply did not write the comment. A
reply that satisfies the commenter but reads as defensive to everyone else is a loss.

⛔ **Banned, from `BRAND_GUIDE`:** `cheap`, `budget`, `discount`, `bargain` as positioning.
`marketing-claim-rules.test.ts` enforces the same rule on drafts.

---

## The seven classes, with the reply pattern

### 1. "How much is it?"

✅ Answerable, since ZD-037 closed the pricing conflict. **State the price with its hours** — a bare
figure is the thing the guard exists to prevent, because "R250 a clean" is a promise the four hours
are what make true.

> A standard home clean is four hours at R250, plus a R39 booking fee. The app prices it before you
> book — you see the total, and that is the total.

⛔ Never quote a Care+ cadence discount. `create-booking` applies a flat 10% and ignores cadence;
the 15%/10%/5% table in `care-plus.ts` is not what the server does.

### 2. "Is it safe? / Who are these people?"

**This is the most important class and the one to answer at length.** `hormozi-corpus-findings.md`:
Perceived Likelihood is the binding term in this market — *she is risk-sensitive before she is
price-sensitive*.

Answer with mechanism, not reassurance. Mechanisms Xoot actually has:

> Every applicant is reviewed by a person before they can take work — ID, selfie, proof of address,
> banking details and two contactable references. You can see who is coming before they arrive, and
> the completion button stays off until both the before and after photographs exist.

⛔ Do **not** say "MIE screened" or name a screening bureau. There is no contract with one — it was
removed from the homepage on 2026-09-02 for that reason.

### 3. "Are you in my area?"

Name the real list, and say plainly what happens if they are outside it. The launch suburbs are in
`src/lib/operations.ts` — **read them, do not recall them.**

> Not yet — we are live in selected Johannesburg suburbs while we build the roster out. Put your
> address into the app and it will tell you straight away rather than taking a booking we cannot
> fill.

⛔ Never imply a timeline for a suburb. Gate 5 is supply-before-demand and there is no expansion
date to give.

### 4. "How do I become a Xooter?"

⚠️ **Answer the question, state no earnings figure.** Under **LRA s200A** the employment
classification is undecided (`held-content/xooter-earnings.md`), and a comment reply is the worst
possible place to make a representation about someone's income.

> Applications are open — the link is in the description. You keep 65% of the booking value from
> your first job, rising as you complete work and hold a strong reliability score. We do not
> guarantee a number of bookings, so what you earn depends on how many jobs you accept.

The commission percentages are safe: they are structural facts from `COMMISSION_BANDS`, not income
claims. **A monthly total is not.**

### 5. A complaint about a specific booking

Take it off the thread in one reply, and do it without sounding like you are hiding.

> That is not how this should have gone and I would like to fix it. Can you send the booking
> reference to support in the app — it comes straight to us and I can see the whole job from there.

⛔ Never discuss the details of a booking publicly. It is another person's personal information
under POPIA, and the Xooter has rights here too.

### 6. Hostility, or a bad-faith comment

Reply once, briefly, without matching the register. Then stop. **Do not reply twice** — the second
reply is what turns a comment into a thread everyone reads.

If it is abusive rather than merely rude, hide it and move on. Hiding is not censorship of criticism;
criticism gets answered under class 5.

### 7. Praise

A real thank-you, one line, **no CTA attached.** Appending "book now!" to someone being nice is the
fastest way to make the next person not bother.

---

## ⛔ The escalation rule — the only hard stop

**Any allegation touching safety, theft, assault, harassment, or a child goes to the founder AND
into `admin_review_queue`. It is never answered publicly, and never by an agent.**

This is already the standing rule in `.claude/agents/community-responder.md` and it is restated here
because YouTube comments are the surface where such an allegation is most likely to arrive in public,
from someone who is not a customer, about a Xooter who cannot answer.

Public acknowledgement, one line, then nothing further:

> Thank you for telling us — this is going to the founder directly now. Please send anything you can
> to the support address so we have it in writing.

⛔ **No apology that concedes a fact, no denial, no explanation.** Both an admission and a denial are
statements about an incident nobody has investigated yet.

---

## What would close the loop

A YouTube tool for `community-responder` — read comments, post replies — plus a credential. Until
then this is a paste-buffer, and the agent's frontmatter says so.
