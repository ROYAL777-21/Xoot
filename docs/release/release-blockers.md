# Release Blockers

Reviewed: 2026-07-03 17:35 SAST

This document summarizes release blockers. `blocker.md` remains the detailed unresolved-only ledger.

## High

- Supabase Auth redirect allowlists still require live dashboard/API configuration; production and staging dry-runs passed, but live PATCH still requires a rotated local `SUPABASE_ACCESS_TOKEN`.
- Supabase migration metadata repair still requires a rotated local `SUPABASE_ACCESS_TOKEN` and approved production/staging DB URLs loaded outside chat.
- Production and staging cannot be called fully release-ready until live role-based smoke tests and storage/function policy checks are complete.
- Concierge Phase 1 governance and structured handoff are local only; the new controls/handoff migrations, updated `support-respond` metadata path, `create-concierge-handoff` Edge Function, approved knowledge workflow, and human handoff tests still need staging/prod deployment and smoke evidence.

## Medium

- Android APK exists, but real-device installation and smoke testing are not complete because no Android device/ADB is available in this Windows session.
- iOS physical-device preview builds are blocked by missing EAS internal-distribution credentials.
- Twilio, payment-provider, Cloudflare, Mapbox, store, and domain configuration remain manual provider tasks.

## Low

- Some provider/SEO/store polish remains deferred until release-critical checks are stable.
