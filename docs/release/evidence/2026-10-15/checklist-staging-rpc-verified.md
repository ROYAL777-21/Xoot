# 15 October 2026 — staged Xooter checklist mutation RPC

The exact repository migration `supabase/migrations/20261007150000_checklist_active_job_mutation.sql` was submitted to the **staging** Supabase project `fxmxyabdjqviqbcxmvlp` using the connected migration action. It returned `success: true`. The connected migration action chose live history version **`20261015155437`**, name `checklist_active_job_mutation`, rather than the repository filename version `20261007150000`. This version difference is history only: **do not run both version names blindly** or repair-mark the repository file without checking its actual body and live function.

Preflight read from staging:
- `public.xooter_job_checklist`, `public.xooter_jobs`, `public.bookings` exist;
- checklist seeding trigger `seed_xooter_job_checklist_after_insert` exists and is enabled, one RLS policy exists;
- `authenticated` cannot update the checklist table;
- `public.update_active_xooter_checklist(uuid,uuid,text,boolean)` did not exist.

Post-migration independent live catalogue read:
- Function exists and has `SECURITY DEFINER`, with role grants **anon EXECUTE=false**, **authenticated EXECUTE=false**, **service_role EXECUTE=true**;
- Function definition contains required booking/job row locking and actor-ownership check;
- Calling the function with non-existent synthetic UUIDs returned `{ "ok": false, "code": "not_found" }`, not a successful mutation;
- The staging security advisor still reports two by-design zero-policy RLS tables, the intentionally signed-in `set_safety_pin` definer exception, and leaked-password protection disabled. Neither was silently dismissed.

Existing disposable PostgreSQL / PGlite contract in `scripts/ops/verify-checklist-state-contract.mjs` tests accepted and rejected booking states, worker mismatch, service-only EXECUTE, direct RLS mutation denials and no correction after cancellation. This staged action is **not** evidence of a real verified Xooter user completing a hosted checklist end-to-end.

Production `mvlrkelahhsyjrwgsxaf` has not received this RPC or the necessary October checklist schema. Avoid deploying the production `xooter-job-checklist` Edge Function until dependent schema migrations, crew/referral baseline, migration ledger ordering and verified production actor scope are reviewed. Existing staging `xooter-job-checklist` Edge Function was already `ACTIVE` at inventory time; this database function closes its previously missing dependency but requires a real signed-in smoke test.

No production schema, PayFast, Twilio, mobile app signing, customer data, or live capability flag was modified. `main` and Codex PR #46 are unchanged.
