# Launch protocol

The **order** Xoot goes live in, what gates what, and what proves each gate is actually passed.

## ⚠️ This document carries no task list, deliberately

Three registers already exist, and each answers a different question:

| File | Answers |
|---|---|
| [`NEEDS-FOUNDER.md`](../../NEEDS-FOUNDER.md) | *what must the founder supply* — credentials, decisions, consequences |
| [`founder-todo.md`](./founder-todo.md) | *what state is production actually in*, with evidence per row |
| [`next-session.md`](./next-session.md) | *what do I run, in what order, and what proves it worked* |

`founder-todo.md` warns in its own header that **"a fourth copy is how the previous seven registers
rotted."** So this file adds no items. It **sequences** them and names the evidence. Every gate
points at whichever register owns the work.

`go-live.md` remains the technical runbook — secrets, migrations, deploy ordering. This says *when*;
that says *how*.

---

## The gates, in dependency order

A gate is passed when its evidence exists, not when it feels done.

### Gate 0 — CI can allocate a runner ✅ CLOSED 2026-09-02

GitHub Actions could not allocate a runner from 2026-08-14 until some time before 2026-09-02.
**It can again.** Job `100145687623` on PR #44: `runner_id 1000002340`, fifteen steps present,
06:16:32 → 06:18:40, conclusion success. Compare with the outage shape — no `steps` array,
`runner_id 0`, logs 404 — which is the opposite of this in every field.

`db-push` and `deploy-edge-functions` are dispatchable again, and both were dispatched the same day.

**Owner:** `founder-todo.md` §0, now marked resolved with the same evidence.

### Gate 1 — production actually deploys ✅ CLOSED 2026-09-02

**PR #44 merged**, commit `8cb2d0b`. Vercel produced `dpl_A5fuZXCQAPF7zCQJVKy7cAxzrPNx`,
`target: production`, state **READY** — the first production deployment the project has ever had
that is not an ERROR. The only previous one was `950dc5d`, the `config:check` failure that started
all of this.

### Gate 2 — the site is publicly reachable 🔴 OPEN — the domain serves a GoDaddy placeholder

⚠️ **This gate said the site could not be public until a custom domain was attached to Vercel. That
was wrong, and it was wrong because I had not looked at Netlify.**

`xoot.co.za` is the primary URL of the Netlify project **`xoot-home-care`**, which is connected to
this repository and builds it. Merging PR #44 published the real app there with no dashboard step
and no DNS change. Netlify's `currentDeploy` moved from `6a189bd7` to `6a9808ea`, state `ready`, and
its branch URL became `main--xoot-home-care.netlify.app`.

🚨 **`xoot.co.za` is served by the GoDaddy Website Builder.** Measured 2026-09-02, by finally
printing what the URL returns rather than reading a host's opinion of itself:

```html
<meta name="generator" content="Starfield Technologies; Go Daddy Website Builder 8.0.0000"/>
<link rel="canonical" href="https://xoot.co.za/404"/>
```

**Both hosts hold correct, current production builds of `main` and neither receives any traffic.**

| host | build |
|---|---|
| Netlify `xoot-home-care` | `6a9808ea`, `commit_ref 8cb2d0ba…`, `branch main`, `context production`, ready |
| Vercel `xoot` | `dpl_A5fuZXCQAPF7zCQJVKy7cAxzrPNx`, `target production`, READY |

⚠️ **I closed this gate twice on bad evidence, and both times the mistake had the same shape.** First
on Netlify's `currentDeploy` id changing; then on its deploy record reading
`ssl_url: https://xoot.co.za, context: production, state: ready`. **Those fields say what a host
would serve if traffic arrived. They say nothing about where DNS sends traffic.** Vercel's
`target: production, state: READY` is the same class of statement. Only fetching the URL from outside
settles it — and `xoot.co.za:443` is refused by the agent environment's egress policy, so it could
only ever be answered from a runner.

`verify-live-deploy` now **fails** rather than warns when the response carries a `generator` meta
that is not ours. Proven both ways before being kept: it fires on the captured GoDaddy body and
stays silent on our own built `index.html`, which emits no `generator` and must keep warning as the
genuine "still publishing" case.

**Fix:** `domain-setup.md` → *Point the domain at the app*. Unpublish the GoDaddy Website Builder
site first, or the DNS records get overwritten.

**Evidence:** `verify-live-deploy.yml`, which polls `xoot.co.za/build-info.json` for the deployed
commit and then runs `verify-live-site.mjs` against the served site — headers, deep-link routing,
`noindex` on private routes, `/.well-known/` as JSON, no service-role key in the bundle.

⚠️ **Two defects in that check were found and fixed the same day**, and both had been hiding this
gate's real state:
1. It polled for **3 minutes** (`attempts=12`, `delay=15`) under a comment claiming ~10. Netlify's
   build takes longer, so it had never once confirmed a deploy.
