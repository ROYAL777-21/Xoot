# Migration reconciliation: repo vs staging vs production

Measured 2026-08-09 against both live projects. Supersedes any count derived from version strings.

**Headline: four migrations are genuinely unapplied, three are superseded, and one is mine from
today.** Issue #33's title already said "four written migrations blocked behind it", and that turns
out to be exactly right — this page is the evidence for which four.

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

## Recommended order, once the CLI is available

`supabase db push` is **not** safe today: it reads the ledger, and the ledger is wrong in both
directions — it under-reports (safety_pin) and over-reports (34 phantom missing). Push would
re-run migrations whose objects already exist and would renumber the record again.

1. **Repair the ledger first.** For every migration whose objects exist but whose version does not
   match the filename, realign:
   ```sql
   update supabase_migrations.schema_migrations
      set version = '<filename version>'
    where version = '<wall-clock version>' and name = '<name>';
   ```
   Do it on **both** projects. This is metadata only and changes no schema.
2. **Record the three superseded ones** as applied, rather than running them.
3. **Apply the four unapplied ones** in filename order, each verified by re-probing its objects
   afterwards.
4. **Then, and only then, `db push` becomes meaningful** — and stays meaningful, because the CLI
   takes the version from the filename and does not have the renaming bug.

## Standing rule

Prefer the CLI. `apply_migration` over the MCP is the tool that created this, and every use of it
needs the realign step in the same breath — see `.claude/skills/xoot-supabase-ops/SKILL.md` trap 2.
`booking_commission_rate` was applied that way today and realigned immediately; it is the one row in
the table above whose version is already correct on staging.
