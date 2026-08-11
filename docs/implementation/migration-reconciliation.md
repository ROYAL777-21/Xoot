# Migration reconciliation: repo vs staging vs production

Measured 2026-08-09 against both live projects, acted on 2026-08-10. Supersedes any count derived
from version strings.

**Original finding: four migrations genuinely unapplied, three superseded, one new.** Issue #33's
title already said "four written migrations blocked behind it", and that turned out to be exactly
right — this page is the evidence for which four.

**Status now: all four are applied to both projects and both ledgers are realigned.** One
bookkeeping step remains — see the end of this page. The classification tables below are kept as
written, because the reasoning is the point; the "Step" sections record what was then done.

---

## Why version numbers lie here

`apply_migration` over the MCP **assigns its own version from the wall clock and ignores the
filename**. Matching repo files to applied migrations by version string therefore reports
**34 missing on staging**. Matching by *name* reports **8**. Matching by *what actually exists in
the schema* reports **4**.

Only the third is true. This document uses the third.

The clearest single example: the ledger says production has never had `safety_pin`. Production has
`public.user_safety_pins`, `set_safety_pin` and `verify_safety_pin`. **The migration ran; the record
of it is wrong.** Anyone reconciling from `list_migrations` alone would have re-applied it.

## The eight, classified by evidence

Each row was checked with `to_regclass` / `pg_proc` / `pg_trigger` against both projects, not
inferred from the name.

| migration | staging | production | verdict |
|---|---|---|---|
| `booking_price_author_guard` | fn + trigger **absent** | **absent** | **unapplied** |
| `booking_tips` | `booking_tips` table **absent** | **absent** | **unapplied** |
| `concierge_governance_controls` | 0 `concierge.*` controls | 0 | **unapplied** |
| `concierge_structured_handoff` | `support_handoff_contexts` **absent** | **absent** | **unapplied** |
| `completed_booking_invoices` | `booking_invoices` + guard fn present | present | superseded |
| `connector_safe_invoice_zoot_black_schema` | `zoot_black_*` present | present | superseded |
| `phase6_zoot_black_foundation` | `zoot_black_*` present | present | superseded |
| `booking_commission_rate` | **present** (applied today) | **absent** | staging only |

The three superseded ones were folded into the `connector_safe_*` consolidations that *are* recorded
under different names. Re-applying them would be a no-op at best — every statement is
`if not exists` / `or replace` — but they should be reconciled in the ledger rather than run.

## What the four unapplied ones actually cost

Not a tidiness problem. Each is a control that the repo believes exists and the database does not:

- **`booking_price_author_guard`** — a trigger stopping a booking's price being rewritten by anyone
  other than the server. Absent, so the guard the repo documents is not enforced anywhere.
- **`booking_tips`** — the whole tipping feature. `src/lib/tipping.ts` exists and is tested; the
  table it writes to does not. Any tip attempt fails.
- **`concierge_structured_handoff`** — `support_handoff_contexts`, which
  `create-concierge-handoff` inserts into. That function is deployed on neither project, so nothing
  is currently broken by its absence, but the two must land together.
- **`concierge_governance_controls`** — the eleven `concierge.*` feature flags. Absent on both, so
  every Concierge gate reads "no such control". Worth knowing that most of them seed `false`
  deliberately; only `concierge.enabled`, `concierge.web.enabled` and `concierge.mobile.enabled`
  seed `true`.

**None of the four is destructive.** All are `create table if not exists`, `create or replace
function`, or an `insert` of control rows. That is what makes them safe to apply — and it is the
reason to apply them deliberately rather than let `db push` discover them.

## Step 1 is done (2026-08-09)

**The ledgers are realigned on both projects.** Matched by name — every name in the repo is unique,
checked — and preceded by a collision query proving no target version was already occupied by a
different migration. **26 rows on staging, 29 on production.** Metadata only: no schema object was
created, altered or dropped.

`booking_commission_rate` (20260809120000) and `xooter_commission_boosts` (20260809210000) are now
applied to **both** projects, each realigned to its filename version immediately after
`apply_migration` stamped its own.

What that leaves:

| | staging | production |
|---|---|---|
| ledger matches filenames | ✅ | ✅ |
| four unapplied migrations | still unapplied | still unapplied |
| three superseded | still recorded under other names | same |

So **step 2 (record the superseded three) and step 3 (apply the four) remain.** `db push` is closer
to safe but is not there yet: it would still try to run the three superseded migrations, whose
statements are all `if not exists` / `or replace` and would therefore succeed as no-ops while
recording versions that overlap what is already there.

## Step 3 is done (2026-08-10): all four applied to both projects

