# Staging Role Smoke Evidence

Date: 2026-06-28
Project: `fxmxyabdjqviqbcxmvlp`

The staging role smoke was run through the authenticated Supabase connector using deterministic staging-only auth users and fixtures. It did not use or print provider secrets.

## Result

7 pass / 0 fail

| Check | Result | Evidence |
| --- | --- | --- |
| Admin can read operational controls | Pass | `admin rows=6` |
| Assigned Zooter can access sensitive data inside window | Pass | `can_access=true` |
| Client cannot access sensitive data as Zooter | Pass | `can_access=false` |
| Client cannot call browser Zooter job cards | Pass | `permission denied` |
| Client cannot read operational controls | Pass | `client rows=0` |
| Sensitive access availability notification is enqueued for Zooter | Pass | `notifications=1` |
| Service Zooter job cards expose destination only after accepted | Pass | `rows=1, destination_rows=1` |

## Notes

- The smoke uncovered and fixed an `integration_outbox_channel_check` drift issue: the scheduler queued `expo_push`, but the channel constraint did not allow it.
- Migration `20260628132000_integration_outbox_expo_push_channel.sql` was applied to staging and production.
- This SQL smoke verifies the database/RLS/RPC/notification path. Browser sign-in smoke can still be run with `npm run ops:smoke:staging -- --all` when local staging passwords are available, but the Phase 1 role boundary itself is now proven in staging.
