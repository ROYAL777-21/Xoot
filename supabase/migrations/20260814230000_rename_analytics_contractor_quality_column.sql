-- ZD-029, ninth surface: a view whose OUTPUT column kept the old name.
--
-- `alter table … rename` rewrites what a view *reads* and never what it *exposes*. So the view
-- was quietly split in two:
--
--   live definition (pg_get_viewdef, production):
--     SELECT z.id AS zooter_id, …          <- output alias, untouched by the rename
--       FROM xooters z                      <- reference, rewritten by the rename
--       LEFT JOIN trust_incidents ti ON ti.xooter_id = z.id
--
-- Internally consistent, externally stale. Present on **both** projects.
--
-- ⚠️ **This is why `Types match the live schema` will not go green after the pending `db-push`,
-- and I said twice that it would.** `src/integrations/supabase/types.ts` declares this view's row
-- as `xooter_id`, because ZD-029 was a 267-file text sweep and the generated types file is text.
-- The generator was never re-run against a database where the view had actually changed. So the
-- types and the schema disagree, no pending migration closed the gap, and the workflow that exists
-- precisely to catch this was being written off as "waiting on db-push".
--
-- `20260813220000` fixes the sibling case (`booking_sensitive_access.zooter_id`) because that view
-- had to be dropped anyway to rename the function under it. This one had no such trigger and was
-- missed.
--
-- ── Why drop and recreate ───────────────────────────────────────────────────────
-- `create or replace view` cannot rename a column — Postgres requires the same names in the same
-- order. Checked first: `pg_depend` reports **0 dependents**, so nothing else has to be rebuilt.
--
-- Nothing in `src/`, `supabase/functions/` or `mobile/src/` selects from this view by column, so
-- renaming the output is safe. `types.ts` already expects `xooter_id`.
--
-- ⚠️ Cross-role: `supabase/migrations/**` is Release's. Written here because ZD-029 is mine.
-- **Not applied anywhere** — needs a `db-push`, and it should go in the same push as the other four.

drop view if exists public.analytics_contractor_quality;

create view public.analytics_contractor_quality
with (security_invoker = true)
as
select
  x.id as xooter_id,
  x.name,
  x.reliability_score,
  x.job_completion_rate,
  x.repeat_client_count,
  x.rating,
  count(ti.id) as open_incident_count
from public.xooters x
left join public.trust_incidents ti
  on ti.xooter_id = x.id
 and ti.status = 'open'
group by x.id, x.name, x.reliability_score, x.job_completion_rate, x.repeat_client_count, x.rating;

-- Grants restored to exactly what the live view carried, read from `role_table_grants` before the
-- drop — NOT tidied.
--
-- ⚠️ `authenticated` holding INSERT/UPDATE/DELETE on an analytics view is one of the 34 grants
-- `docs/security/client-write-revoke-plan.md` proposes revoking, and finding it here is independent
-- confirmation of that audit. It is deliberately **not** revoked in this migration: that decision is
-- held until #42 merges, and hiding a permission change inside a rename fix is exactly the move I
-- refused when I left the masked-call reason strings alone. One change, one risk.
grant select, insert, update, delete, truncate, references, trigger on public.analytics_contractor_quality to authenticated;
grant select, truncate, references, trigger on public.analytics_contractor_quality to anon;
