-- Staging followed the full legacy migration chain and still had older RLS
-- policies that called auth.uid() directly. This preserves each policy's
-- command, roles, permissive/restrictive mode, expressions, and comment while
-- rewriting raw auth.uid() calls to the Supabase-recommended initplan form.

do $$
declare
  v_policy record;
  v_roles text;
  v_using text;
  v_with_check text;
  v_using_clause text;
  v_with_check_clause text;
  v_comment text;
begin
  for v_policy in
    select
      n.nspname as schema_name,
      c.relname as table_name,
      p.polname as policy_name,
      p.polpermissive,
      case p.polcmd
        when 'r' then 'select'
        when 'a' then 'insert'
        when 'w' then 'update'
        when 'd' then 'delete'
        when '*' then 'all'
      end as command_name,
      p.polroles,
      pg_get_expr(p.polqual, p.polrelid) as using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr,
      obj_description(p.oid, 'pg_policy') as policy_comment
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        (
          coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~ '(^|[^A-Za-z0-9_\\.])auth\\.uid\\(\\)'
          and coalesce(pg_get_expr(p.polqual, p.polrelid), '') not like '%( SELECT auth.uid() AS uid)%'
          and coalesce(pg_get_expr(p.polqual, p.polrelid), '') not like '%(select auth.uid())%'
        )
        or (
          coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ '(^|[^A-Za-z0-9_\\.])auth\\.uid\\(\\)'
          and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%( SELECT auth.uid() AS uid)%'
          and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%(select auth.uid())%'
        )
      )
    order by n.nspname, c.relname, p.polname
  loop
    select string_agg(
             case
               when role_oid = 0::oid then 'public'
               else quote_ident(r.rolname)
             end,
             ', '
             order by role_ord
           )
      into v_roles
    from unnest(v_policy.polroles) with ordinality roles(role_oid, role_ord)
    left join pg_roles r on r.oid = roles.role_oid;

    v_roles := coalesce(v_roles, 'public');
    v_using := v_policy.using_expr;
    v_with_check := v_policy.with_check_expr;

    if v_using is not null
       and v_using ~ '(^|[^A-Za-z0-9_\\.])auth\\.uid\\(\\)'
       and v_using not like '%( SELECT auth.uid() AS uid)%'
       and v_using not like '%(select auth.uid())%' then
      v_using := regexp_replace(
        v_using,
        '(^|[^A-Za-z0-9_\\.])auth\\.uid\\(\\)',
        '\1(select auth.uid())',
        'g'
      );
    end if;

    if v_with_check is not null
       and v_with_check ~ '(^|[^A-Za-z0-9_\\.])auth\\.uid\\(\\)'
       and v_with_check not like '%( SELECT auth.uid() AS uid)%'
       and v_with_check not like '%(select auth.uid())%' then
      v_with_check := regexp_replace(
        v_with_check,
        '(^|[^A-Za-z0-9_\\.])auth\\.uid\\(\\)',
        '\1(select auth.uid())',
        'g'
      );
    end if;

    v_using_clause := case
      when v_using is null then ''
      else format(' using (%s)', v_using)
    end;

    v_with_check_clause := case
      when v_with_check is null then ''
      else format(' with check (%s)', v_with_check)
    end;

    execute format(
      'drop policy if exists %I on %I.%I',
      v_policy.policy_name,
      v_policy.schema_name,
      v_policy.table_name
    );

    execute format(
      'create policy %I on %I.%I as %s for %s to %s%s%s',
      v_policy.policy_name,
      v_policy.schema_name,
      v_policy.table_name,
      case when v_policy.polpermissive then 'permissive' else 'restrictive' end,
      v_policy.command_name,
      v_roles,
      v_using_clause,
      v_with_check_clause
    );

    v_comment := coalesce(
      v_policy.policy_comment,
      'Preserves legacy RLS behavior while wrapping auth.uid as an initplan for Supabase performance advisor compliance.'
    );

    execute format(
      'comment on policy %I on %I.%I is %L',
      v_policy.policy_name,
      v_policy.schema_name,
      v_policy.table_name,
      v_comment
    );
  end loop;
end;
$$;
