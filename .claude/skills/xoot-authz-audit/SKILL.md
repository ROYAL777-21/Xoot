---
name: xoot-authz-audit
description: >
  Audit who can actually write what in a Supabase database, by joining table GRANTs
  to permissive RLS policies — a write is only reachable when a role holds both.
  Finds the class of bug where `FOR ALL USING (user_id = auth.uid())` lets a user
  set the fields the business is supposed to decide about them. Use when asked to
  audit permissions, check RLS, review database security, verify a lockdown, or
  before granting any new write. Also use after adding a table, policy, or grant.
user-invocable: true
---

# Authorization audit

## The bug this finds

`FOR ALL USING (user_id = auth.uid())` reads like "this row belongs to you". Postgres
executes it as **"you may write anything in this row"** — RLS is row-level and has no opinion
about columns.

So the policy that lets an applicant correct their phone number also lets them set their own
`background_check_status`. The one that shows a user their loyalty balance also lets them set
it. Found across ten tables in this codebase on 2026-08-02, including a self-assignable
vetting badge on a company whose product is sending vetted people into homes.

**Nothing in the app has to be wrong for this to be exploitable.** No UI offers it. One PATCH
against PostgREST with an ordinary user token is the whole attack.

## Rule 1 — never audit policies alone

A policy without a grant is inert. A grant without a policy is inert. Reading either in
isolation produces confident wrong answers in both directions:

- Reading policies alone **overstates**: this audit first reported a booking-price hole that
  was not reachable, because `authenticated` holds only SELECT on that table.
- Reading grants alone **understates**: a broad grant with a narrow policy is fine.

Always join them.

```sql
with g as (
  select table_name, grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema='public' and grantee in ('anon','authenticated')
    and privilege_type in ('INSERT','UPDATE','DELETE')
),
p as (
  select tablename, cmd, policyname, coalesce(with_check, qual) as expr
  from pg_policies
  where schemaname='public' and permissive='PERMISSIVE'
    and (roles::text like '%authenticated%' or roles::text like '%public%')
)
select g.table_name, g.grantee, g.privilege_type, p.policyname,
       left(regexp_replace(p.expr, '\s+', ' ', 'g'), 90) as policy_expr
from g join p on p.tablename = g.table_name
  and (p.cmd = 'ALL' or p.cmd = g.privilege_type)
where p.expr is not null
  and p.expr <> 'private.has_role(( SELECT auth.uid() AS uid), ''admin''::app_role)'
order by g.table_name, g.privilege_type;
```

## Rule 2 — then read the columns, not the table name

A reachable write is only a *finding* if the row contains something the user should not
author. For every table the query returns, list its columns and sort them into two piles:

- **Authored by the user** — their phone number, their address, their review text, their gift
  message. Fine.
- **Decided by the business about the user** — verification status, balances, approval state,
  prices, job state, `reviewed_by`, `admin_fee_paid`, anything ending `_status`.

Any table with a column in the second pile and a reachable write is a finding. Rank by what
the column unlocks, not by how many columns there are: one `background_check_status` outranks
twenty cosmetic fields.

## Rule 3 — fix with column-level GRANTs, not more policies

`GRANT` **is** column-aware, and it is checked before any policy runs. PostgREST fails closed:
an UPDATE touching an ungranted column is rejected outright.

Express it as a deny-list resolved against the live catalogue, never a literal column list —
schemas diverge between environments, and a hardcoded list fails on whichever one it was not
written against. See `private.grant_update_except` in
`supabase/migrations/20260802120000_client_write_surface_lockdown.sql`.

Reach for a trigger only when the rule depends on row state or a transition rather than on
which column is touched.

## Rule 4 — `anon` writes nothing

The anon key ships inside the web bundle and the app binary. Every write grant it holds is
surface an attacker starts with, whether or not a policy currently blocks it. Deliberate
exceptions get named in the migration; there is currently exactly one (`analytics_events`).

## Rule 5 — check the read side too

Revoking a write without revoking the matching read leaves the hole half-closed. Training
completions were unwritable while `quiz_questions` — answer key included — stayed world-
readable, so nobody needed to fake a score. Same technique: `private.grant_select_except`.

## Rule 6 — verify against the live database, never against the migration

A migration that was supposed to apply is not evidence. Re-run the join and read the counts.
Then check the advisors, which catch what this query does not: this session's own migrations
left two `SECURITY DEFINER` trigger functions callable over `/rest/v1/rpc`, found only by
`get_advisors` immediately afterwards.

**A function that exists to serve a trigger gets its EXECUTE revoked in the same migration
that creates it.**

## Reporting

State what is reachable, by whom, and what it unlocks in one sentence each. Do not describe a
latent hazard as a live hole — say which it is, and say what makes the difference. If a claim
turns out to be wrong, correct it plainly in the ledger rather than quietly dropping it.
