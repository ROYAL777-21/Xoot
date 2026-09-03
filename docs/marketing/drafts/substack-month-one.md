# Substack — month one, four essays

**`VOICE: UNCALIBRATED`.** Built against structure, not against how you actually sound. Correct
rather than approve.

⛔ **Not published, not scheduled.** Substack has no public posting API — every essay is a manual
paste, permanently. See `../platform-playbooks.md` § Substack.

**Publication name — you choose.** Drafts use *"Building Xoot"* as a placeholder. It is descriptive
and boring, which is right for a founder newsletter nobody has subscribed to yet.

**Cadence:** one a week. **Order:** SUB-01 first — it is the most self-contained and the least
dependent on anyone caring about Xoot specifically.

**Every essay ends with the same CTA**, and it is not "book a clean". At zero subscribers the job is
to be worth subscribing to.

---

## SUB-01 — "Our deploy check ran for three minutes and told us it ran for ten"

**~900 words. Week 1. Topic: a defect, with the arithmetic.**

---

> ### Our deploy check ran for three minutes and told us it ran for ten
>
> There is a specific kind of bug I have come to fear more than an outage, and it is the one that
> reports success.
>
> We have a workflow that runs after every deploy. Its job is to fetch the live site and confirm the
> thing we just shipped is actually the thing being served. It polls, because a deploy takes a
> minute or two to propagate, and the comment above it said it would keep trying for about ten
> minutes before giving up.
>
> Here is what it actually did:
>
> ```
> attempts=12
> delay=15
> ```
>
> Twelve attempts. Fifteen seconds between them. Eleven sleeps of fifteen seconds is **two minutes
> and forty-five seconds**. Call it three minutes.
>
> Our build takes longer than that.
>
> So the check had never once, in its entire existence, observed a completed deploy. Not a single
> time. It polled for three minutes, found no build stamp, and exited down a branch that printed
> something reassuring about the stamp probably not being configured yet, and returned zero.
>
> Green tick. Every time. For three weeks.
>
> ### The comment was the problem, not the code
>
> I want to be precise about the failure, because "we had a bug" is not the interesting part.
>
> The code was consistent with itself. `attempts=12` and `delay=15` are exactly what someone wrote,
> and they do exactly what they say. Nothing was broken in the sense of behaving unexpectedly.
>
> What failed was that **the comment above it claimed ten minutes**, and every person who read that
> file after that point read the comment and not the arithmetic. Including me. I read that file at
> least twice while investigating something else and never once multiplied twelve by fifteen.
>
> A comment is a claim with no test behind it. We treat it as documentation, but it has the same
> epistemic status as a rumour: someone said it once, and nobody has checked since.
>
> ### The reassuring message was worse than the bug
>
> The second half is uglier. When the check found no build stamp, it printed a line to the effect of
> *"no build stamp found — this is probably fine."*
>
> That sentence is why nobody looked for three weeks.
>
> A check that fails loudly gets fixed on the first day. A check that passes gets ignored forever. But
> a check that **passes while explaining why its own inconclusive result is acceptable** actively
> recruits the reader into not investigating. It does the rationalising on your behalf. You do not
> even get the small itch of "that's odd."
>
> I have deleted that message. The no-stamp branch now says what is actually true, which is that the
> check did not observe anything and therefore knows nothing.
>
> ### What we changed
>
> `attempts=20`, `delay=30`. That is ten minutes, which is what the comment said all along, and now
> the code agrees with it.
>
> It also prints the response body on the first and last attempt. Not the verdict — the body. That
> one change is the reason we found something much worse a day later, which is the next essay.
>
> ### The general version
>
> I do not think this is a story about a polling loop. I think it is a story about a category of
> check that exists to be pointed at rather than to be run.
>
> Three tests of whether you have one:
>
> **1. When did it last fail?** If the answer is "never", that is not a good sign — it is an
> unanswered question. Every check that is worth having has a defect it is designed to catch. Go and
> reintroduce that defect and watch it fail. If it does not fail, it was never checking.
>
> **2. Does it have a branch that exits successfully on inconclusive?** Almost every check I have
> written has one, because the alternative is noise. But every one of those branches is a place where
> "I do not know" gets silently converted into "fine."
>
> **3. Does the comment claim something the code does not do?** Multiply the numbers. It takes ten
> seconds and I now do it on sight.
>
> We have a rule in our repo now, and it is blunt: **plant the bug, watch it fail, then restore.** A
> guard test that has not been proven against the defect it describes is a comment with a green tick
> attached.
>
> Several of ours were exactly that. They asserted rules nobody had implemented, and they passed for
> weeks meaning nothing.
>
> ---
>
> *I am building Xoot, a home-services company in South Africa, mostly in public. This newsletter is
> the long version of what breaks and what it cost to find out. If that is your kind of thing, it is
> weekly and free.*

