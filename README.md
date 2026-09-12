# Xoot — your local helpers

Private source for the Xoot website, Supabase backend and Expo application.

- [Current production checklist](docs/release/production-checklist.md): verified status, owner actions,
  release gates and delivery order.
- [Approved implementation plan](docs/implementation/production-plan-2026-09-11.md): website first,
  then mobile, using the [committed design handoff](design/handoff-2026-09-03/).
- [Worklog](docs/implementation/agent-worklog.md): claim work before editing and preserve other sessions.
- [Commercial rules](docs/product/locked-commercial-facts.md): server-authoritative prices and policies.

Use Node 24 and `npm ci`. Set the intended environment using `.env.example` and its environment-specific
examples, then run `npm run dev`. Validate with `npm run typecheck` and `npm run verify` before review.
Only public client configuration may use `VITE_`; keep server secrets in secure provider settings.

The website is hosted on Vercel. The native application lives in `mobile/` and retains production
identity `za.co.xoot.app`. A compiling build does not establish production readiness; follow the
current checklist and rendered browser checks.


