-- The XootCred balance trigger queried a table ZD-029 had dropped.
--
-- ⚠️ RESTORED FROM PRODUCTION 2026-08-20, NOT AUTHORED HERE.
--
-- This migration was applied to production as version `20260815160000` and existed in **no
-- branch** — not `main`, not any feature branch. `supabase/migrations/**` could therefore no
-- longer rebuild the database: a fresh environment built from this directory would have been
-- missing this fix entirely, and nothing would have said so.
--
-- The body below is the exact SQL production ran, read back from
-- `supabase_migrations.schema_migrations.statements` for this version. It is committed at its own
-- version so `db push` recognises it as already applied and skips it, which is what makes the
-- repository whole again without re-running anything.
--
-- ── Authorship ──────────────────────────────────────────────────────────────────
-- 🚢 Release & Infrastructure wrote and applied this; `supabase/migrations/**` is their path.
-- Correctness & Safety restored the file only, changing not one character of the SQL, because a
-- migrations directory that cannot rebuild the database is a correctness problem regardless of
-- whose path it lives in. Flagged in the worklog per rule 3.
--
-- ── What it fixes ───────────────────────────────────────────────────────────────
-- `check_xootcred_balance()` is a trigger function, so its body is stored as TEXT and a table
-- rename does not rewrite it. ZD-029 renamed `zootcred_ledger` to `xootcred_ledger`; this function
-- kept selecting from the old name and therefore raised on every insert that could spend credit.
-- The same class as the two `private.*` function bodies fixed in `20260814170000`.

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
