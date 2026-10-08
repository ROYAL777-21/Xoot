-- Transaction foundation only: no booking writer, backfill, payment or enablement.
-- Future RPCs MUST pre-acquire the complete account set, sorted by UUID, before
-- reading benefit facts or taking booking/assignment/worker locks. These row
-- triggers are backstops for old writers; multi-row/multi-account legacy writes
-- can deadlock after taking their source-row locks. Retry the WHOLE transaction
-- on 40P01/40001. Never continue with facts read before acquiring these guards.
create schema if not exists private;

create table private.booking_account_guards (
  user_id uuid primary key,
  version bigint not null default 1 check (version > 0)
);
-- No FK/cascade: guard identity survives account deletion and also covers empty
-- ledgers and the auth signup transaction before other account rows exist.
alter table private.booking_account_guards enable row level security;
revoke all on private.booking_account_guards from public, anon, authenticated, service_role;
grant select, insert, update on private.booking_account_guards to service_role;
create policy booking_account_guards_service on private.booking_account_guards
  for all to service_role using (true) with check (true);
grant usage on schema private to service_role;

create function private.lock_booking_accounts(p_user_ids uuid[])
returns void
language plpgsql volatile security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select distinct account_id from pg_catalog.unnest(p_user_ids) as accounts(account_id)
    where account_id is not null order by account_id
  loop
    -- A real version change is essential. SELECT FOR UPDATE alone leaves an old
    -- REPEATABLE READ snapshot usable; this upsert instead raises 40001 when a
    -- competing transaction has changed the guard since that snapshot.
    insert into private.booking_account_guards as guards (user_id) values (v_user_id)
    on conflict (user_id) do update set version = guards.version + 1;
  end loop;
end;
$function$;
revoke all on function private.lock_booking_accounts(uuid[]) from public, anon, authenticated, service_role;
grant execute on function private.lock_booking_accounts(uuid[]) to service_role;
comment on function private.lock_booking_accounts(uuid[]) is
  'Service transaction entry: acquire complete distinct sorted account set before reading benefits or locking source rows; retry whole transactions on 40001/40P01.';

create function private.booking_credit_effect(
  p_amount numeric, p_direction text, p_status text, p_expires_at timestamptz, p_at timestamptz
) returns numeric
language plpgsql immutable security invoker
set search_path = ''
as $function$
begin
  if coalesce(p_status, 'available') in ('pending', 'expired', 'cancelled')
    or p_expires_at <= p_at then return 0; end if;
  -- PostgreSQL numeric NaN compares above ordinary numbers, so a naive
  -- balance < 0 check would silently permit spending against corrupt credit.
  if p_amount is null or p_amount in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) then
    raise exception using errcode = '23514', message = 'Invalid active XootCred amount';
  end if;
  return case
    when p_direction = 'debit' then -abs(p_amount)
    -- Typed redeemed credits cannot fund new spending: matches quote facts.
    -- The older display summary counts these; this migration does not rewrite
    -- historical rows or the UI. Null-direction signed legacy rows retain their
    -- prior meaning and inactive/expiry rules.
    when p_direction = 'credit' and coalesce(p_status, 'available') = 'redeemed' then 0
    when p_direction = 'credit' then abs(p_amount)
    else p_amount
  end;
end;
$function$;
revoke all on function private.booking_credit_effect(numeric,text,text,timestamptz,timestamptz)
  from public, anon, authenticated, service_role;

create function private.guard_booking_benefit_write()
returns trigger
language plpgsql volatile security definer
set search_path = ''
as $function$
declare
  v_accounts uuid[] := '{}'::uuid[];
  v_new_effect numeric;
  v_old_effect numeric := 0;
  v_balance numeric;
  v_old_id uuid;
  v_old_user_id uuid;
  v_at timestamptz;
