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
-- ⚠️ The unique key is (control_key, ENVIRONMENT), not control_key alone, and `control_type` is a
-- constrained NOT NULL. The first version of this migration got both wrong and failed the staging
-- apply at statement 1 with SQLSTATE 42P10 — "no unique or exclusion constraint matching the ON
-- CONFLICT specification". Recorded because the error names the ON CONFLICT clause and not the
-- missing columns, which sends you looking in the wrong place.
--
-- `environment = 'all'` and `control_type = 'provider_gate'` match every existing payments row;
-- they were read from the live table rather than guessed.
--
delete from public.operational_controls
 where control_key in ('payments.hosted_checkout.stitch', 'payments.hosted_checkout.ozow');

insert into public.operational_controls (control_key, environment, control_type, enabled, description)
values (
  'payments.hosted_checkout.payfast',
  'all',
  'provider_gate',
  false,
  'Allows PayFast hosted checkout only after signature, ITN callback and reconciliation smoke tests pass.'
)
on conflict (control_key, environment) do update
  set description = excluded.description,
      control_type = excluded.control_type;

-- The generic gate still names the providers it was written for.
update public.operational_controls
   set description = 'Allows PayFast hosted checkout creation after provider signature and reconciliation are approved.'
 where control_key = 'payments.provider_checkout';

-- ── Provider capability rows ────────────────────────────────────────────────────────────────
-- One row per environment, both starting blocked. `verified_at` stays null until a real sandbox
-- payment round-trips: a row claiming readiness before that is the kind of assertion this repo has
-- been bitten by before.
delete from public.payment_provider_capabilities where provider in ('stitch', 'ozow');

insert into public.payment_provider_capabilities (
  provider, environment, reconciliation_reference_format, metadata
)
values
  ('payfast', 'staging',    'XOOT-{PROVIDER}-{BOOKING8}-{PAYMENT8}',
   '{"status": "blocked_until_provider_credentials_and_signed_smoke_test", "sandbox": true}'::jsonb),
  ('payfast', 'production', 'XOOT-{PROVIDER}-{BOOKING8}-{PAYMENT8}',
   '{"status": "blocked_until_provider_credentials_and_signed_smoke_test", "sandbox": false}'::jsonb)
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
