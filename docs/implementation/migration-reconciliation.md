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

## What is left: one step of four

Steps 1 and 3 are done. **Only step 2 remains**, and it is bookkeeping rather than schema.

1. ~~Repair the ledger.~~ **Done 2026-08-09** — 26 rows on staging, 29 on production.
2. **Record the three superseded ones as applied, rather than running them.**
   `completed_booking_invoices`, `connector_safe_invoice_zoot_black_schema` and
   `phase6_zoot_black_foundation` have their objects in place via the `connector_safe_*`
   consolidations, but the ledger has no row under the repo's filename versions. Until it does,
   `db push` will try them. Every statement in all three is `if not exists` / `or replace`, so
   running them would succeed as a no-op — which is precisely why it is better to insert the
   ledger rows deliberately than to let push discover them and record whatever version it likes.
3. ~~Apply the four unapplied ones.~~ **Done 2026-08-10** — see above.
4. **Then `db push` becomes meaningful**, and stays meaningful, because the CLI takes the version
   from the filename and does not have the renaming bug.

`db push` also still needs `SUPABASE_DB_PASSWORD`, which is not set. `SUPABASE_ACCESS_TOKEN` alone
authorises Edge Function deploys, not a direct Postgres connection — worth knowing before anyone
assumes the working deploy workflow means migrations can run the same way.

## Standing rule

Prefer the CLI. `apply_migration` over the MCP is the tool that created this, and every use of it
needs the realign step in the same breath — see `.claude/skills/xoot-supabase-ops/SKILL.md` trap 2.
`booking_commission_rate` was applied that way today and realigned immediately; it is the one row in
the table above whose version is already correct on staging.
