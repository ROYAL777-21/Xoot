# The next session: what to do, in order

**Written 2026-08-15.** The remaining production work is spread across a dead CI, a dropped Supabase
MCP and four other documents. This is the single ordered sequence. Nothing here is a plan — every
step names what to run and what proves it worked.

Read this before `go-live.md`. That file is the reference; this one is the order.

---

## Where production actually stands

| layer | state |
|---|---|
| Schema | ✅ **fully migrated**, 6 migrations applied 2026-08-15, each verified by a real insert |
| Booking creation | ✅ **works** — was broken 13–15 Aug by a constraint rejecting its own column default |
| Xooter SOS alert | ✅ **works** — was broken since the ZD-029 rename |
| Xooter job cards | ✅ **works** — was broken since the ZD-029 rename |
| XootCred redemption | ✅ **works** — a trigger queried `zootcred_ledger`, a table the rename dropped |
| RPC grants | ✅ **closed 2026-08-21** — 8 SECURITY DEFINER functions were `anon`-callable; see below |
| Edge Functions | ✅ **all three already deployed** 2026-08-15 15:40:42Z — see Step 2 |
| Signup | ✅ **fixed 2026-08-22** — production had no trigger on `auth.users`; 1 account had 0 profile rows |
| Web app | ❌ still the 28 May upload — **build env vars now set**, see below |
| Payments | ❌ gates off, no merchant credentials |

**Nothing outstanding on either database.** Verify it rather than trusting this line:

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/ops/check-schema-drift.mjs            # production
SUPABASE_ACCESS_TOKEN=... node scripts/ops/check-schema-drift.mjs --staging
```

Exit 0 means every relation a database function references still exists. **Run this after every
migration** — it is the check that would have caught the XootCred outage, where a trigger function
called a table renamed out from under it for two days while every file in the repo was correct.

It asks "does this still exist", not "does this say `zoot`". A table renamed for any other reason
would have been just as broken and completely invisible to a brand grep.

**And run this one too, after any migration that creates or renames a function:**

```sql
select p.proname, array_to_string(p.proacl, ' | ') as acl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and (array_to_string(p.proacl,' ') like '%anon=%'
    or array_to_string(p.proacl,' ') like '%authenticated=%')
