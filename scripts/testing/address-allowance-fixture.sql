-- Local isolated PostgreSQL only. Roles are created by the disposable KYC fixture.
create table public.xoot_coverage_query_budget(user_id uuid primary key,requests integer,resets_at timestamptz,updated_at timestamptz);
grant select,insert,update on public.xoot_coverage_query_budget to service_role;
create function public.assert_true(p_value boolean,p_label text) returns void language plpgsql as $$
begin if p_value is distinct from true then raise exception 'ASSERTION FAILED: %',p_label;end if;end $$;
create function public.assert_throws(p_sql text,p_state text,p_label text) returns void language plpgsql as $$
declare actual text; begin
  begin execute p_sql; exception when others then get stacked diagnostics actual=returned_sqlstate;end;
  if actual is distinct from p_state then raise exception 'ASSERTION FAILED: %, expected %, got %',p_label,p_state,coalesce(actual,'success');end if;
end $$;
