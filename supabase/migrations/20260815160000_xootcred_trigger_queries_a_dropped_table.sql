-- `check_xootcred_balance` queries a table that no longer exists, so every XootCred debit fails.
--
-- ── Measured on production 2026-08-15, not inferred ─────────────────────────────────────────
-- The ZD-029 rename moved `zootcred_ledger` to `xootcred_ledger` and renamed the trigger function
-- with `alter function ... rename to`. **`ALTER FUNCTION ... RENAME` changes the name and not one
-- character of the body.** The body still reads:
--
--     from public.zootcred_ledger
--
-- and `public.zootcred_ledger` does not exist. Proven by performing the insert rather than
-- reasoning about it:
--
--     insert into public.xootcred_ledger (user_id, amount, direction, reason)
--     values (..., 50, 'debit', 'redemption');
--
--     ERROR: 42P01: relation "public.zootcred_ledger" does not exist
--     CONTEXT: PL/pgSQL function check_xootcred_balance() line 17 at SQL statement
--
-- ── What it breaks ──────────────────────────────────────────────────────────────────────────
-- The lookup sits inside `if new.direction = 'debit' or new.amount < 0`. Credits return before
-- reaching it, so **awarding** XootCred works and **spending** it does not. `create-booking`
-- writes `direction: 'debit'` for a redemption, so a customer applying their credit to a booking
-- gets a 500 and the whole booking fails with it.
--
-- Zero rows in `xootcred_ledger` on both projects, so nobody has hit it yet.
--
-- ── Why this is the NINTH instance and the guard did not catch it ───────────────────────────
-- The other eight were CHECK constraints whose bodies named the old brand, and
-- `src/lib/constraint-writer-parity.test.ts` now covers that shape. **This one is a different
-- shape**: a function body referencing a renamed *table*. No repo-side test can see it, because the
-- repo's migration files are correct — the drift is between the repo and what is actually installed
-- in the database, and only a live query reveals it.
--
-- Recorded plainly: the constraint guard would not have caught this, and does not now. The check
-- that finds this class is
--
--     select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname in ('public','private') and p.prosrc ~* '\mzoot|zooter';
--
-- run against a live database, which is why it belongs in `docs/release/next-session.md` as a
-- post-deploy check rather than in the suite.
--
-- ── Scope ───────────────────────────────────────────────────────────────────────────────────
-- Body only. The trigger is still named `zootcred_balance_check` and stays that way: trigger and
-- constraint NAMES are internal identifiers never referenced by application code, which is the
-- reasoning ZD-029 applied and was right about. It was only ever wrong about bodies.
--
-- `booking_has_no_assigned_zooter` in `private.can_create_masked_call` also still names the old
-- brand and is also deliberately left: it is a reason code returned to callers, so renaming it is an
-- API change rather than a cleanup. Listed here so the next person who greps does not think it was
-- missed.

create or replace function public.check_xootcred_balance()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
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
    ), 0) into v_balance
    -- The single character this migration exists to change.
    from public.xootcred_ledger
    where user_id = new.user_id
      and (expires_at is null or expires_at > now())
      and coalesce(status, 'available') not in ('pending', 'expired', 'cancelled');

    if v_balance - v_debit < 0 then
      raise exception 'XootCred balance cannot go negative. Available: %', v_balance;
    end if;
  end if;

  return new;
end;
$function$;