2. It never ran `verify-live-site.mjs` at all. That script was written on 2026-09-01 and nothing
   invoked it; it cannot run from an agent session because `xoot.co.za:443` is refused by this
   environment's egress policy.

**Owner:** `domain-setup.md` for the DNS picture; `go-live-requirements.md` for today's state.

### Gate 3 — a booking can be paid for 🔴 hard

PayFast merchant credentials, in Supabase Edge Function secrets on **both** projects.

**Evidence:** a booking completes end to end and a payment record lands in the database.
**Owner:** `NEEDS-FOUNDER.md` §1.

### Gate 3a — the homepage's trust claims are true ✅ CLOSED 2026-09-02

`NEEDS-FOUNDER.md` §4 lists **four claims the homepage states as fact** — MIE screening, trust
review queues, required training, profile trust badges — each currently answered "?".

**Under CPA s41 a misleading representation is misleading regardless of intent.** A claim that is
aspirational on a live homepage is an exposure, not untidiness. Every one must be answered yes, or
the copy changes before the domain goes public.

**Evidence:** each of the four answered in writing, and the page matching the answers.

✅ **CLOSED 2026-09-02.** All four reworded to what the product requires or displays, which is
checkable today, rather than to an operational record that does not exist. Two of the four were
substantive: **`MIE` is gone from every shipped component** — the field exists in the admin KYC
screen, but naming a screening bureau on a homepage asserts a commercial relationship nothing in
this repo evidences — and **the training claim was wrong rather than merely unproven**, listing five
`contractor_screening_questions` as though they were `training_modules`. The answers and the
reasoning are in `NEEDS-FOUNDER.md` §4.

### Gate 4 — instrumented before any spend 🟠 judgement

Analytics with referrer host, crash reporting, server-side funnel events, Search Console, and
"how did you hear about us?" at booking.

Two independent arguments agree here. This repo has no analytics and ~0 rows, so every dashboard
before this reports zeros. And Hormozi, asked to help a door-to-door service business get more
customers, starts with attribution and explicitly refuses to build a new acquisition channel while
the existing ones are unmeasured — `hormozi-findings.md` §1.

**Evidence:** a real booking appears in the funnel with an attributed source.

### Gate 5 — supply before demand 🟠 judgement, and the expensive one to skip

Named, activated Xooters in **each** launch suburb before any demand campaign runs.

**Supply is the ceiling.** Demand arriving where there is no coverage does not convert — it produces
cancellations and one-star reviews, and those are permanent in a market this small. Reach you cannot
serve is worse than no reach.

**Evidence:** coverage per launch suburb, and a test booking matched in each.

### Gate 6 — 10 to 20 friendly bookings 🟠 judgement

Real reviews, real photography, real activation data, real numbers to put in content.

**Nothing substitutes for this and it cannot be manufactured later.** Every channel afterwards needs
proof, and gate 4's instrumentation only means something once there is traffic through it.

**Evidence:** completed bookings with reviews and consented photography.

### Gate 7 — content banked 🟠 judgement

The company set exists on the Eden Content Engine board. Build it **sequentially — TikTok primary,
Instagram secondary.** YouTube and X wait.

A solo operator running four platforms at once produces diluted work on all four; the X changelog is
low-volume by design and costs almost nothing to keep ticking. Detail and the reasoning:
`company-social-playbook.md`, and `content-strategy-references.md` for the source.

**Evidence:** a fortnight of posts drafted and approved before the first goes out.

---

## Launch, and after

**Launch is gate 7 passed.** Paid spend comes after launch and only against creative already
validated organically — paying to distribute unvalidated creative buys a precise measurement of what
does not work.

## Go / no-go

- **Gates 0–3a are hard.** Any one unmet and the launch does not happen. They are the difference
  between a live product and a shopfront that cannot take money or tells the truth badly.
  **As of 2026-09-02, gates 0, 1 and 3a are closed. Gate 2 is OPEN and is now the first blocker** —
  the domain serves a GoDaddy placeholder, so no customer can reach the app at all. Gate 3 —
  payments — is behind it.
- **Gates 4–7 are judgement.** They can be compressed under pressure. **Gate 5 is the one that looks
  compressible and is not** — skipping it converts the launch budget into refunds and bad reviews.

## Rollback

**If gate 2 fails after the domain is public** — the domain is served by **Netlify**, so the rollback
is Netlify's: *Deploys* → pick the last good deploy → *Publish deploy*. It takes effect in about a
minute and nothing in the database is touched. Vercel's equivalent — promote the last READY
deployment — applies only if the domain has been moved there.

**If gate 3 fails after launch** — payments are the one path with no safe partial state. Stop taking
bookings at the front door rather than letting them fail at the payment step: a customer who cannot
book is annoyed, a customer charged incorrectly is a CPA matter.

**A migration is not rollback-safe by default.** `go-live.md` §3a and §3b carry the ordering
constraints, both derived from real failures. Read them before reversing anything schema-shaped.
