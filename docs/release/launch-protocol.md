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

### Gate 0 — CI can allocate a runner 🔴 hard

GitHub Actions has been unable to allocate a runner **since 2026-08-14** (billing). Sampled runs
complete in under 15 seconds with `runner_id: 0` and no `steps` array — the jobs never started.

**This blocks `db-push` and `deploy-edge-functions` outright.** No migration reaches either project
and no Edge Function can be deployed while it holds. Nothing downstream of a schema change or a
function deploy can be trusted until it clears.

**Evidence:** a dispatched workflow run that allocates a runner and produces a `steps` array.
**Owner:** `founder-todo.md` §0.

### Gate 1 — production actually deploys 🔴 hard

The only `target: production` deployment Vercel holds is `dpl_C9sg2hud…`, state **ERROR** — commit
`950dc5d`, the original `config:check` failure. Every deployment since `bf8a38a` is **READY**, but
they are all previews from the branch.

**Merging PR #44 produces the first successful production build.** The env fix is already proven on
Vercel's own infrastructure — eight consecutive READY preview builds — so this is a merge, not a
gamble.

**Evidence:** Vercel shows a `target: production` deployment in state `READY`.

### Gate 2 — the site is publicly reachable 🔴 hard

⚠️ **Vercel Authentication is ON**, scoped `all_except_custom_domains`. Every `*.vercel.app` URL,
previews included, sits behind a Vercel login wall. **That is correct and should stay**: previews
stay private, the custom domain is exempt.

Two consequences:

1. `xoot.vercel.app` returning 401/403 is **expected behaviour, not a fault.**
2. **Nothing is publicly reachable until the custom domain is attached.**

**Evidence:** `node scripts/ops/verify-live-site.mjs https://xoot.co.za` passes — headers, deep-link
routing, `noindex` on private routes, `/.well-known/` served as JSON, and no service-role key in the
bundle. **Run it against the domain, never the `.vercel.app` URL.**
**Owner:** `domain-setup.md`.

### Gate 3 — a booking can be paid for 🔴 hard

PayFast merchant credentials, in Supabase Edge Function secrets on **both** projects.

**Evidence:** a booking completes end to end and a payment record lands in the database.
**Owner:** `NEEDS-FOUNDER.md` §1.

### Gate 3a — the homepage's trust claims are true 🔴 hard, and easy to miss

`NEEDS-FOUNDER.md` §4 lists **four claims the homepage states as fact** — MIE screening, trust
review queues, required training, profile trust badges — each currently answered "?".

**Under CPA s41 a misleading representation is misleading regardless of intent.** A claim that is
aspirational on a live homepage is an exposure, not untidiness. Every one must be answered yes, or
the copy changes before the domain goes public.

**Evidence:** each of the four answered in writing, and the page matching the answers.

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
- **Gates 4–7 are judgement.** They can be compressed under pressure. **Gate 5 is the one that looks
  compressible and is not** — skipping it converts the launch budget into refunds and bad reviews.

## Rollback

**If gate 2 fails after the domain is public** — Vercel keeps every previous deployment; promote the
last READY one. The site returns to its prior state within a minute and nothing in the database is
touched.

**If gate 3 fails after launch** — payments are the one path with no safe partial state. Stop taking
bookings at the front door rather than letting them fail at the payment step: a customer who cannot
book is annoyed, a customer charged incorrectly is a CPA matter.

**A migration is not rollback-safe by default.** `go-live.md` §3a and §3b carry the ordering
constraints, both derived from real failures. Read them before reversing anything schema-shaped.