| migration | version | what it was |
|---|---|---|
| `concierge_governance_controls` | `20260703150828` | 18 `concierge.*` flags + an agent contract. **Inert** — no code reads any of them. |
| `concierge_structured_handoff` | `20260703153056` | `support_handoff_contexts`, which the now-deployed `create-concierge-handoff` inserts into. It would have failed at runtime. |
| `booking_price_author_guard` | `20260730083000` | Closed a live hole. See below. |
| `booking_tips` | `20260730090000` | The tipping table `src/lib/tipping.ts` was already tested against. |

Every one realigned to its filename version immediately after `apply_migration` stamped its own, and
each realign preceded by a collision check — the version column is the primary key, so a clash aborts
the statement rather than half-applying.

Verified by reading the schema, not by trusting tool success: both new tables present on both
projects, RLS on, `booking_tips` carrying 5 policies and its settlement-guard trigger, and
`authenticated` holding **no INSERT** on `support_handoff_contexts` (service-role only).

**`booking_tips` does not turn tipping on** — `TIP_READINESS` in `src/lib/tipping.ts` still gates
that. It closes the gap where tested client code wrote to a table that did not exist.

**`concierge_governance_controls` changed no behaviour.** Four of its flags seed `true`, but grepping
the codebase finds nothing reading any `concierge.*` control — the launcher already renders
unconditionally, which is why it once overlapped the consent notice. Worth knowing before anyone
treats those as live switches.

### The one that mattered

**`booking_price_author_guard` is applied to both projects**, version realigned, trigger present and
enabled (`tgenabled = 'O'`).

It went first because it is the only one of the four that closes a live hole rather than filling a
gap. `update own bookings` and `zooters update assigned bookings` both grant UPDATE on the **whole**
`bookings` row with no column restriction — so a customer could PATCH their own booking's price to
zero, and an assigned Xooter could raise the price of a job they were working, neither needing a UI.
The trigger reverts rather than raising, so a legitimate update carrying the old price along is
unaffected, and `auth.uid() is null` (the service-role path) is untouched.

Checked before applying: `public.has_role` exists, the `booking_status` enum exists, and no trigger
of that name was already present on either project.

`booking_tips` also widened `payment_records.payment_kind` to include `'tip'`. That is the one
statement here that could have failed on existing data — `add constraint` rejects any row outside
the new list. Checked first: **both projects hold zero `payment_records` rows.**

## What is left

Steps 1–3 are done. Step 4 is not, and the reason is worth writing down rather than discovering.

1. ~~Repair the ledger.~~ **Done 2026-08-09** — 26 rows on staging, 29 on production.
2. ~~Record the three superseded ones as applied, rather than running them.~~ **Done 2026-08-10.**
   `completed_booking_invoices`, `connector_safe_invoice_zoot_black_schema` and
   `phase6_zoot_black_foundation` have their objects in place via the `connector_safe_*`
   consolidations, but the ledger had no row under the repo's filename versions, so `db push` would
   have tried them. Every statement in all three is `if not exists` / `or replace`, so running them
   would have succeeded as a no-op — which is precisely why inserting the rows deliberately beats
   letting push discover them and record whatever version it likes. Inserted with
   `on conflict (version) do nothing` on both projects; both returned **3 rows**.
3. ~~Apply the four unapplied ones.~~ **Done 2026-08-10** — see above.
4. **`db push` is still not safe to run.** Not for the reasons above — those are closed — but for
   the one below, which the full sweep turned up and which nobody had measured before.

## ✅ Settled 2026-08-11: both ledgers are complete

The section below records how it was diagnosed. The outcome, read back after the repair:

| project | repo versions present | ledger rows | verdict |
|---|---|---|---|
| **staging** `fxmxyabdjqviqbcxmvlp` | **65 / 65** | 68 | complete before this pass; nothing to do |
| **production** `mvlrkelahhsyjrwgsxaf` | **65 / 65** | 73 | 23 rows inserted, re-read at 0 missing |

**The 23 were ledger gaps, not absences**, and that was established by checking objects rather than
inferring from names: 18 of 19 checkable tables are present on production, and the alter-only
migrations check out too — the `booking_status` enum carries `draft`/`en_route`/`in_progress`,
`has_role` is `search_path`-hardened, and `native_push_subscriptions.token_type` has both its
`'expo_push'` default and its check constraint. Production reached the same schema through the
`zoot_launch_*` path and never recorded the repo's version numbers.

The single `false` is `zootcred_wallets`, and it is correct: production uses `zootcred_ledger`,
which exists. That migration was superseded, not skipped.

### A wrong probe, recorded because it nearly became a finding

The first check for `expo_push_token_type` queried `push_tokens.token_type`. It came back absent and
briefly looked like a genuine gap — but that migration alters **`native_push_subscriptions`**, not
`push_tokens`. Re-run against the right table, it is applied.