`APPROVE / EDIT / KILL`

---

## SUB-02 — "We spent three weeks fixing a website nobody was looking at"

**~1,000 words. Week 2. Topic: the GoDaddy discovery. This is the strongest story we have.**

---

> ### We spent three weeks fixing a website nobody was looking at
>
> Our domain had been serving a GoDaddy Website Builder placeholder the entire time. We found out
> yesterday. I want to write down how, because the trap that hid it is completely generic and I
> think a lot of people are in it right now without knowing.
>
> ### What we believed
>
> We deploy to Netlify. Netlify's API told us, when asked:
>
> ```
> ssl_url: https://xoot.co.za
> state: ready
> context: production
> ```
>
> We also had a Vercel project, for reasons that made sense at the time. Vercel's API said:
>
> ```
> target: production
> state: READY
> ```
>
> Both hosts. Both green. Both holding a correct, current build of `main`. And the domain in the
> response.
>
> I closed the "is the site live" item on that evidence. Then, when something still seemed wrong, I
> re-opened it, investigated, and **closed it a second time on a different piece of the same kind of
> evidence** — a deploy ID that had changed after a merge, which proved a new build existed and
> proved nothing whatsoever about who was serving it.
>
> ### What was actually true
>
> Eventually the deploy check printed the response body instead of its own verdict. One line:
>
> ```html
> <meta name="generator" content="Starfield Technologies; Go Daddy Website Builder 8.0.0000"/>
> ```
>
> There was a GoDaddy Website Builder site published on the apex domain. It had been there from the
> beginning. DNS pointed at GoDaddy, so every visitor got the placeholder, and neither host received
> a single request.
>
> Both builds were perfect. Both were unreachable.
>
> ### The trap, stated as generally as I can
>
> **`ssl_url: https://xoot.co.za` does not mean "this host serves that domain."** It means *"this
> host is configured to serve that domain if a request arrives."* Same for Vercel's
> `target: production, state: READY`. Same, I would guess, for every hosting provider's API.
>
> A host can only tell you about itself. It has no idea where your DNS points, and — this is the part
> that got me — it has **no reason to check**, because from its perspective everything is correct.
> It is ready. It is just never asked.
>
> **The only thing that settles it is fetching the URL from outside and looking at what comes back.**
> Not the status code. Not the headers. The body.
>
> ### Why it took so long, which is the actually embarrassing part
>
> Three things compounded.
>
> **A document said not to look there.** A file in our repo had carried the line *"DNS is fine. Do
> not touch GoDaddy"* since the middle of August. Somebody — me — wrote that after checking
> something adjacent, and from that point on it functioned as a wall. Every investigation reached it
> and turned around. I have corrected that line in place and **left the old text visible**, because
> the wrong sentence is the artefact worth keeping. It is what stopped three weeks of looking in the
> right place.
>
> **The check that would have caught it had been running for three minutes and exiting green** — the
> subject of last week's essay. The two failures were not independent. A weak check let a wrong
> document survive.
>
> **And the founder's own experience was misread.** He kept saying he changed environment variables
> in the hosting dashboard and nothing on the site changed. I treated that as a caching question. It
> was the actual finding, stated plainly, weeks early, by the person with the least technical context
> and the most direct evidence. Editing variables on a host nobody reaches changes nothing a visitor
> sees. He was right and I explained it away.
>
> ### What we changed
>
> The deploy check now **fails** — not warns — when the live page returns a `generator` meta that is
> not ours. It names the fix in the failure message.
>
> We planted it both ways before keeping it: it fires on the captured GoDaddy body, and stays silent
> on our own built `index.html`, which emits no generator at all and must keep the softer warning as
> the genuine still-publishing case. A check you have only seen pass is not a check.
>
> ### The uncomfortable general lesson
>
> I closed the same item twice on evidence that felt conclusive and was structurally incapable of
> being conclusive. Both times the evidence was real, current, and correctly reported by a system
> with no reason to lie.
>
> It was answering a different question than the one I was asking.
>
> "Is the site live?" is not a question any host can answer. It is a question about DNS, and about
> the world, and the only instrument that measures it is a request from outside.
>
> If you have a production site right now: open a terminal and fetch it. Read the body. It takes four
> seconds and I would not assume.
>
> ---
>
> *Building Xoot in public. Weekly, free, and mostly about things that were wrong.*

