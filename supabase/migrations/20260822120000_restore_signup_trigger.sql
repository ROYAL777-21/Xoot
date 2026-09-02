-- Production has no signup trigger, so a new user gets no profile and no role.
--
-- ── Measured on production 2026-08-22, not inferred ─────────────────────────────────────────
--     trigger on auth.users     (none)
--     handle_new_user exists    NO
--     auth.users rows           1
--     public.profiles rows      0
--     public.user_roles rows    0
--
-- **A real account has already signed up and has neither row.** Nothing in `src/` or
-- `supabase/functions/` ever inserts into `profiles` or `user_roles` — grep both trees — so this
-- trigger is the ONLY creation path. Without it `Profile.tsx` reads null and `RequireRole.tsx`
-- finds no role, so the account is signed in and inert.
--
-- Staging has both the function and the trigger. Production does not. That divergence is the
-- defect; the repo has declared this trigger since `20260421080011`.
--
-- ── Why the repo's original body cannot simply be re-run on production ──────────────────────
-- `20260421080011`'s version inserts into `public.user_reassignment_state`, and staging's
-- deployed copy also inserts into `public.referrals` and `public.zootcred_wallets`. **Production
-- has none of those three tables.** This is an AFTER INSERT trigger on `auth.users`, so an
-- exception inside it rolls back the signup — restoring the original verbatim would turn "signs
-- up with no profile" into "cannot sign up at all", which is strictly worse.
--
-- Confirmed present on BOTH projects: profiles, user_roles, loyalty_points, notifications.
-- Present on staging only: referrals, zootcred_wallets, user_reassignment_state.
--
-- ── Shape ───────────────────────────────────────────────────────────────────────────────────
-- The four shared tables are written with plain, greppable statements. The three staging-only
-- tables are guarded by `to_regclass` and written through `execute`, so this one file is correct
-- on both projects and stops staging silently losing referral rows. Every insert is
-- `on conflict do nothing`: a signup must never fail because a row already exists.
--
-- The schema-drift checker cannot catch this class. It finds a function whose body names a
-- relation that does not exist; it cannot find a function that should exist and does not. Recorded
-- in docs/release/next-session.md as a post-deploy check instead.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ── Present on both projects ──────────────────────────────────────────────────────────────
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  insert into public.loyalty_points (user_id)
  values (new.id)
  on conflict do nothing;

  insert into public.notifications (user_id, kind, title, body, link)
  values (new.id, 'welcome', 'Welcome to Xoot',
          'Your home, sorted. Book your first visit and earn XootCred.', '/app');

  -- ── Staging-only legacy tables. Guarded so production, which lacks all three, does not
  --    raise 42P01 and roll the signup back. ──────────────────────────────────────────────────
  if to_regclass('public.user_reassignment_state') is not null then
    execute 'insert into public.user_reassignment_state (user_id) values ($1) on conflict do nothing'
      using new.id;
  end if;

  if to_regclass('public.referrals') is not null
     and to_regprocedure('public.gen_referral_code()') is not null then
    execute 'insert into public.referrals (user_id, code) values ($1, public.gen_referral_code()) on conflict do nothing'
      using new.id;
  end if;

  if to_regclass('public.zootcred_wallets') is not null then
    execute 'insert into public.zootcred_wallets (user_id, balance) values ($1, 0) on conflict do nothing'
      using new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.handle_new_user() is
  'Creates the profile, role, loyalty and welcome-notification rows for a new auth user. Restored on production 2026-08-22, where it was absent and one account had already signed up with no profile and no role. Legacy tables that exist only on staging are guarded by to_regclass because this is an AFTER INSERT trigger on auth.users and a 42P01 inside it would roll back the signup itself.';