Evidence aimed at the wrong object is not evidence, and it fails in the most dangerous direction:
it produces a confident, specific, wrong conclusion rather than an obvious error. Had it gone
unchecked, the repair would have "fixed" a migration that was never broken.

### Still open: eight migrations with no source in this repo

| migration | where |
|---|---|
| `connector_safe_booking_invoice_public_schema` | both projects, **different version stamps on each** |
| `connector_safe_zoot_black_core_schema` | both projects, different stamps |
| `connector_safe_zoot_black_certificate_schema` | both projects, different stamps |
| `zoot_launch_schema_core`, `zoot_launch_rls_functions_indexes`, `zoot_launch_api_grants`, `security_advisor_hardening`, `phase_10_push_tokens` | production only |

The repo holds exactly one `connector_safe_*` file. Same class as `twilio-token`, which ran in
production with no source until it was recovered.

**These are documented rather than reconstructed, and that is a deliberate choice.** Writing repo
files for them would mean inventing SQL for migrations whose originals nobody has — and because the
three `connector_safe_*` ones carry *different version stamps on each project*, any single repo file
would match neither. Both projects would then see it as unapplied and `db push` would run invented
SQL against a live database. Naming the gap is worse-looking and considerably safer.

Worth recording alongside: the three migrations named `zoot_black` left **no `zoot_black` schema** on
production. Only `public` (81 tables) and `private` (functions only) exist. Whatever they built was
later dropped or never landed, which is a further reason not to reconstruct them from their names.

### `db push` is now meaningful — and should be run by a human first

Both ledgers agree with the repo, and `SUPABASE_DB_PASSWORD` is set. The first push after a
reconciliation is the one worth watching, so it has not been run from a session.

---

## How it was diagnosed: production's ledger was missing 23 of the repo's 65 versions

The checks above were all name-driven, and each one asked about a specific migration. The last check
asked the other question — *every* repo filename version against production's ledger — and the answer
is not the small remainder the earlier steps implied:

```
repo_total: 65, missing_from_ledger: 23
```

All 23 exist as files in `supabase/migrations/`. They fall into two groups, and **the distinction is
the whole point**, because one group is harmless and the other is a `db push` hazard:

| group | versions | what it means |
|---|---|---|
| **Ledger gap — objects exist** | `20260802170000_safety_pin` is the confirmed one | The migration ran, or its objects arrived by another route, and the ledger never recorded it. `db push` would re-run it. |
| **Unclassified** | the other 22 | Could be either. Not yet checked object-by-object. |

**`safety_pin` is the proven case and it is proven the expensive way.** Earlier in this same session
production was read directly and `user_safety_pins`, `set_safety_pin` and `verify_safety_pin` were
**all confirmed present** — while production's ledger has no row for `20260802170000`. So on this
project the ledger is wrong in *both* directions: it has carried rows whose version did not match the
filename, and it is missing rows for objects that demonstrably exist.

That is the finding that matters. **A ledger you cannot trust in either direction cannot gate a
`db push`**, and the failure is asymmetric: a missing row makes push re-run a migration, and re-running
one that is not idempotent is how a reconciliation turns into an outage.

### Why 23 is not automatically 23 problems

Production has a genuinely divergent history — it carries `zoot_launch_*` migrations that staging has
never had. So some of these 23 are expected absences, where production reached the same schema by a
different path and the repo file was never its route. Seven of the 23 are the early Lovable-generated
UUID-named files (`20260421`–`20260424`), which is exactly where that divergence would live.

**But "some are fine" is not a classification, and it must not be recorded as one.** The rule this
document has followed throughout is that a migration is classified by checking whether its objects
exist, not by inferring from its name — and that check has been run for exactly one of the 23.

### Blocked mid-check on 2026-08-10, finished on 2026-08-11

The classification stalled when the Supabase connector dropped its authorisation, and this document
said so at the time rather than implying the phase had landed. With the connector back, all 22
remaining versions were classified by object existence, staging was swept for the first time, and
the repair was applied and read back. See the outcome section at the top.

The reason that interim state was worth writing down: every section above it described real,
finished work, and a reader stopping there would have concluded the whole thing was done. An
unfinished item stated plainly is a working relationship; an unfinished item omitted is a defect
someone else discovers later.

`db push` also still needs `SUPABASE_DB_PASSWORD`, which is not set. `SUPABASE_ACCESS_TOKEN` alone
authorises Edge Function deploys, not a direct Postgres connection — worth knowing before anyone
assumes the working deploy workflow means migrations can run the same way.

## Standing rule

Prefer the CLI. `apply_migration` over the MCP is the tool that created this, and every use of it
needs the realign step in the same breath — see `.claude/skills/xoot-supabase-ops/SKILL.md` trap 2.
`booking_commission_rate` was applied that way today and realigned immediately; it is the one row in
the table above whose version is already correct on staging.