begin
  -- No caller-selected table lookup or dynamic SQL. The outer table privileges
  -- and RLS authorize the original write. This restricted definer only changes
  -- internal guards and checks balance, so harmless customer booking updates and
  -- owner-context auth referral seeding need no private-table/function grants.
  if tg_table_schema <> 'public' or tg_when <> 'BEFORE' or tg_level <> 'ROW'
    or tg_op not in ('INSERT', 'UPDATE', 'DELETE')
    or tg_table_name not in ('xootcred_ledger', 'user_subscriptions',
      'referral_redemptions', 'referrals', 'bookings') then
    raise exception using errcode = '42501', message = 'Unsupported benefit guard context';
  end if;
  if tg_table_name = 'referral_redemptions' then
    if tg_op <> 'INSERT' then
      v_accounts := v_accounts || array[old.referrer_user_id, old.referred_user_id];
    end if;
    if tg_op <> 'DELETE' then
      v_accounts := v_accounts || array[new.referrer_user_id, new.referred_user_id];
    end if;
  else
    if tg_op <> 'INSERT' then v_accounts := v_accounts || array[old.user_id]; end if;
    if tg_op <> 'DELETE' then v_accounts := v_accounts || array[new.user_id]; end if;
  end if;
  perform private.lock_booking_accounts(v_accounts);
  -- A request can wait across an expiry boundary. Freeze one fresh timestamp
  -- only AFTER its guards are acquired, for both the new spend and ledger sum.
  v_at := pg_catalog.clock_timestamp();

  if tg_table_name = 'xootcred_ledger' and tg_op <> 'DELETE' then
    v_new_effect := private.booking_credit_effect(new.amount, new.direction, new.status, new.expires_at, v_at);
    if tg_op = 'UPDATE' then
      v_old_id := old.id;
      v_old_user_id := old.user_id;
      if v_new_effect < 0 then
        v_old_effect := private.booking_credit_effect(old.amount, old.direction, old.status, old.expires_at, v_at);
      end if;
    end if;
    -- Check only newly activated, enlarged, or moved active spending. Do not
    -- reject reductions/inactive cleanup just because historical credit expiry
    -- has left an account negative. No new expiry/reversal policy is introduced.
    if v_new_effect < 0 and (tg_op = 'INSERT'
      or new.user_id is distinct from v_old_user_id or v_new_effect < v_old_effect) then
      -- Separate volatile PL/pgSQL statement AFTER the blocking upsert obtains a
      -- fresh READ COMMITTED snapshot. Higher isolation aborts at the upsert.
      select coalesce(sum(private.booking_credit_effect(
        ledger.amount, ledger.direction, ledger.status, ledger.expires_at, v_at)), 0)
      into v_balance from public.xootcred_ledger as ledger
      where ledger.user_id = new.user_id
        and (v_old_id is null or ledger.id <> v_old_id);
      if v_balance + v_new_effect < 0 then
        raise exception using errcode = '23514', message = 'Insufficient available XootCred';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;
revoke all on function private.guard_booking_benefit_write() from public, anon, authenticated, service_role;

-- Retire the old INSERT-only, unlocked check. Leave its historical function in
-- place for schema compatibility, with no application execution grant or trigger.
drop trigger zootcred_balance_check on public.xootcred_ledger;
revoke all on function public.check_xootcred_balance() from public, anon, authenticated, service_role;

create trigger a00_booking_benefit_guard before insert or update or delete on public.xootcred_ledger
  for each row execute function private.guard_booking_benefit_write();
create trigger a00_booking_benefit_guard before insert or update or delete on public.user_subscriptions
  for each row execute function private.guard_booking_benefit_write();
create trigger a00_booking_benefit_guard before insert or update or delete on public.referral_redemptions
  for each row execute function private.guard_booking_benefit_write();
create trigger a00_booking_benefit_guard before insert or update or delete on public.referrals
  for each row execute function private.guard_booking_benefit_write();
create trigger a00_booking_benefit_guard before insert or update or delete on public.bookings
  for each row execute function private.guard_booking_benefit_write();

-- TRUNCATE skips row triggers and RLS. Intentional cleanup must use guarded
-- DELETE. Staging metadata on 2026-09-29 showed these legacy bulk/trigger grants
-- on anon/authenticated; neither is a legitimate customer application operation.
revoke truncate, trigger on public.xootcred_ledger, public.user_subscriptions,
  public.referral_redemptions, public.referrals, public.bookings from anon, authenticated;
create function private.reject_booking_benefit_truncate()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  raise exception using errcode = '42501', message = 'Benefit tables require guarded DELETE, not TRUNCATE';
end;
$function$;
revoke all on function private.reject_booking_benefit_truncate() from public, anon, authenticated, service_role;
create trigger booking_benefit_no_truncate before truncate on public.xootcred_ledger
  for each statement execute function private.reject_booking_benefit_truncate();
create trigger booking_benefit_no_truncate before truncate on public.user_subscriptions
  for each statement execute function private.reject_booking_benefit_truncate();
create trigger booking_benefit_no_truncate before truncate on public.referral_redemptions
  for each statement execute function private.reject_booking_benefit_truncate();
create trigger booking_benefit_no_truncate before truncate on public.referrals
  for each statement execute function private.reject_booking_benefit_truncate();
create trigger booking_benefit_no_truncate before truncate on public.bookings
  for each statement execute function private.reject_booking_benefit_truncate();
