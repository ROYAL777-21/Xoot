# Working on Xoot

Xoot is a South African on-demand home-services marketplace. Customers book; **Xooters** do the
work. Website first, then the native app. The web app is Vite + React + Tailwind on Vercel; the backend is Supabase
(Postgres + Edge Functions on Deno).

Multiple sessions may work on this repo. Read the worklog before starting and update it before
stopping. Current launch state and owner actions live only in `docs/release/production-checklist.md`;
historical entries in the worklog are dated evidence, not current release instructions.

---

## The two roles

Set by the founder, 2026-08-12. Roles are drawn from what each session has actually shipped,
not assigned arbitrarily.

### 🚢 Release & Infrastructure — "can it ship?"

Owns getting the product live and keeping it live: CI, provider configuration, schema delivery,
deploys, native builds, and the runbooks that describe them.

```
.github/workflows/**          supabase/migrations/**
supabase/config.toml          supabase/functions/twilio-*/**
docs/release/**               mobile/**
```

Also owns: Supabase project settings and secrets, Twilio account/console configuration, the
`db-push` and `deploy-edge-functions` dispatches, and voice-over-data delivery
(`src/hooks/useVoiceCall.ts` and the native call layer).

### 🔒 Correctness & Safety — "is it right?"

Owns whether what ships is true: anything that charges money, grants access, or asserts a fact
the company can be held to.

```
supabase/functions/_shared/**          src/lib/**-pricing*.ts
supabase/functions/create-booking*/**  src/lib/care-plus*.ts
supabase/functions/confirm-payment/**  src/lib/xooter-commission*.ts
supabase/functions/*sensitive*/**      src/lib/**.test.ts
docs/implementation/decision-log.md    docs/product/locked-commercial-facts.md
blocker.md
```

Also owns: the design-kit port (`src/index.css`, `src/lib/design-tokens.ts`,
`src/components/kit/**`), and the guard-test layer generally.

### Neither owns outright

`src/pages/**`, `src/components/**` (outside `kit/`), `docs/` outside the paths above. Whoever
gets there first; say so in the worklog.

---

## The rules

1. **Before starting, read `docs/implementation/agent-worklog.md` and claim your work in it.**
   Push the claim before you write code. It is the only way the other session learns what you are
   holding.
2. **Editing your own paths needs no ceremony.** Just do it.
3. **Editing the other role's paths is allowed, but never silently.** The commit message must say
   what you touched and why it could not wait, and the worklog entry must flag it for the owner.
   A change that spans both roles is normal — the R39 booking fee spanned `src/`,
   `supabase/functions/` and `docs/` in one commit. Splitting that across two sessions would have
   been worse, not safer.
4. **Cross-review before merge, through your own lens.** Release reads a Correctness PR asking
   *"will this deploy, in what order, against what live config?"* Correctness reads a Release PR
   asking *"is this still true, and does it still charge the right amount?"* Review the risk you
   are the expert in; do not re-review the whole diff.
5. **Never revert the other session's work to resolve a conflict.** Rebase onto it. If the two
   changes genuinely disagree, the worklog records the disagreement and the founder decides.
6. **Report what is, not what should be.** If a check fails, say so with the output. If something
   is deployed and stale, read the deployed copy rather than assuming the repo reflects it —
   but **check the cheap way first**: `docs/release/go-live.md` §3-0. Comparing a function's
   `version` and `updated_at` against `git log` answers most "is this deployed?" questions in
   seconds, where `get_edge_function` returns the function plus every bundled `_shared` file and
   is the most expensive routine act in this repo. Read a body when the timestamps are ambiguous
   or the answer has to be exact. *(Added at Release's request, 2026-08-13.)*

---

## Facts both roles must know

These have each caused a real defect here. They are not style preferences.

- **`supabase/functions/_shared/*` is bundled into each function at deploy time.** A deployed
  function carries its own frozen copy. Changing a shared module reaches *nothing* until every
  importing function is redeployed. 28 of 43 functions were once behind for this reason alone.
- **The deployed server is the authority on money — and the deployed server can be wrong.**
  Verify by reading the deployed function body, not the repo file.
- **Client and server price separately and must agree.** `src/lib/xoot-pricing.ts` mirrors
  `supabase/functions/_shared/pricing.ts`; `src/lib/pricing-parity.test.ts` fails if they drift.
  This repo has shipped a screen showing one price and charging another **three times**.
- **Under the Consumer Protection Act the displayed price is the price.** A total shown and then
  exceeded at charge time is a legal problem, not untidiness. Over-stating is survivable;
  under-stating is not. Every default is chosen to fail in the over-stating direction.
- **Locked commercial facts change only through a decision-log entry.** See
  `docs/product/locked-commercial-facts.md`. Do not change a price in code and leave the document
  saying something else.
- **Deploy ordering is real and written down.** `docs/release/go-live.md` §3a (migrations before
  functions) and §3b (web app before the two booking writers). Both were derived from failures.
- **Production deploys are a human act.** `deploy-edge-functions.yml` is `workflow_dispatch` only
  and production requires typing the project ref. Neither session triggers it unasked.

## Verifying

```bash
npm run typecheck
npm run verify    # lint, tests, validated build, artifact and security scans
```

A guard test is only worth having if it fails against the defect it describes. **Plant the bug,
watch it fail, then restore.** Several tests in this repo were written asserting rules nobody had
implemented, and passed for weeks meaning nothing.
