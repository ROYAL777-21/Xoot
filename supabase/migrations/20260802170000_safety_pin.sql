-- The PIN that guards cancelling a dispatched SOS.
--
-- Once an alert has gone out, the person most motivated to cancel it may be the person the
-- alert is about. A one-tap cancel is right during the countdown and wrong afterwards, so
-- after dispatch the cancel needs something only the account holder knows.
--
-- This is deliberately not the account password. A password is typed in front of other people
-- far more often, is likely reused, and is recoverable by anyone holding the unlocked phone
-- through an email reset. A short PIN set once, never displayed, and used only here is a
-- different secret with a different exposure profile.

begin;

create table if not exists public.user_safety_pins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- bcrypt via pgcrypto. Never the PIN itself, and never reversible.
  pin_hash text not null,
  -- Wrong attempts since the last success. Cleared on success.
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.user_safety_pins is
  'Hashed cancel-PIN for dispatched SOS alerts. No client may read or write this table; both '
  'setting and verifying go through SECURITY DEFINER functions so the hash never leaves the '
  'database and the failure counter cannot be reset by the person failing it.';

alter table public.user_safety_pins enable row level security;

-- No policy at all. Not even the owner reads their own row — there is nothing in it they need,
-- and a readable hash is an offline cracking target for a four-digit secret.
revoke all on public.user_safety_pins from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Setting a PIN
-- ---------------------------------------------------------------------------
create or replace function public.set_safety_pin(new_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  -- No caller, no PIN. A service-role session must not set a PIN on someone's behalf: the
  -- whole value of this secret is that only the account holder has ever seen it.
  if caller is null then
    raise exception 'set_safety_pin requires an authenticated session';
  end if;

  if new_pin is null or new_pin !~ '^[0-9]{4,8}$' then
    raise exception 'pin must be 4 to 8 digits';
  end if;

  insert into public.user_safety_pins (user_id, pin_hash, failed_attempts, locked_until, updated_at)
  values (caller, extensions.crypt(new_pin, extensions.gen_salt('bf', 10)), 0, null, now())
  on conflict (user_id) do update
    set pin_hash = excluded.pin_hash,
        failed_attempts = 0,
        locked_until = null,
        updated_at = now();

  return true;
end;
$$;

revoke all on function public.set_safety_pin(text) from public, anon;
grant execute on function public.set_safety_pin(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Verifying a PIN
-- ---------------------------------------------------------------------------
-- Callable by the service role only. The Edge Function is the only caller, which means the
-- attempt counter cannot be bypassed by hitting the RPC directly with a user token.
create or replace function public.verify_safety_pin(check_user_id uuid, check_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_row public.user_safety_pins%rowtype;
  matched boolean;
begin
  select * into record_row from public.user_safety_pins where user_id = check_user_id;

  -- No PIN set means no PIN gate. Refusing here would leave the alert uncancellable by anyone,
  -- including the person who raised it by accident, which is worse than the risk it prevents.
  -- The app prompts to set one after the first alert.
  if not found then
    return true;
  end if;

  if record_row.locked_until is not null and record_row.locked_until > now() then
    return false;
  end if;

  matched := record_row.pin_hash = extensions.crypt(check_pin, record_row.pin_hash);

  if matched then
    update public.user_safety_pins
      set failed_attempts = 0, locked_until = null
      where user_id = check_user_id;
    return true;
  end if;

  -- Five wrong attempts locks the PIN for fifteen minutes. That is a long time to stand over
  -- someone's phone, which is the point: the lock protects the alert, not the account.
  update public.user_safety_pins
    set failed_attempts = record_row.failed_attempts + 1,
        locked_until = case
          when record_row.failed_attempts + 1 >= 5 then now() + interval '15 minutes'
          else null
        end
    where user_id = check_user_id;

  return false;
end;
$$;

revoke all on function public.verify_safety_pin(uuid, text) from public, anon, authenticated;
grant execute on function public.verify_safety_pin(uuid, text) to service_role;

commit;
