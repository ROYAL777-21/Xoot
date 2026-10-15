-- Production prerequisite for ZD-035/036.
-- Staging retains the April referral tables. Production's historical migration
-- ledger says April ran but its actual schema has neither table or code generator.
-- Intentionally sorts BEFORE 20260903120000_zd035_crew_and_zd036_referrals.sql.
-- Do not repair-mark this file: prove both table shapes, roles, trigger and ledger.
-- No historical booking, balance, customer or referral data is rewritten.
begin;

do $preflight$
declare
  v_codes boolean := to_regclass('public.referrals') is not null;
  v_uses boolean := to_regclass('public.referral_redemptions') is not null;
begin
  if v_codes is distinct from v_uses then
    raise exception 'Partial referral baseline: investigate before creating or changing either table';
  end if;
  if not v_codes then
    create table public.referrals (
      user_id uuid primary key,
      code text not null unique,
      total_invited integer not null default 0,
      total_rewarded integer not null default 0,
      created_at timestamptz not null default now()
    );
    create table public.referral_redemptions (
      id uuid primary key default gen_random_uuid(),
      referrer_user_id uuid not null,
      referred_user_id uuid not null unique,
      rewarded boolean not null default false,
      rewarded_at timestamptz,
      created_at timestamptz not null default now()
    );
  end if;
end;
$preflight$;

-- Check exact canonical base columns even when pre-existing. ZD035 later
-- adds booking_id and credit_cents to referral_redemptions, and those extra
-- columns are allowed on a previously migrated staging database.
do $shape$
declare v_table text; v_column text; v_type text; v_required boolean;
begin
  for v_table,v_column,v_type,v_required in
    select * from (values
      ('referrals','user_id','uuid',true),
      ('referrals','code','text',true),
      ('referrals','total_invited','integer',true),
      ('referrals','total_rewarded','integer',true),
      ('referrals','created_at','timestamp with time zone',true),
      ('referral_redemptions','id','uuid',true),
      ('referral_redemptions','referrer_user_id','uuid',true),
      ('referral_redemptions','referred_user_id','uuid',true),
      ('referral_redemptions','rewarded','boolean',true),
      ('referral_redemptions','rewarded_at','timestamp with time zone',false),
      ('referral_redemptions','created_at','timestamp with time zone',true)
    ) x(t,c,typ,required)
  loop
    if not exists (
      select 1 from pg_class t join pg_namespace n on n.oid=t.relnamespace
      join pg_attribute a on a.attrelid=t.oid and a.attnum>0 and not a.attisdropped
      where n.nspname='public' and t.relname=v_table and a.attname=v_column
        and format_type(a.atttypid,a.atttypmod)=v_type and a.attnotnull=v_required
    ) then
      raise exception 'Referral schema differs from canonical base: %.%',v_table,v_column;
    end if;
  end loop;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.referrals'::regclass and c.contype='p'
      and pg_get_constraintdef(c.oid)='PRIMARY KEY (user_id)'
  ) or not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.referrals'::regclass and c.contype='u'
      and pg_get_constraintdef(c.oid)='UNIQUE (code)'
  ) or not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.referral_redemptions'::regclass and c.contype='p'
      and pg_get_constraintdef(c.oid)='PRIMARY KEY (id)'
  ) or not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.referral_redemptions'::regclass and c.contype='u'
      and pg_get_constraintdef(c.oid)='UNIQUE (referred_user_id)'
  ) then
    raise exception 'Canonical referral primary/unique constraints absent';
  end if;
end;
$shape$;

alter table public.referrals enable row level security;
alter table public.referral_redemptions enable row level security;

do $policies$
begin
  -- The legacy April "view by code USING(true)" was over-permissive. Never
  -- recreate it. The lookup in get-booking-quote uses service_role.
  if exists (select 1 from pg_policies where schemaname='public'
    and tablename in ('referrals','referral_redemptions')
    and policyname not in ('referrals_select_owner_or_admin','view own redemptions')) then
    raise exception 'Unexpected referral policy: manual RLS review required';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public'
    and tablename='referrals' and policyname='referrals_select_owner_or_admin') then
    create policy referrals_select_owner_or_admin on public.referrals
      for select to authenticated using (
        user_id=(select auth.uid()) or
        private.has_role((select auth.uid()), 'admin'::public.app_role)
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public'
    and tablename='referral_redemptions' and policyname='view own redemptions') then
    create policy "view own redemptions" on public.referral_redemptions
      for select to authenticated using (
        (select auth.uid())=referrer_user_id or
        (select auth.uid())=referred_user_id
      );
  end if;
end;
$policies$;

-- Writes are handled only by the Edge service role. Revoke bypass-capable
-- TRUNCATE even though owner-only RLS is on. The subsequent 20261015102137
-- grant migration asserts these exact end-state privileges again.
revoke all privileges on public.referrals, public.referral_redemptions
  from public, anon, authenticated;
grant select on public.referrals, public.referral_redemptions to authenticated;
grant all privileges on public.referrals, public.referral_redemptions to service_role;

-- Staging's April generator is preserved byte-for-byte; production receives
-- its missing function. Never replace an existing operational function silently.
do $create_code$
begin
  if to_regprocedure('public.gen_referral_code()') is null then
    execute $definition$
      create function public.gen_referral_code() returns text
      language plpgsql security definer set search_path=public as $generator$
      declare
        chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        result text;
        i integer;
      begin
        loop
          result := '';
          for i in 1..6 loop
            result := result || substr(chars, floor(random()*length(chars))::integer + 1, 1);
          end loop;
          exit when not exists (select 1 from public.referrals where code=result);
        end loop;
        return result;
      end;
      $generator$;
    $definition$;
  end if;
end;
$create_code$;

revoke all on function public.gen_referral_code() from public, anon, authenticated;
grant execute on function public.gen_referral_code() to service_role;

do $postconditions$
begin
  if exists (select 1 from pg_class c where c.oid in
    ('public.referrals'::regclass,'public.referral_redemptions'::regclass)
    and not c.relrowsecurity) then
    raise exception 'RLS disabled on reconstructed referral table';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='gen_referral_code'
      and pg_get_function_identity_arguments(p.oid)='' and p.prosecdef) then
    raise exception 'Referral code generator is absent or not SECURITY DEFINER';
  end if;
  if has_function_privilege('anon','public.gen_referral_code()','EXECUTE')
    or has_function_privilege('authenticated','public.gen_referral_code()','EXECUTE')
    or not has_function_privilege('service_role','public.gen_referral_code()','EXECUTE') then
    raise exception 'Referral generator has unsafe execution grants';
  end if;
  if has_table_privilege('anon','public.referrals','TRUNCATE')
    or has_table_privilege('anon','public.referral_redemptions','TRUNCATE')
    or has_table_privilege('authenticated','public.referrals','TRUNCATE')
    or has_table_privilege('authenticated','public.referral_redemptions','TRUNCATE')
    or has_table_privilege('authenticated','public.referrals','INSERT')
    or has_table_privilege('authenticated','public.referral_redemptions','INSERT')
    or not has_table_privilege('authenticated','public.referrals','SELECT')
    or not has_table_privilege('authenticated','public.referral_redemptions','SELECT') then
    raise exception 'Unsafe referral table ACLs remain';
  end if;
end;
$postconditions$;
commit;
