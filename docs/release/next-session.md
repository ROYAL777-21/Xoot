# The next session: what to do, in order

**Written 2026-08-15.** The remaining production work is spread across a dead CI, a dropped Supabase
MCP and four other documents. This is the single ordered sequence. Nothing here is a plan — every
step names what to run and what proves it worked.

> 🔒 **Corrected 2026-08-20 by Correctness & Safety** (`docs/release/**` is Release's path — flagged
> per rule 3). Step 0 and Step 1 had both been overtaken, and **Step 1's acceptance criterion could
> not be met without breaking a pinned contract.** Corrections are marked ✅ / ⚠️ inline; nothing
> else was touched, and no step was deleted.

Read this before `go-live.md`. That file is the reference; this one is the order.

---

## Where production actually stands

| layer | state |
|---|---|
| Schema | ✅ 4 of 5 pending migrations applied 2026-08-15, each verified by a real insert |
| Booking creation | ✅ **works** — was broken 13–15 Aug by a constraint that rejected its own column default |
| Xooter SOS alert | ✅ **works** — was broken since the ZD-029 rename |
| Xooter job cards | ✅ **works** — was broken since the ZD-029 rename |
| One migration | ✅ `20260814170000_fix_private_function_bodies_zd029` — **applied**, verified 2026-08-20 in `schema_migrations` at that exact version |
| Edge Functions | ✅ the three payment functions deployed 2026-08-15 15:40 UTC; no source has changed since, so nothing is carrying a stale `_shared` copy |
| Orphaned functions | ❌ six pre-rename slugs still ACTIVE with no source in the repo — `NEEDS-FOUNDER.md` §3, still true 2026-08-20 |
| Web app | ❌ never deployed; Netlify still serves a hand-uploaded page from 28 May |
| Payments | ❌ gates off, no merchant credentials |

---

## Step 0 — restore one of the two hands

✅ **Both are resolved as of 2026-08-20.** The Supabase MCP is authorised again — the migrations and
live reads of 2026-08-20 went through it. The Actions stop was diagnosed as an exhausted **GitHub
Free** allowance (2,000 minutes/month for private repos, resets on the 1st — not a spending limit
that can be raised), and consumption was cut from roughly 29 to roughly 8 billed minutes per push in
`6d7ba50`. Runners return at the reset.

Kept below because the diagnosis is worth having if it recurs:

- **Re-authorise the Supabase MCP** — direct database access, no CI needed. This is how the four
  migrations above were applied.
- **GitHub billing** — github.com/settings/billing → *Plans and usage*. Check a declined or expired
  card first, then the **Actions spending limit**: if included minutes are spent and the limit is
  still $0 (the default), every job is refused with **no runner assigned**, which is the exact
  symptom measured since 2026-08-14 10:59Z. This repo is private, and private repos consume Actions
  minutes where public ones do not.

~~Nothing below can run until one of them is back.~~ Both are back.

---

## Step 1 — ✅ done, and its check needs fixing

    20260814170000_fix_private_function_bodies_zd029.sql

**Applied.** `schema_migrations` carries it at version `20260814170000`, read from production
2026-08-20. Nothing to run here.

⚠️ **`apply_migration` stamps a "now" version.** Left alone, `db push` then treats the repo file as
unapplied and re-runs it. After applying, re-stamp:

```sql
update supabase_migrations.schema_migrations
   set version = '20260814170000'
 where name = 'fix_private_function_bodies_zd029' and version <> '20260814170000';
```

⚠️ **Re-stamping by hand is also how `schema_migrations` gets a version that does not match the
repo.** On 2026-08-15 two sessions numbered a migration `20260815150000`; the applied one won, and
the other would have been silently skipped by `db push` with a success exit. Fixed in `d396bff`, and
`src/lib/migration-version-collision.test.ts` now fails offline if it recurs. If you re-stamp, run
that test afterwards.

**Proves it done:**

