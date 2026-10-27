# Atomic in-app voice — staging delivery

Reviewed source: dbab693edade52b12e4253c5d063c58e63d07c7e. The two generated RPC declarations
and test-path alignment were independently reviewed at 183beb82ff5194072eca30f4b099748270a9c774.
Production was not changed. No real call was made.

A shared opaque room and immutable maximum five-minute lease replace the original CallSid anchor.
Registration and terminal callbacks serialize on the same room row through service-only SECURITY
INVOKER RPCs. Terminal/end/registered-leave events complete all legs, including queued joins.
An old CallSid cannot reopen a completed live lease; a new redial can create a fresh room.
A per-minute pg_cron job deletes expired rooms and cascades their short-lived legs.

## Verified delivery

Staging fxmxyabdjqviqbcxmvlp applied migration 20261025191835_in_app_voice_ephemeral_sessions.
Its exact source/remote SHA256 is ab1bb7202e5edc1b6704e6b3b7df630ac1b069d54b8ea3634cdc21f350bb3792.
The original CLI-created filename was aligned with the actual remote version; no ledger was repaired
or marked applied without SQL. The migration also removes inherited client TRUNCATE/REFERENCES/TRIGGER
on the old masked-call table without deleting its data.

| Function | Delivered version | Authentication |
| --- | --- | --- |
| twilio-in-app-voice-status | 1 | Twilio HMAC |
| twilio-voice-twiml | 22 | Twilio HMAC |
| twilio-token | 23 | JWT plus actual-user and booking checks |

All 16 returned runtime files exactly match reviewed source. Hashes and file names are in
[atomic-voice-delivery.json](atomic-voice-delivery.json). One TwiML delivery attempt failed because
of a retained old import-map path; explicit deno.json corrected it and the successful deployed copy
was read back. Missing bearer/no Origin returns 401, unsigned callbacks 403. Production Origin is
deliberately not in staging's CORS allowlist.

Catalogue readback: rooms/sessions zero, RLS on, client policies zero, all seven client privileges
denied, no client RPC execution, both RPCs invokers, cron active with the expected cascade deletion.
twilio.in_app_voice has zero enabled rows and is absent/off.

## Evidence and limits

- Focused call/access/lifecycle/config guards: 77 passed. Independent four-suite check: 73 passed.
- PostgreSQL 17.6/pg_cron 1.6: privileges, roles, immutable lease, reordered callbacks, original-anchor
  deletion, fresh redial, actual scheduled cascade and two competing connections in both lock orders passed.
  The harness waits for an observed row-lock wait rather than relying on a fixed sleep.
- Removing the shared row lock failed the concurrent negative control.
- Existing RPC-name guard: 11 passed after copying just the two exact signatures from freshly generated
  staging types. TypeScript passed. No unrelated schema refresh or test allowlist bypass.
- The later broad unit rerun was interrupted after host memory exhaustion; it is not a full current-head
  pass. Targeted results above do not replace required CI.
- Real customer/Xooter JWT voice-gate acceptance, provider audio, real signed webhook callbacks,
  microphone/device lifecycle, native transport and provider usage acceptance remain open.
  Four-account GPS acceptance is separate evidence and does not prove calls or encrypted chat.
- Eligibility is a bounded lease, not instantaneous mid-call cancellation. Twilio remains Trial;
  no number, credit or paid upgrade. Production functions/migrations/flags remain untouched.

The earlier [disabled handler delivery](in-app-communications.md) is historical. The
[production checklist](../../production-checklist.md) is the current launch authority.
