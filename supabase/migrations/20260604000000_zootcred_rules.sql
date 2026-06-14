-- Phase 8: Care+ state support and ZootCred ledger integrity.
-- ZootCred is authoritative from immutable ledger rows, never from wallet columns.

do $$
begin
  alter type public.subscription_status add value if not exists 'pending_payment';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.subscription_status add value if not exists 'past_due';
exception
  when duplicate_object then null;
end $$;

alter table public.user_subscriptions
  add column if not exists checkout_url text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists favourite_zooter_id uuid references public.zooters(id) on delete set null;

do $$
declare
  v_verified_expr text;
  v_background_checked_expr text;
  v_airbnb_expr text;
  v_premium_expr text;
  v_languages_expr text;
begin
  v_verified_expr := case
    when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zooters' and column_name = 'verified')
      then 'verified'
    when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zooters' and column_name = 'verification_status')
      then '(verification_status in (''verified'', ''approved'', ''cleared''))'
    else 'false'
  end;

  v_background_checked_expr := case
    when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zooters' and column_name = 'background_checked')
      then 'background_checked'
    else '(background_check_status in (''cleared'', ''approved'', ''verified''))'
  end;

  v_airbnb_expr := case
    when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zooters' and column_name = 'airbnb_specialist')
      then 'airbnb_specialist'
    when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zooters' and column_name = 'airbnb_capable')
      then 'airbnb_capable'
    else 'false'
  end;

  v_premium_expr := case
    when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zooters' and column_name = 'premium_care_plus')
      then 'premium_care_plus'
    when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zooters' and column_name = 'premium_care_awarded')
      then 'premium_care_awarded'
    else 'false'
  end;

  v_languages_expr := case
    when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zooters' and column_name = 'languages_spoken')
      then 'languages_spoken'
    when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zooters' and column_name = 'languages')
      then 'languages'
    else '''{}''::text[]'
  end;

  execute format(
    'create or replace view public.zooters_public
      with (security_invoker = true) as
      select
        id,
        name,
        role,
        rating,
        jobs_completed,
        hourly_rate,
        photo_url,
        tags,
        distance_mi,
        is_zotm,
        %1$s as verified,
        %2$s as background_checked,
        background_check_status,
        %3$s as airbnb_specialist,
        %4$s as premium_care_plus,
        repeat_client_count,
        job_completion_rate,
        reliability_score,
        years_experience,
        suburb_coverage,
        transport,
        supplies_owned,
        %5$s as languages_spoken,
        pet_comfort
      from public.zooters
      where coalesce(active, true) = true',
    v_verified_expr,
    v_background_checked_expr,
    v_airbnb_expr,
    v_premium_expr,
    v_languages_expr
  );
end $$;

grant select on public.zooters_public to anon, authenticated;

alter table public.zootcred_ledger
  add column if not exists booking_id uuid references public.bookings(id) on delete set null,
  add column if not exists direction text,
  add column if not exists status text not null default 'available',
  add column if not exists expires_at timestamptz;

alter table public.support_tickets
  drop constraint if exists support_tickets_status_check;

alter table public.support_tickets
  add constraint support_tickets_status_check
  check (status in ('open', 'in_review', 'escalated', 'resolved', 'closed'));

do $$
begin
  alter table public.zootcred_ledger
    add constraint zootcred_direction_valid
    check (direction is null or direction in ('credit', 'debit'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.zootcred_ledger
    add constraint zootcred_status_valid
    check (status in ('pending', 'available', 'redeemed', 'expired', 'cancelled'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.zootcred_ledger
    add constraint zootcred_direction_amount_valid
    check (direction is null or amount >= 0);
exception
  when duplicate_object then null;
end $$;

create or replace function public.check_zootcred_balance() returns trigger as $$
declare
  v_balance numeric;
  v_debit numeric;
begin
  if coalesce(new.status, 'available') in ('pending', 'expired', 'cancelled') then
    return new;
  end if;

  if new.expires_at is not null and new.expires_at <= now() then
    return new;
  end if;

  if new.direction = 'debit' or new.amount < 0 then
    v_debit := abs(new.amount);

    select coalesce(sum(
      case
        when direction = 'debit' then -abs(amount)
        when direction = 'credit' then abs(amount)
        else amount
      end
    ), 0)
      into v_balance
    from public.zootcred_ledger
    where user_id = new.user_id
      and (expires_at is null or expires_at > now())
      and coalesce(status, 'available') not in ('pending', 'expired', 'cancelled');

    if v_balance - v_debit < 0 then
      raise exception 'ZootCred balance cannot go negative. Available: %', v_balance;
    end if;
  end if;

  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists zootcred_balance_check on public.zootcred_ledger;
create trigger zootcred_balance_check
  before insert on public.zootcred_ledger
  for each row
  when (new.amount < 0 or new.direction = 'debit')
  execute function public.check_zootcred_balance();
