-- PayFast becomes the only payment provider. Stitch and Ozow are removed.
-- Founder decision 2026-08-13: "i will be using payfast instead of stitch, replace that company wide".
--
-- ── Why removal rather than adding a third row ──────────────────────────────────────────────
-- Neither Stitch nor Ozow was ever configured: `payments.hosted_checkout.stitch` and
-- `.ozow` are both false in production, `payments.provider_checkout` is false, and there are
-- **zero payment records** on either project. So there is nothing to migrate and nothing to keep
-- compatible — leaving the rows would mean three integrations to secure and test, two of which
-- have never accepted a cent and never will.
--
-- ── The reconciliation reference format is unchanged ────────────────────────────────────────
-- `XOOT-{PROVIDER}-{BOOKING8}-{PAYMENT8}` still holds, and the `payment_provider_reference_format_safe`
-- constraint added on 2026-08-13 still pins the `XOOT-%` prefix. `{PROVIDER}` becomes `PAYFAST`
-- rather than the format changing shape.

-- ── FIRST: the CHECK constraints that name the providers ────────────────────────────────────
--
-- ⚠️ Attempt 3 failed here, at statement 4, on
-- `payment_provider_capabilities_provider_check` — `check (provider in ('stitch', 'ozow'))`.
-- Inserting a `payfast` row is rejected by a constraint that predates the decision.
--
-- This is the FOURTH instance of one pattern in two days: a check constraint whose BODY spells out
-- a value the product has since renamed. The ZD-029 rename hit three of them
-- (`payment_provider_reference_format_safe`, `messages.sender_type`,
-- `xoot_concierge_feedback.role`) and I wrote up the category at the time — then wrote this
-- migration without looking for it here. Worth naming plainly: knowing a class of defect exists is
-- not the same as checking for it.
--
-- Three tables carry one:
--   payment_provider_capabilities.provider   in ('stitch','ozow')
--   payment_records.provider                 in ('stitch','ozow')
--   provider_events.provider                 in ('stitch','ozow','twilio','brevo',…)   ← keep the
--                                            non-payment sources, swap only the payment ones
--
-- Dropped BY DEFINITION rather than by name, for the reason established during the rename: an
-- inline `check (…)` gets an auto-generated name, and `drop constraint if exists <guess>` silently
-- does nothing when the guess is wrong — leaving the old constraint in place while the `add`
-- succeeds and the migration reports success.
do $$
declare c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype = 'c'
      and connamespace = 'public'::regnamespace
      and conrelid in (
        'public.payment_provider_capabilities'::regclass,
        'public.payment_records'::regclass,
        'public.provider_events'::regclass
      )
      and pg_get_constraintdef(oid) ~* '''(stitch|ozow)'''
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
    raise notice 'dropped % on %', c.conname, c.tbl;
  end loop;
end $$;

-- ── The control that gates checkout ─────────────────────────────────────────────────────────
-- Named per-provider, so the old keys go and a PayFast one arrives DISABLED. Enabling it is a
-- founder action after a sandbox payment has completed — see NEEDS-FOUNDER.md.
--
-- ⚠️ THIS INSERT FAILED THE STAGING APPLY TWICE. Both times the cause was writing it against an
-- assumed table shape instead of a read one, and the second time was worse than the first because
-- the lesson of the first had not been applied.
--
--   attempt 1: `on conflict (control_key)` — the unique key is (control_key, ENVIRONMENT).
--              SQLSTATE 42P10, "no unique or exclusion constraint matching the ON CONFLICT
--              specification". The message names the conflict target and says nothing about the
--              column list, which is exactly where the real problem also was.
--   attempt 2: conflict target fixed, but `owner` — NOT NULL, no default — was still missing.
--
-- The full column list below is copied from the migration that seeded these rows,
-- `20260630005420_phase7_payments_payouts_foundation.sql:392`, so it matches by construction rather
-- than by recollection. `owner = 'finance-security'` and the `launch_phase` metadata are what every
-- other payments control carries.
--
-- The lesson worth keeping: `supabase db push` prints the failing STATEMENT prominently and the
-- error line above it. Reading the statement and not the error is how the same migration fails
-- twice.
--
delete from public.operational_controls
 where control_key in ('payments.hosted_checkout.stitch', 'payments.hosted_checkout.ozow');

