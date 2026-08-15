-- `payment_records.provider` records how a record is BEING paid, and that changes over its life.
--
-- ── The defect this fixes, measured on both databases 2026-08-13 ────────────────────────────
-- `20260813180000_payfast_sole_payment_provider.sql` added:
--
--     alter table public.payment_records
--       add constraint payment_records_provider_check check (provider = 'payfast');
--
-- while the column's own definition, unchanged since 20260518123000, is:
--
--     provider text not null default 'manual_pending'
--
-- **The column default violates the column's constraint.** Read from staging and production
-- rather than inferred:
--
--     payment_records_provider_check   CHECK ((provider = 'payfast'::text))
--     provider  column_default 'manual_pending'::text  is_nullable NO
--
-- So every insert that does not explicitly say `payfast` is rejected. Six writers do exactly that:
--
--     supabase/functions/create-booking/index.ts          every booking
--     supabase/functions/create-booking-request/index.ts  every booking request
--     supabase/functions/care-plus-membership/index.ts    every Care+ signup
--     supabase/functions/ops-workflow/index.ts            gift cleans
--     supabase/functions/split-booking-fare/index.ts      fare splits
--     src/lib/operations.ts                               the client-side helper
--
-- Nothing could be booked, on either environment, from the moment that migration applied.
-- `payment_records` held 0 rows, so nothing is corrupted — but nothing could be created either.
--
-- ── Why the original was a reasonable mistake ───────────────────────────────────────────────
-- `provider = 'payfast'` is right for `payment_provider_capabilities`, where a row IS a claim
-- about one provider, and that constraint is deliberately left alone. It is wrong for
-- `payment_records`, where the column is a lifecycle field on an individual payment: a record is
-- created before any payment route is chosen, and only later becomes a PayFast checkout or a bank
-- transfer. Constraining a lifecycle column to its final value forbids its initial one.
--
-- ── The three legal values ──────────────────────────────────────────────────────────────────
--     manual_pending   created, no payment route chosen yet. The column default, and what all six
--                      writers insert. A record in this state has never been chargeable.
--     payfast          routed to PayFast hosted checkout by `create-payment-session`.
--     manual_eft       paid by bank transfer and confirmed by an admin against the statement.
--                      Founder decision 2026-08-13 to keep EFT as a fallback, so money can still
--                      be taken on the day PayFast onboarding stalls.
--
-- `src/lib/payment-provider-lifecycle.test.ts` reads this constraint and every writer, and fails
-- if a seventh writer ever inserts a value this list does not carry.

-- Dropped BY DEFINITION rather than by name. This is the fifth instance of the pattern in three
-- days and the reasoning is the other session's, restated because it applies here too: an inline
-- `check (...)` gets an auto-generated name, and `drop constraint if exists <guess>` silently does
-- nothing when the guess is wrong — leaving the old constraint in force while the `add` succeeds
-- and the migration reports success. Matching on the definition cannot miss it.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where contype = 'c'
      and conrelid = 'public.payment_records'::regclass
      and pg_get_constraintdef(oid) ~* 'provider'
      and pg_get_constraintdef(oid) !~* 'provider_reference'
  loop
    execute format('alter table public.payment_records drop constraint %I', c.conname);
    raise notice 'dropped % on payment_records', c.conname;
  end loop;
end $$;

-- Re-added validating, not `not valid`: there are no rows to scan, and leaving a table permanently
-- carrying an unverified constraint is a worse resting state than ordering the statements right.
alter table public.payment_records
  add constraint payment_records_provider_check
  check (provider in ('manual_pending', 'payfast', 'manual_eft'));

comment on column public.payment_records.provider is
  'How this payment is being taken. manual_pending = created, no route chosen (default); payfast = routed to hosted checkout; manual_eft = bank transfer confirmed by an admin. Constrained by payment_records_provider_check.';