`APPROVE / EDIT / KILL`

---

## SUB-03 — "We shipped a screen that showed one price and charged another. Three times."

**~850 words. Week 3. Topic: client/server price parity.**

⚠️ **Checked:** states no actual price. The essay is about the *class* of defect and the guard, and it
works better without figures — the point is that two numbers disagreed, not what they were.

---

> ### We shipped a screen that showed one price and charged another. Three times.
>
> Not once. Three separate occasions, across three different parts of the product, before we
> understood that it was one bug wearing three costumes.
>
> ### The shape of it
>
> Our app quotes a price on the confirmation screen so you know what you are agreeing to. Our server
> calculates the price again when the booking is actually created, because a price the client sends
> is a price a client can edit.
>
> That is correct. You have to price on the server. Anything else is a trust boundary you have
> handed to the browser.
>
> But it means **the same commercial rules are implemented twice**, in two languages, in two files,
> maintained by people at different moments who are not thinking about each other. And the moment
> those two implementations disagree by a single rand, you have a screen that says one thing and a
> charge that says another.
>
> Ours disagreed. Repeatedly.
>
> ### Why this is not a rounding problem
>
> In South Africa the Consumer Protection Act takes a firm line: **the displayed price is the
> price.** If you show a total and then exceed it at checkout, that is a misleading representation.
> Intent does not enter into it. You do not get to explain that a service fee was added by a
> different module.
>
> This reframes the bug entirely. It is not a display inconsistency to be tidied up in the next
> sprint. Under-charging is survivable — you lose money and learn something. **Over-charging is a
> legal problem**, and it is the direction a fee-adding bug naturally fails in, because fees get
> added on the server and forgotten on the client.
>
> So every default we set now is chosen to fail in the over-stating direction. If the two
> calculations disagree, the customer sees the higher number and is charged the lower one. That is
> the only asymmetry that is safe.
>
> ### What we did about it
>
> Not "be more careful." Being more careful had already failed three times, and a rule that depends
> on vigilance is a rule that works until the day someone is tired.
>
> We wrote a test that imports **both** implementations — the client pricing module and the server
> one — runs them across a wide grid of inputs, and fails the build if any pair of outputs differs.
> Not a snapshot of expected values, which would just be a third place to be wrong. A direct
> comparison of the two things that must agree.
>
> It has caught drift since. That is the part I care about: it is not decoration, it has done work.
>
> ### The principle I would extract
>
> **When correctness means two things agree, test the agreement, not the things.**
>
> It is tempting to write good tests for the client calculator and good tests for the server
> calculator. We had those. They both passed. They were both, individually, correct implementations
> of what their author believed the rules were.
>
> The defect lived in the gap, and a test of either half cannot see a gap. Only a test that holds
> both halves at once can.
>
> This generalises further than pricing. Any time you have a duplicated rule — a validation
> implemented in the form and again in the API, a permission checked in the UI and again in the
> database, a state machine mirrored between a mobile app and a backend — the valuable test is not
> "is each correct" but "are they the same."
>
> ### The one still open
>
> Honesty compels a footnote: we currently have a document that locks certain prices and a deployed
> server that charges different ones. That is the same class of defect at a higher level — code and
> commercial policy disagreeing rather than two pieces of code — and it is unresolved as I write
> this.
>
> Which is why nothing we publish anywhere states a price at the moment. Not modesty. We do not
> currently know which of the two numbers is the true one, and under the CPA, publishing the wrong
> one is worse than publishing neither.
>
> ---
>
> *Building Xoot in public. Weekly, free.*