order by p.proname;
```

**`set_safety_pin` is the only row that belongs there.** Anything else is a SECURITY DEFINER
function callable from a browser holding just the publishable key.

Two things make this necessary rather than paranoid, both learned on 2026-08-21:

- **`REVOKE ... FROM PUBLIC` does not remove `anon` and `authenticated`.** Supabase's platform
  grants those roles directly; a revoke has to name them. `20260813220000` wrote `from public;`
  alone, eight times.
- **`drop` + `create` resets a function's ACL**, so renaming a function silently discards every
  revoke ever applied to it. That is how a correct July hardening was undone in August.

`src/lib/security-definer-grants.test.ts` catches both at review time by replaying the migrations,
but it reads migration *text* — only the query above sees what is actually installed.

---

## ⚠️ Two things a session cannot do from here — read before retrying either

**1. `xoot.co.za` is blocked by this environment's egress proxy.**

    2026-08-15T16:30Z  connect_rejected  xoot.co.za:443
    gateway answered 403 to CONNECT (policy denial)

So a session **cannot fetch the live site to verify a deploy**. Any claim about what xoot.co.za
serves has to come from you or from the Netlify dashboard, not from a session. Do not accept
"verified live" from a session that cannot reach the domain.

**2. The Netlify upload returned 403.** `netlify-deploy-services-updater` does not deploy directly —
it hands back an `npx @netlify/mcp --site-id … --proxy-path …` command that uploads the repo and
builds on Netlify. That upload was refused with `403 Forbidden`, and the proxy log does **not** list
the upload host, so this reads as Netlify's own API rather than the egress policy. Not retried:
repeated 403s are a permission answer, not a flake.

**What IS done:** the production build env vars are set on `xoot-home-care`
(`84f2dfcc-e653-4ce6-bb15-c9d5921e1a51`), production context, builds scope:

    VITE_SUPABASE_URL             https://mvlrkelahhsyjrwgsxaf.supabase.co
    VITE_SUPABASE_PUBLISHABLE_KEY sb_publishable_…  (public value, ships in every client bundle)

`netlify.toml` supplies `VITE_APP_ENV=production`. So **a Netlify-side build will now succeed** — the
thing that had never once worked. Linking the repository is enough to ship it.

---

## Step 0 — restore one of the two hands

Both routes to the databases are currently shut. **Either one unblocks the rest**, so do whichever is
faster:

- **Re-authorise the Supabase MCP** — direct database access, no CI needed. This is how the four
  migrations above were applied.
- **GitHub billing** — github.com/settings/billing → *Plans and usage*. Check a declined or expired
  card first, then the **Actions spending limit**: if included minutes are spent and the limit is
  still $0 (the default), every job is refused with **no runner assigned**, which is the exact
  symptom measured since 2026-08-14 10:59Z. This repo is private, and private repos consume Actions
  minutes where public ones do not.

Nothing below can run until one of them is back.

---

## Step 1 — migrations ✅ done 2026-08-15

All six applied to production and verified by performing the operation that was failing, then
rolling it back. Ledgers on both projects re-stamped to the repo's own filenames, so `db push`
re-runs nothing. Nothing to do here.

---

## Step 2 — ✅ ALREADY DONE. Verified 2026-08-22, not assumed

**This step was already complete and this document said otherwise for a week.** Corrected by
applying the cheap check in CLAUDE.md rule 6 — comparing each function's `updated_at` against
`git log` — which takes seconds and which nobody had run:

| function | deployed | newest source file in its closure |
|---|---|---|
| `confirm-payment` | v16, **2026-08-15 15:40:42Z** | 2026-08-13 14:43 |
| `admin-confirm-payment` | v15, **2026-08-15 15:40:42Z** | 2026-08-13 13:40 |
| `create-payment-session` | **v1, ACTIVE**, 2026-08-15 15:40:41Z | 2026-08-13 14:43 |

`create-payment-session` **exists**, so the 404 warning below is already satisfied. Every deploy is
two days newer than the newest file it bundles, so no stale `_shared` copy is possible.

Do **not** redeploy these to "be safe": re-inlining 11 files / 1,794 lines through the MCP would put
working money functions at risk to fix a problem that does not exist.

<details><summary>The original instructions, kept for the day these do need redeploying</summary>

### (historical) three Edge Functions, together

⚠️ **Deploy these with `supabase functions deploy`, not through the MCP.** `deploy_edge_function`
requires every file inline, which means hand-assembling each function's `_shared` dependency closure
in a chat message. For money functions that is precisely how one ships a function carrying a stale or
mis-transcribed `_shared` copy — the trap that once left 28 of 43 functions behind. The CLI uploads
from disk and resolves the closure itself. This was deliberately **not** attempted on 2026-08-15 for
that reason.

```
confirm-payment admin-confirm-payment create-payment-session
```

**These three and no others.** Measured by import, not assumed: they are the only functions that
bundle the new `_shared/payment-confirmation.ts`, `_shared/payment-provider-gate.ts` and
`_shared/payfast-checkout.ts`. No existing shared module was modified, so nothing else carries a
stale copy.

⚠️ **`create-payment-session` is new and appears in no older deploy list.**
`deploy-edge-functions` deploys only what is named unless the list is blank, and every recent
production deploy used an explicit list. Omit it and the Pay button returns 404 with nothing in any
log.

⚠️ **Migrations before functions** (`go-live.md` §3a). `create-payment-session` writes
`provider: 'payfast'`, which the pre-`20260813200000` constraint rejected.

---

</details>

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
