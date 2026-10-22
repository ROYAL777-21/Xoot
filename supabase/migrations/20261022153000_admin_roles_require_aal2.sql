-- Founder admin access: require verified MFA at the database boundary as well as in the UI.
-- An isolated, additive update to the existing predicate. No roles or policies are granted.
-- Refuse unknown predecessors; preserve the existing owner and EXECUTE grants.
do $preflight$
declare
  old_body constant text := 'select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)';
  new_body constant text := $body$
    select (_role <> 'admin'::public.app_role or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2')
      and exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
  $body$;
  actual record;
begin
  select p.prosrc, p.prosecdef, p.provolatile, p.prorettype, p.proconfig
    into actual from pg_proc p where p.oid = to_regprocedure('private.has_role(uuid,public.app_role)');
  if not found or not actual.prosecdef or actual.provolatile <> 's'
      or actual.prorettype <> 'boolean'::regtype
      or not ('search_path=""' = any(coalesce(actual.proconfig, array[]::text[]))) then
    raise exception 'Admin MFA preflight: expected stable, security-definer role predicate with empty search_path';
  end if;
  if regexp_replace(actual.prosrc, '\s', '', 'g') not in
      (regexp_replace(old_body, '\s', '', 'g'), regexp_replace(new_body, '\s', '', 'g')) then
    raise exception 'Admin MFA preflight: unexpected role predicate body; review it before migrating';
  end if;
  if to_regprocedure('auth.jwt()') is null then
    raise exception 'Admin MFA preflight: auth.jwt() is required';
  end if;
end
$preflight$;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = ''
as $body$
  select (_role <> 'admin'::public.app_role or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2')
    and exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$body$;

comment on function private.has_role(uuid, public.app_role) is
  'Role membership predicate. Admin privileges additionally require an authenticated aal2 JWT. Non-admin membership checks are unchanged.';
