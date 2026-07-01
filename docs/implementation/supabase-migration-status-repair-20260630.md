# Supabase Migration Status Repair

Reviewed: 2026-07-01 12:58 SAST

## Why Production Shows `MIGRATIONS_FAILED`

The production Supabase dashboard can show skipped/pending/failed migrations even when the database schema now contains the objects needed by the app. Supabase tracks migration state by migration version and branch runner metadata, not only by whether the resulting tables, functions, policies, or triggers exist.

Production started from earlier launch/squashed migrations. Later live fixes were applied through the Supabase connector, and that connector generated new timestamps for migration names. That means several production rows are schema-equivalent to local migrations but do not have the exact same local migration versions. Some later migrations were also split into connector-safe public-schema migrations because storage-owner policies require a different owner path.

This is why the dashboard can say `1 skipped`, `2 pending`, and `migrations failed` while catalog checks still show booking chat, Concierge, invoice public schema, Zoot Black public schema, payment readiness, and Twilio readiness objects present.

## Current GitHub PR State

Open pull requests were checked with GitHub CLI on 2026-07-01:

| PR | Status | Notes |
| --- | --- | --- |
| `#7` `[codex] Full Zoot iPhone PWA auth and security readiness` | Green | Web build, production readiness guard, and native Swift check pass. GitHub Pages and Supabase Preview are intentionally skipped where configured. |
| `#8` `Add native routing bridge for app links and push taps` | Green | Web build passes. Preview deploy checks are skipped by configuration. |

Closed historical failures cannot be made green in place after closure. The relevant stale failures are:

| PR/run | Current handling |
| --- | --- |
| PR `#10` CodeRabbit generated tests | Closed. The failing branch used older workflow/test state and failed `NativeInteractionLayer` tests, not the current PR head. |
| PR `#9` Phase 1 convergence | Merged. The failed readiness run was caused by a missing `scripts/security/assert-no-frontend-admin-queue-writes.mjs` at that historical commit; current PR `#7` has that guard and passes. |
| Older main push failures | Historical runs on old commits. New branch runs on current code are green. |

## Known Local/Live Migration Equivalence

Do not mark any of these as applied without first running `supabase migration list` and verifying the live catalog again. The Supabase connector rechecked staging and production migration history on 2026-07-01, but the connector cannot safely run Supabase CLI migration-history repair.

| Local migration | Production live row | Staging live row | Repair note |
| --- | --- | --- | --- |
| `20260629113000_booking_chat_action_layer` | `20260630154133_booking_chat_action_layer` | `20260630152901_booking_chat_action_layer` | Schema-equivalent public booking chat migration was applied live. |
| `20260629200351_phase5_zoot_concierge` | `20260630154215_phase5_zoot_concierge` | `20260630153215_phase5_zoot_concierge` | Schema-equivalent Concierge migration was applied live. |
| `20260630005420_phase7_payments_payouts_foundation` | `20260630154353_phase7_payments_payouts_foundation` | `20260630153743_phase7_payments_payouts_foundation` | Schema-equivalent payment/payout readiness migration was applied live. |
| `20260630102715_phase9_twilio_verify_masked_voice` | `20260630154456_phase9_twilio_verify_masked_voice` | `20260630153941_phase9_twilio_verify_masked_voice` | Schema-equivalent Twilio readiness migration was applied live. |
| `20260629194645_completed_booking_invoices` | `20260630155714_connector_safe_booking_invoice_public_schema` | `20260630155643_connector_safe_booking_invoice_public_schema` | Only the connector-safe public schema is applied. The storage-object policy part is still pending owner-level deployment, so do not mark the full local migration applied without splitting or confirming a safe policy deployment path. |
| `20260630003602_phase6_zoot_black_foundation` | `20260630155930_connector_safe_zoot_black_core_schema` and `20260630160205_connector_safe_zoot_black_certificate_schema` | `20260630155818_connector_safe_zoot_black_core_schema` and `20260630160047_connector_safe_zoot_black_certificate_schema` | Public/schema-safe Zoot Black parts are applied. Storage-object certificate policy work still requires owner-level deployment. |
| `20260630155159_connector_safe_invoice_zoot_black_schema` | Split across connector-safe invoice/Zoot Black rows | Split across connector-safe invoice/Zoot Black rows | Treat this as the local source of the connector-safe schema, but review before repairing because live rows are split. |

## Safe Repair Procedure

Run this only from a local shell with approved credentials loaded from a vault or local secret store. Do not paste tokens or database URLs into chat.

1. Review the credential-free repair plan first. This validates the allowlist and refuses known partial/split migrations without needing a database URL:

   ```powershell
   npm run ops:supabase:repair-migrations -- -Environment production -PlanOnly
   npm run ops:supabase:repair-migrations -- -Environment staging -PlanOnly
   ```

2. Supply the database connection locally without putting the password in chat or git. Either set an approved database URL from the password manager:

   ```powershell
   $env:ZOOT_PRODUCTION_SUPABASE_DB_URL = "postgresql://..."
   ```

   Or use the guarded password prompt. This derives the standard direct Supabase DB URL in memory and does not print the password or store it in the repo:

   ```powershell
   npm run ops:supabase:repair-migrations -- -Environment production -ProjectRef mvlrkelahhsyjrwgsxaf -PromptDatabasePassword
   npm run ops:supabase:repair-migrations -- -Environment staging -ProjectRef fxmxyabdjqviqbcxmvlp -PromptDatabasePassword
   ```

   These commands still default to dry-run. Add `-ConfirmRepair` only after reviewing the captured before-file.

3. Save the CLI view of local versus remote migration history outside the repo:

   ```powershell
   $env:DO_NOT_TRACK = "1"
   supabase migration list --db-url $env:ZOOT_PRODUCTION_SUPABASE_DB_URL > C:\secure\zoot-production-migration-list.txt
   ```

4. Compare the CLI output with the table above and the live catalog-readiness checks. Do not use `supabase db push` to repair history until the migration list is understood.

5. For local migration versions that are fully proven already applied, use the guarded repair helper. It captures the migration list before changing anything, defaults to dry-run, refuses known partial/split migrations, and only allows the schema-equivalent versions listed in this runbook:

   ```powershell
   npm run ops:supabase:repair-migrations

   npm run ops:supabase:repair-migrations -- -ConfirmRepair

   npm run ops:supabase:repair-migrations -- -Environment production -ProjectRef mvlrkelahhsyjrwgsxaf -PromptDatabasePassword -ConfirmRepair
   ```

6. Do not repair-mark `20260629194645_completed_booking_invoices`, `20260630003602_phase6_zoot_black_foundation`, or `20260630155159_connector_safe_invoice_zoot_black_schema` until the storage-policy owner gap and split live rows are reconciled.

7. Re-run:

   ```powershell
   supabase migration list --db-url $env:ZOOT_PRODUCTION_SUPABASE_DB_URL
   npm run ops:readiness -- -Json
   ```

8. Recheck the Supabase dashboard branch status. If the migration history is clean but branch metadata still says `MIGRATIONS_FAILED`, open a Supabase support ticket or use the dashboard owner path to clear the failed branch runner state.

## Risk Rules

- Never insert directly into `supabase_migrations.schema_migrations` from ad hoc SQL.
- Never mark a migration applied because it "probably" ran.
- Never repair production before staging unless the same drift pattern has been reviewed.
- Never use chat-exposed Supabase service-role, database, API, or CLI credentials for long-lived production operations. Rotate exposed values before launch.
- Keep private provider secrets out of GitHub repository variables, frontend env, Expo public env, docs, and committed scripts.