insert into public.operational_controls (
  control_key, control_type, environment, enabled, description, owner, metadata
)
values (
  'payments.hosted_checkout.payfast',
  'provider_gate',
  'all',
  false,
  'Allows PayFast hosted checkout only after signature, ITN callback and reconciliation smoke tests pass.',
  'finance-security',
  '{"launch_phase":"phase_7","provider":"payfast"}'::jsonb
)
on conflict (control_key, environment) do update
  set description = excluded.description,
      control_type = excluded.control_type,
      metadata = excluded.metadata;

-- The generic gate still names the providers it was written for.
update public.operational_controls
   set description = 'Allows PayFast hosted checkout creation after provider signature and reconciliation are approved.'
 where control_key = 'payments.provider_checkout';

-- ── Provider capability rows ────────────────────────────────────────────────────────────────
-- One row per environment, both starting blocked. `verified_at` stays null until a real sandbox
-- payment round-trips: a row claiming readiness before that is the kind of assertion this repo has
-- been bitten by before.
delete from public.payment_provider_capabilities where provider in ('stitch', 'ozow');

-- Column list copied from the seed at `20260630005420…:414` for the same reason as above: every
-- readiness flag is stated rather than left to a default that may not exist. All false — nothing
-- about PayFast is verified until a sandbox payment has round-tripped.
insert into public.payment_provider_capabilities (
  provider,
  environment,
  hosted_checkout_enabled,
  webhook_signature_verified,
  callback_urls_verified,
  reconciliation_verified,
  payout_supported,
  reconciliation_reference_format,
  metadata
)
values
  ('payfast', 'staging',    false, false, false, false, false, 'XOOT-{PROVIDER}-{BOOKING8}-{PAYMENT8}',
   '{"status":"blocked_until_provider_credentials_and_signed_smoke_test","sandbox":true}'::jsonb),
  ('payfast', 'production', false, false, false, false, false, 'XOOT-{PROVIDER}-{BOOKING8}-{PAYMENT8}',
   '{"status":"blocked_until_provider_credentials_and_signed_smoke_test","sandbox":false}'::jsonb)
on conflict (provider, environment) do update
  set reconciliation_reference_format = excluded.reconciliation_reference_format,
      metadata = excluded.metadata;

-- ── Historical payment records ──────────────────────────────────────────────────────────────
-- There are none, on either project — checked before writing this rather than assumed. The update
-- is here so that if this migration is ever applied to a database that DOES hold rows, they are
-- relabelled rather than left pointing at a provider that no longer exists in the enum of allowed
-- event sources.
update public.payment_records set provider = 'payfast' where provider in ('stitch', 'ozow');
update public.provider_events set provider = 'payfast' where provider in ('stitch', 'ozow');

-- ── LAST: put the CHECK constraints back, naming payfast ────────────────────────────────────
-- After the data moves, so they validate rather than being added `not valid`. Original names kept,
-- so anything referring to them by name still resolves.
alter table public.payment_provider_capabilities
  add constraint payment_provider_capabilities_provider_check
  check (provider = 'payfast');

alter table public.payment_records
  add constraint payment_records_provider_check
  check (provider = 'payfast');

-- `provider_events` is the shared ledger for every external event source, not just payments — the
-- non-payment entries stay exactly as they were and only the payment providers change.
alter table public.provider_events
  add constraint provider_events_provider_check
  check (provider in (
    'payfast', 'twilio', 'brevo', 'openai', 'mapbox', 'expo', 'cloudflare', 'hostinger',
    'airtable', 'internal'
  ));
