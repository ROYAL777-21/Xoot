-- Move training grading and job responses to the server, and stop shipping the answer key.
--
-- Companion to 20260802120000_client_write_surface_lockdown.sql, which revoked the client's
-- write access to `zooter_training_completions` and `zooter_jobs`. That migration deliberately
-- left both flows failing closed until the server-side path existed. This adds it.
--
-- It also closes something found while building that path: `training_modules.quiz_questions`
-- holds each question's `correct` index, and the table is readable by everyone. Revoking the
-- write on completions stops a Xooter *claiming* a pass; it does nothing about a Xooter
-- reading the answers first. Both halves are needed or neither is worth having, and this
-- matters more once the modules carry company etiquette and safety content.

begin;

-- ---------------------------------------------------------------------------
-- The read-side twin of private.grant_update_except.
-- ---------------------------------------------------------------------------
create or replace function private.grant_select_except(
  target_table text,
  hidden_columns text[]
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed text;
begin
  if to_regclass('public.' || quote_ident(target_table)) is null then
    raise notice 'skipping %, not present in this environment', target_table;
    return;
  end if;

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into allowed
  from information_schema.columns
  where table_schema = 'public'
    and table_name = target_table
    and not (column_name = any(hidden_columns));

  execute format('revoke select on public.%I from anon, authenticated', target_table);

  if allowed is not null then
    execute format('grant select (%s) on public.%I to anon, authenticated', allowed, target_table);
  end if;
end;
$$;

revoke all on function private.grant_select_except(text, text[]) from public, anon, authenticated;

-- The catalogue stays public — titles, durations, categories, badges are all meant to be
-- browsable. Only the answer key goes. `select *` on this table now fails for a client, which
-- is the intended breakage: the app must ask the Edge Function for questions instead.
select private.grant_select_except('training_modules', array['quiz_questions']);

-- ---------------------------------------------------------------------------
-- Job state transitions the server can enforce.
-- ---------------------------------------------------------------------------
-- `respond-zooter-job` needs to know which transitions are legal without re-deriving the rule
-- from application code. Keeping it in the database means the rule survives a rewrite of the
-- function and can be asserted directly in SQL.
-- Lives in `public` because PostgREST only exposes `public`, and the Edge Function calls it
-- over RPC. Execute is then taken away from every client role and given to the service role
-- alone, so being in `public` costs nothing: a client can neither call it nor learn the rule
-- by probing it.
create or replace function public.zooter_job_transition_allowed(
  current_state text,
  next_state text
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select (current_state, next_state) in (
    ('offered', 'accepted'),
    ('offered', 'declined'),
    ('offered', 'expired'),
    ('accepted', 'cancelled')
  );
$$;

revoke all on function public.zooter_job_transition_allowed(text, text)
  from public, anon, authenticated;
grant execute on function public.zooter_job_transition_allowed(text, text) to service_role;

comment on function public.zooter_job_transition_allowed(text, text) is
  'Legal zooter_jobs.state transitions. A terminal state is terminal: nothing leaves declined, '
  'expired or cancelled, so a Xooter cannot un-decline a job after seeing a better one.';

commit;
