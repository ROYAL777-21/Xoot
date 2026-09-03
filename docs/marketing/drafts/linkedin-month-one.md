# LinkedIn — month one, four posts

**`VOICE: UNCALIBRATED`.** One a week, repurposed from X. **Not a copy-paste** — same substance,
different room. The LinkedIn reader has not seen the X post and does not have the context the X post
assumes.

**The highest-value use of this account is not the feed.** It is being findable and credible when a
cleaning training school, a corporate facilities manager, or a prospective Xooter looks up whether
Xoot is a real company. Write for that reader, who arrives via search and reads three posts.

⛔ **Nothing recruitment-facing** until employment classification is settled under **LRA s200A**.
That includes "we're hiring soon" and "join the waitlist" framings.

---

## LI-01 — Week 1 · from X week-one day 1

> **We shipped a deployment check that ran for three minutes and reported ten.**
>
> The comment above it said the check would poll for roughly ten minutes before giving up. The code
> said `attempts=12`, `delay=15`.
>
> Eleven waits of fifteen seconds is two minutes and forty-five seconds. Our build takes longer than
> that.
>
> So the check had never once observed a completed deployment. It polled, found nothing, and exited
> down a branch that printed a reassuring message about the missing build stamp probably being fine.
> Green tick, every time, for three weeks.
>
> Two things I took from it.
>
> **A comment is a claim with nothing behind it.** We treat comments as documentation, but they have
> the same standing as a rumour — someone said it once and nobody checked since. I read that file
> twice while investigating something else and never multiplied twelve by fifteen.
>
> **The reassuring message was worse than the bug.** A check that fails loudly gets fixed the same
> day. A check that passes gets ignored. But a check that passes *while explaining why its own
> inconclusive result is acceptable* recruits the reader into not investigating. It does the
> rationalising for you.
>
> We removed that message. The inconclusive branch now says what is true: it observed nothing and
> therefore knows nothing.
>
> If you have a check you would point at to prove something important holds — go and break the thing
> it protects, and watch what it does.

`APPROVE / EDIT / KILL`

---

## LI-02 — Week 2 · from X3-01 and X3-02

> **Our domain served someone else's placeholder page for three weeks, and every dashboard we owned
> said it was fine.**
>
> We deploy to Netlify. Netlify's API reported the domain, `state: ready`, `context: production`. Our
> Vercel project reported `target: production`, `state: READY`. Both hosts held a correct, current
> build.
>
> Both were unreachable. DNS pointed at a GoDaddy Website Builder site published on the apex domain,
> so neither host received a single request.
>
> The trap is completely generic and worth stating carefully:
>
> **`ssl_url: https://yourdomain.com` does not mean "this host serves that domain."** It means "this
> host is configured to serve that domain *if a request arrives*." A hosting provider can only tell
> you about itself. It has no idea where your DNS points and no reason to check — from its
> perspective everything is correct. It is ready. It is simply never asked.
>
> The only instrument that settles it is a request from outside, and reading the response body rather
> than the status code.
>
> The part I find hardest to write: our founder told me three times that he had changed configuration
> in the hosting dashboard and nothing on the site changed. I treated it as a caching question. It
> was the finding, stated plainly, weeks early, by the person with the least technical context and
> the most direct evidence.
>
> If you run a production site, fetch it from a terminal today and read what comes back. Four
> seconds, and I would no longer assume.

`APPROVE / EDIT / KILL`

---

## LI-03 — Week 3 · from X2-06

> **We built the same pricing rules twice, and they disagreed three times.**
>
> Our app shows a price on the confirmation screen so a customer knows what they are agreeing to. Our
> server calculates it again when the booking is created, because a price the client sends is a price
> the client can edit.
>
> That is the correct architecture. It also means the same commercial rules are implemented twice, in
> two languages, in two files, edited months apart by people who were not thinking about each other.
>
> Three separate times we shipped a screen showing one total and a charge taking another.
>
> In South Africa this is not a tidiness problem. Under the Consumer Protection Act the displayed
> price *is* the price — show a total and exceed it at checkout and that is a misleading
> representation, regardless of intent. Under-charging loses money. Over-charging is a legal
> exposure. They are not the same risk and should not get the same default, so ours now round in the
> direction that over-states.
>
> The fix was not "be more careful." Being careful had already failed three times, and a rule that
> depends on vigilance works until someone is tired.
>
> We wrote a test that imports both implementations, runs them across a grid of inputs, and fails the
> build if any pair disagrees. Not a snapshot of expected values — that is just a third place to be
> wrong. A direct comparison of the two things that must agree.
>
> **The general principle: when correctness means two things agree, test the agreement, not the
> things.** We already had good tests for each half. They both passed. The defect lived in the gap,
> and a test of either half cannot see a gap.
>
> This applies well beyond pricing — validation in the form and again in the API, permissions in the
> UI and again in the database, a state machine mirrored between a mobile app and a backend.

`APPROVE / EDIT / KILL`

---

## LI-04 — Week 4 · from X4-05, written for the operator reader

> **A marketplace has to solve supply before demand, and every shortcut past that is expensive.**
>
> We are building Xoot, a home-services company in South Africa. Customers book, professionals — we
> call them Xooters — do the work. There is nothing novel about the model, and the hard part was
> never the software.
>
> The hard part is that a marketplace needs supply before demand, and supply here is people whose
> income you are affecting.
>
> If a customer books and there is nobody to send, you have not lost a booking. You have produced a
> person who tells other people. There is a figure I keep coming back to: bad word of mouth means
> reaching roughly **three times as many people** to acquire the same customer. So the cost of that
> failure is not the booking — it is the acquisition cost of everything after it.
>
> Which sets the launch order, and it is less exciting than the alternative:
>
> **Enough professionals, activated, in one suburb. Then customers in that suburb. Then the next
> suburb.**
>
> Not a national launch. Not a waitlist. Not paid acquisition before the first ten customers are
> genuinely happy — I have tried to construct the argument for that and cannot.
>
> The uncomfortable consequence is that the gate that looks most compressible is the one that is not.
> Supply looks like a recruiting problem you can solve with a bigger ad budget. It is actually a
> trust problem, and trust does not compress.
>
> If you have run a two-sided marketplace and think I have this wrong, I would genuinely like to hear
> it.

`APPROVE / EDIT / KILL`

---

## Notes

⚠️ **LI-04 is the only one written for the LinkedIn audience rather than translated for it**, and it
is the one most likely to reach a training school or a facilities manager — the readers who actually
matter on this platform. If only one of these ships, ship that one.

⚠️ **No post here contains a price, a capability behind a readiness constant, an income claim, or a
customer story.** LI-03 discusses pricing at length and names no number, deliberately: the locked
document and the deployed server currently disagree, and until they are reconciled any figure risks
being the wrong one.
