-- Recorded as 20261015102137_referral_client_grants_least_privilege in
-- staging (fxmxyabdjqviqbcxmvlp) after a read-only permissions audit.
-- ZD-036 redemption is server-authored. Clients may only READ their own records
-- through RLS. TRUNCATE is not protected by RLS and must never be client-granted.
--
-- Production is missing both legacy referral tables. Refuse to silently succeed
-- until its April referral schema is reconstructed and checked against staging.
begin;
do $block$
begin
  if to_regclass('public.referrals') is null
     or to_regclass('public.referral_redemptions') is null then
    raise exception 'Referral tables absent: reconcile canonical base schema before privilege hardening'
      using errcode = '42P01';
  end if;
end
$block$;

revoke all privileges on table public.referrals, public.referral_redemptions
  from public, anon, authenticated;
grant select on table public.referrals, public.referral_redemptions
  to authenticated;

do $block$
declare v_table text;
begin
  foreach v_table in array array['public.referrals','public.referral_redemptions'] loop
    if has_table_privilege('anon', v_table, 'SELECT')
      or has_table_privilege('anon', v_table, 'TRUNCATE')
      or has_table_privilege('authenticated', v_table, 'INSERT')
      or has_table_privilege('authenticated', v_table, 'UPDATE')
      or has_table_privilege('authenticated', v_table, 'DELETE')
      or has_table_privilege('authenticated', v_table, 'TRUNCATE')
      or not has_table_privilege('authenticated', v_table, 'SELECT')
      or not has_table_privilege('service_role', v_table, 'INSERT')
      or not has_table_privilege('service_role', v_table, 'SELECT') then
      raise exception 'Referral privileges not least-privilege on %', v_table;
    end if;
  end loop;
end
$block$;
commit;
