-- Follow-up hardening from Supabase security advisor.
-- Public buckets already serve public object URLs; broad SELECT policies allow
-- bucket listing and are not required for public asset delivery.

drop policy if exists "zooter_avatars_public_read" on storage.objects;
drop policy if exists "marketing_assets_public_read" on storage.objects;

do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    revoke execute on function public.handle_new_user() from public;
    revoke execute on function public.handle_new_user() from anon, authenticated;
  end if;

  if to_regprocedure('public.touch_updated_at()') is not null then
    revoke execute on function public.touch_updated_at() from public;
    revoke execute on function public.touch_updated_at() from anon, authenticated;
  end if;

  if to_regprocedure('public.gen_referral_code()') is not null then
    revoke execute on function public.gen_referral_code() from public;
    revoke execute on function public.gen_referral_code() from anon, authenticated;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.views
    where table_schema = 'public'
      and table_name = 'booking_zooter_profiles'
  ) then
    execute 'alter view public.booking_zooter_profiles set (security_invoker = true)';
  end if;
end $$;

create or replace function public.touch_native_push_subscriptions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.touch_native_push_subscriptions_updated_at() is
  'Maintains native push subscription timestamps with a fixed search_path.';