`APPROVE / EDIT / KILL`

---

## SUB-04 — "A test that has never failed is not a test"

**~800 words. Week 4. Topic: the guard layer, and the rule.**

---

> ### A test that has never failed is not a test
>
> We have 1,102 tests. For a while I thought that number meant something. It does not, on its own,
> and I can tell you exactly when I stopped believing it.
>
> We found several tests in our suite that asserted rules **nobody had implemented**. They had been
> passing for weeks. Green, in the summary, adding to the count, contributing to a feeling of
> safety — and checking nothing, because the thing they described did not exist to be checked.
>
> They were not badly written. They were written first, against an intention, and then the intention
> changed and nobody went back. The test kept passing because a rule that does not exist cannot be
> violated.
>
> ### The rule we adopted
>
> > **Plant the bug, watch it fail, then restore.**
>
> Before a guard test is allowed to stay in our repo, someone must reintroduce the exact defect it
> claims to prevent and observe it go red. Then undo that and observe it go green again.
>
> It takes about ninety seconds. It converts a test from an assertion about the world into an
> observation of the world.
>
> This has caught real problems. The most recent: I wrote a check that fails the build when our live
> site is served by something that is not us — it looks for a `generator` meta tag we do not emit. I
> planted it against a captured copy of the wrong page, and it fired. Good. Then I ran it against our
> own built `index.html`, and it stayed silent, which is what I wanted, but for a reason I had not
> thought about: **our page emits no generator tag at all**, so the check would also stay silent if
> the page were empty, or a 404, or a completely different site that happened not to advertise its
> builder.
>
> I only learned the boundary of the check by running it against the negative case. The positive case
> made it look complete.
>
> ### Three tests that were doing nothing
>
> A short taxonomy, all from our own repo:
>
> **The test with a fixture that cannot fail.** It asserted a function's output against a fixture
> generated *by that function*. Perfectly circular, permanently green.
>
> **The check that polled for less time than the thing it was polling for.** Three minutes, on a
> build that takes longer. Wrote about this a few weeks ago.
>
> **The poll that exited on an error it treated as a result.** An API returned 403 because of an
> authorisation policy, the loop treated the non-200 as "not ready yet", retried, exhausted its
> attempts, and reported an inconclusive-but-acceptable outcome. It could not have succeeded under
> any circumstances.
>
> What they have in common is not carelessness. Each was written by someone competent, solving the
> problem in front of them. What they have in common is that **nobody ever watched them fail**, so
> nobody discovered that they could not.
>
> ### The counting problem
>
> I still like having 1,102 tests. But the number is an input, not an outcome, and the honest version
> of the question is not "how many tests do you have" but "how many of them have you seen fail for
> the reason they exist?"
>
> For us that answer is much smaller than 1,102 and I am not going to pretend otherwise. It is
> growing, because every new guard now has to earn its place by failing first.
>
> ### If you take one thing
>
> Pick your most important test. The one you would point at if someone asked whether a critical
> invariant holds.
>
> Go and break the invariant. Deliberately, in your working tree, right now.
>
> If it does not go red, you have just learned something considerably more valuable than the green
> tick you had this morning.
>
> ---
>
> *Building Xoot in public — a home-services company in South Africa. Weekly, free, and mostly about
> things that turned out not to be true.*

`APPROVE / EDIT / KILL`

---

## Notes on the set

**All four are defect essays.** That is deliberate for month one and should not continue past it —
four is a voice, eight is a genre, and a founder who only ever writes about being wrong reads as
either performative or alarming. Month two should carry at least two decision-and-trade-off essays
from `decision-log.md`.

**None of them mentions booking a clean.** At zero subscribers the job is to be worth subscribing to.
The audience for these is other founders and technical people, which is the same audience as X — and
that is the point of the CTA: it converts X attention into an owned list.

⚠️ **SUB-02 names the founder's own correct observation and my failure to hear it.** That is the
strongest paragraph in the set and also the one most likely to feel uncomfortable to publish. It is
kept because it is true and because it is the only part a reader could not have guessed. **Kill it if
you would rather not**, and the essay still works — it just becomes less good.
