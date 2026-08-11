---
name: xoot-supabase-ops
description: >
  Deploy Xoot Edge Functions and apply Supabase migrations without the four traps this
  repo has already been caught by: deployed functions bundling their own stale copy of
  `_shared`, `apply_migration` silently renaming migration versions, `verify_jwt` being
  reset by a deploy, and staging drifting from production. Use before any Edge Function
  deploy, before applying a migration through the MCP, when a redeploy is needed after
  changing `_shared`, or when repo and production appear to disagree.
user-invocable: true
---

# Deploying Xoot's backend without repeating known mistakes

Every trap here cost real time on 2026-08-07 or 2026-08-08. None is theoretical.

## 1. A change to `_shared` reaches nothing until every importer is redeployed

Deployed functions carry their **own bundled copy** of `_shared`. Editing
`_shared/governance-utils.ts` changes the repo and changes nothing in production.

This is how rate limiting stayed broken for the life of the project: the fix was committed,
the migration was applied, and twelve functions kept running the old bundle.

**Build the import closure before deploying, and follow sibling imports.** Shared modules
import each other as bare siblings — `twilio-webhook.ts` → `./governance-utils.ts`,
`admin-action-utils.ts` → `./action-utils.ts`. Neither string contains `_shared/`, so a
naive grep for `_shared/` misses them. Missing one produces a bundle that cannot resolve
its imports.

```
node scripts/ops/check-deployed-drift.mjs        # needs SUPABASE_ACCESS_TOKEN
node scripts/ops/check-deployed-drift.mjs --from-json <file>   # or feed it a fetched list
```

`sharedClosure` in `scripts/ops/lib/deployed-drift.mjs` already handles both spellings —
use it rather than re-deriving the closure by eye.

## 2. `apply_migration` over the MCP renames your migration

**It assigns its own version from the wall clock and ignores the filename.** A file named
`20260808100000_x.sql` was recorded as `20260808091836` on production and `20260808113409`
on staging — three identities for one migration.

Left alone, `supabase db push` sees the repo version as unapplied and runs it again, and the
two projects drift from each other as well as from the repo.

**Always check and realign afterwards:**

```
list_migrations(project_id)          # find the version it actually assigned
```
```sql
update supabase_migrations.schema_migrations
   set version = '<the filename version>'
 where version = '<the version the tool assigned>';
```

Do it on **every** project you applied to. The Supabase CLI does not have this problem —
it takes the version from the filename, so prefer it when available.

## 3. `verify_jwt` is set by the deploy call, not remembered

`deploy_edge_function` requires `verify_jwt` and will happily flip a public webhook to
authenticated or vice versa. `supabase/config.toml` is the source of truth — read the
function's entry there and pass exactly that. Getting it wrong on a `verify_jwt: false`
webhook silently breaks every inbound provider callback.

Functions with a stored `import_map_path` also need it supplied again, along with the
`functions/import_map.json` file, or the deploy fails with a confusing path error.

## 4. Verify the deploy, especially when you cannot smoke-test

The agent proxy denies `*.supabase.co`, so an Edge Function usually **cannot be called**
from a session. `pg_net` and `http` are not installed either, so it cannot be invoked from
SQL. That removes the check that would normally catch a bad deploy.

Deploy-time bundling catches syntax errors and unresolved imports. It does **not** catch a
silently wrong value — and this repo has already shipped a wrong price table once.

**So when a file carries constants whose corruption would be invisible and expensive, fetch
the deployed function back and compare those constants character by character.** That is how
`ops-workflow` was deployed safely by hand:

```
residential: 270,  deep: 365,  airbnb: 315,  premium: 420,  moving: 455
```

Uploading from disk with the CLI is better still, because it removes the transcription step
rather than verifying it. Prefer that whenever a token is available.

## 5. Staging is a different database, and order matters

Staging and production have genuinely divergent histories (see ZD-005). Two rules:

- **Migrations before function deploys.** Deploying code that calls a wrapper the database
  does not have yet breaks staging in a *new* way instead of fixing the current one.
- **Check, do not assume, that a migration is on both.** Staging sat with the three `private`
  helper functions and **zero** public wrappers while production had all of them.

## Project refs

| | |
|---|---|
| production | `mvlrkelahhsyjrwgsxaf` |
| staging | `fxmxyabdjqviqbcxmvlp` |
| PR preview branches | ephemeral, created by Supabase's Git integration — **not** an environment to deploy to deliberately |

## Before you report a deploy as done

- [ ] Version incremented, and `verify_jwt` matches `config.toml`
- [ ] Every function importing the changed `_shared` module redeployed, transitive ones included
- [ ] `list_migrations` checked and versions realigned to filenames, on every project touched
- [ ] High-risk constants compared against the repo if no smoke test was possible
- [ ] State plainly what was **not** verified — "deployed" and "working" are different claims
