# Phase 5 - Xoot Concierge

Reviewed: 2026-06-29

## Scope

Phase 5 consolidates Xoot Concierge into a source-guided, answer-only support layer. It can answer public Xoot questions, route private or risky topics to protected support, and accept user reports about Concierge answers.

## Implemented

- `support-respond` remains available to guests and signed-in users.
- OpenAI fallback is gated by `support.openai_fallback`, disabled by default.
- Guest Turnstile enforcement is gated by `support.turnstile_required`, disabled by default until the production domain and Cloudflare widget exist.
- All support text sent to OpenAI is sanitized and redacted before model use.
- OpenAI requests use `store: false`, a short response cap, and a timeout fallback.
- High-risk topics escalate instead of generating unsupported answers.
- The bot has no tools for bookings, payments, refunds, claims, admin actions, sensitive-data reveals, or account changes.
- `zoot_concierge_knowledge_versions` records the approved bundled knowledge version.
- `zoot_concierge_feedback` stores sanitized answer reports through `report-concierge-answer`.
- The visible bot report button now calls `report-concierge-answer`.

## Controls

- `support.openai_fallback`: allows OpenAI-backed fallback after review.
- `support.turnstile_required`: requires Turnstile for anonymous Concierge calls after domain/widget setup.
- `support.concierge_feedback`: allows server-side answer reports.

## Rollback

- Disable `support.openai_fallback` to force deterministic knowledge and human-escalation fallback only.
- Disable `support.concierge_feedback` to stop new user reports.
- Disable `support.turnstile_required` if the Cloudflare widget or domain setup fails.
- Roll back Edge Functions to the previous deployed versions if the response path misbehaves.

## Still Required Before Live Activation

- Deploy `20260629200351_phase5_zoot_concierge.sql`.
- Deploy `support-respond` and `report-concierge-answer`.
- Set rotated `OPENAI_API_KEY` and `OPENAI_SUPPORT_MODEL` only as Supabase Edge Function secrets.
- Set rotated `CLOUDFLARE_TURNSTILE_SECRET_KEY` only as an Edge Function secret when the domain/widget exists.
- Add a restricted public Turnstile site key to web/Expo public env only after the final domain exists.
- Smoke-test guest and signed-in flows in staging.
