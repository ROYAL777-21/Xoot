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
