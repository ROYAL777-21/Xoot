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
delete from public.operational_controls
 where control_key in ('payments.hosted_checkout.stitch', 'payments.hosted_checkout.ozow');

insert into public.operational_controls (control_key, enabled, description)
values (
  'payments.hosted_checkout.payfast',
  false,
  'PayFast hosted checkout. Disabled until a sandbox payment has completed end to end and confirm-payment has recorded it.'
)
on conflict (control_key) do update
  set description = excluded.description;

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
