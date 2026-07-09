# Rollback Runbook

Reviewed: 2026-07-02

## Web Rollback

1. Identify last known good commit/build artifact.
2. Stop current deployment if still running.
3. Re-run build with existing public env values.
4. Verify home, app shell, auth callback, booking, Care+, Concierge, Articles, legal pages.
5. Record rollback commit/build ID and reason.

## Supabase Rollback

- Prefer forward fixes for database changes.
- Do not edit `supabase_migrations` directly.
- Do not broad-run `db push` against production.
- For function regressions, redeploy last known good function version.
- For operational controls, disable the feature flag/control row first, then patch.
- For metadata repair, use only the guarded repair helper with local credentials and plan review.

## Mobile Rollback

1. Disable unsafe server-side controls if the app binary is already distributed.
2. Use EAS Update only for JS-safe rollback paths; do not assume it can fix native config or plugin defects.
3. Submit/store-roll back only after app-store rules and impact are reviewed.
4. Verify widgets, deep links, push, auth, booking, and Concierge after rollback.

## Provider Rollback

- Disable provider control flags before changing dashboards.
- Revoke or rotate bad credentials.
- Revert webhook endpoints only after signed smoke tests.
- Avoid duplicate sends/charges by checking outbox and provider idempotency records.