```sql
-- ⚠️ CORRECTED 2026-08-20. The original query was:
--     ... and p.prosrc ~* '\mzoot|zooter';   -- "Zero rows."
-- It returns ONE row, and always will: `private.can_create_masked_call` contains the reason string
-- `booking_has_no_assigned_zooter`, which is deliberately preserved — two of its siblings are pinned
-- as contract by `supabase/functions/_shared/twilio-phase9-readiness.test.ts`. Chasing that row to
-- zero means renaming a wire-format string and breaking the Twilio gate.
--
-- Reason strings are data; identifiers are what the rename was about. This checks identifiers.
select p.proname,
       (select string_agg(distinct m[1], ', ')
          from regexp_matches(p.prosrc, '([a-z_]*zoot[a-z_]*)', 'gi') m) as offending_tokens
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public','private')
   and p.prosrc ~* '\mzoot|zooter'
   and p.prosrc !~ 'booking_has_no_assigned_zooter';
```

Zero rows. **Verified zero on production 2026-08-20.**

---

## Step 2 — ✅ done, all three deployed together

```
confirm-payment admin-confirm-payment create-payment-session
```

✅ **Deployed to production 2026-08-15 15:40 UTC**, verified 2026-08-20 by reading the function list:
all three carry `updated_at` = `1786808442340`, and `create-payment-session` exists at version 1. The
warning below was heeded — nothing to do here.

✅ **And they are still current.** `git log --since="2026-08-15T15:40:00Z" -- supabase/functions/`
is empty, so no source has changed since that deploy. This is the check that matters most in this
repo: a deployed function bundles its own frozen copy of `_shared/*`, so a shared-module change
after a deploy leaves every importer silently behind. That has not happened here.

**These three and no others.** Measured by import, not assumed: they are the only functions that
bundle the new `_shared/payment-confirmation.ts`, `_shared/payment-provider-gate.ts` and
`_shared/payfast-checkout.ts`. No existing shared module was modified, so nothing else carries a
stale copy.

⚠️ **`create-payment-session` is new and appears in no older deploy list.**
`deploy-edge-functions` deploys only what is named unless the list is blank, and every recent
production deploy used an explicit list. Omit it and the Pay button returns 404 with nothing in any
log. *(Kept for the next deploy — it stays true every time this list is used.)*

⚠️ **Migrations before functions** (`go-live.md` §3a). `create-payment-session` writes
`provider: 'payfast'`, which the pre-`20260813200000` constraint rejected.

---

## Step 3 — the web app

**Netlify → Site configuration → Build & deploy → Link repository.** Click-path in
[`domain-setup.md`](./domain-setup.md).

Two things that will otherwise bite:

- **`VITE_APP_ENV` is now set per context in `netlify.toml`.** Netlify sets `CI=true` and
  `validate-public-env.mjs` hard-fails on `CI && !appEnv`, so before that fix **no Netlify build had
  ever succeeded**. Production additionally needs real `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify's own settings — they are deliberately not committed.
- **The avatar bucket migration must land first** (it has). `src/pages/xooter/Profile.tsx` references
  `xooter-avatars`; deploying the app against the old bucket breaks avatar upload. Same shape as
  `go-live.md` §3b.

---

## Step 4 — only then, payments

1. PayFast **sandbox** credentials on staging: `PAYFAST_MERCHANT_ID`, `_MERCHANT_KEY`,
   `_PASSPHRASE`, `PAYFAST_MODE`.
2. ⚠️ **`XOOT_APP_ENV=staging` on the staging project.** `getEdgeEnvironment()` falls back to
   `"production"` when unset, and `payment_provider_capabilities` has one row per environment — so an
   unlabelled staging deployment reads **production's** readiness row. Every flag on both rows is
   false today, so it is not currently exploitable, but it is a money gate answering about the wrong
   environment.
3. Flip `payments.provider_checkout` and `payments.hosted_checkout.payfast` **for staging only**.
4. Pay a real sandbox booking end to end: the form posts, PayFast accepts the signature, the ITN
   arrives, the booking reaches `payment_confirmed`.
5. Only then repeat on production with the live merchant.

**Step 4 is the one that matters.** Until a sandbox payment has completed, the PayFast integration is
written and internally consistent but unproven, and nobody should describe it as working.

---

## Step 5 — the housekeeping that has been waiting on a runner

- Dispatch `retire-orphaned-functions.yml` (dry run first). Six pre-rename functions are ACTIVE on
  both projects with no source in the repo. The workflow is on `main` from 2026-08-15, so
  `workflow_dispatch` can finally see it.
- Re-run the checks on any PR that went red during the outage. **Those reds are absent runs, not
  failures** — every job in that window has `runner_id: 0` and no steps.
