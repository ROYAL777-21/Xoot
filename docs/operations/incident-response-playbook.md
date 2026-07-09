# Incident Response Playbook

Reviewed: 2026-07-02

## First 15 Minutes

1. Classify severity using `docs/operations/incident-severity-matrix.md`.
2. Preserve evidence: timestamps, user IDs, booking IDs, request IDs, provider event IDs, commit/build IDs, and logs.
3. Disable the smallest unsafe control or provider path.
4. Stop deploys if production integrity, payments, secrets, or sensitive household data may be affected.
5. Notify founder/engineering owner and legal/trust/finance owner where relevant.

## Containment

- Secret leak: revoke and rotate, redeploy, audit recent use.
- Payment/payout issue: disable payment/payout control, reconcile provider records, block duplicate processing.
- Household access leak: revoke sensitive access, notify trust owner, review access logs, contact affected users if required.
- Auth/admin issue: revoke sessions, disable admin action path, require MFA reset if needed.
- Provider webhook issue: reject traffic, rotate webhook secret, replay only verified idempotent events.

## Recovery

1. Patch in a branch or controlled ops shell.
2. Verify in staging or with a narrow production-safe readback.
3. Run the relevant regression matrix checks.
4. Re-enable gradually.
5. Write the post-incident summary and follow-up tasks.

## Do Not Do

- Do not paste secrets or sensitive evidence into public channels.
- Do not broad-run `supabase db push` to repair metadata.
- Do not manually mark payment/refund/payout success without audit.
- Do not replay dead letters until cause and idempotency are understood.
