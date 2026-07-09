---
name: zoot
description: Master operating skill for the Zoot home-services platform. Use when working anywhere in the Zoot React/Vite/Supabase/Capacitor codebase, planning a Zoot implementation phase, reviewing production readiness, or deciding which Zoot company docs, security rules, product specs, release checks, and domain skills to load before editing.
---

# Zoot Master Skill

Use this skill first for Zoot work, then load the narrower Zoot skill that matches the task.

## Source Map

When the current working directory is `zoot-app`, the company-wide markdown pack is at:

`../work/zoot_company_wide_md_pack/`

Start with:

- `../work/zoot_company_wide_md_pack/AGENTS.md`
- `../work/zoot_company_wide_md_pack/docs/company/PROJECT_CONTEXT.md`
- `../work/zoot_company_wide_md_pack/docs/company/TECH_STACK.md`
- `../work/zoot_company_wide_md_pack/docs/engineering/CODEX_WORKFLOW.md`
- `docs/feature-completion-audit.md`

Use [references/doc-index.md](references/doc-index.md) to select task-specific docs.
Use [references/phases.md](references/phases.md) to keep phase work ordered.

## Operating Rules

- Inspect before editing.
- Keep one controlled mission per turn.
- Make small, file-targeted patches.
- Preserve unrelated user changes.
- Never commit secrets or create real `.env` files.
- Do not use service-role keys in the browser.
- Do not put frontend-only logic in charge of pricing, payment status, refunds, Care+, ZootCred, booking state, or contractor verification.
- Production must fail loudly when required env values are missing.
- Preview/mock data is allowed only in explicit development or local preview mode.

## Domain Skills

- Use `zoot-phase-1-env-hardening` for the immediate no-mock production guard prompt.
- Use `zoot-security` for auth, env guards, RLS, secrets, CVE patches, sensitive data, and admin audit.
- Use `zoot-backend` for Supabase Edge Functions, webhooks, booking state changes, and moving critical writes off the frontend.
- Use `zoot-product` for Care+, ZootCred, property profiles, booking product states, and mock-to-live data work.
- Use `zoot-production` for monitoring, build, SEO, PWA, Hostinger, Capacitor, iOS, Android, and app-store readiness.
- Use `zoot-toolchain` when work mentions GitHub, Linear, Supabase, Twilio, OpenAI, Airtable, Base44, Expo, CodeRabbit, Computer, native app test tools, PR checks, or dashboard-backed setup.

## Standard Workflow

1. Read the company docs relevant to the task.
2. Inspect the current files and branch state.
3. Identify acceptance criteria and risks.
4. Edit only the required files.
5. Run the narrowest meaningful checks, then broaden if the blast radius is larger.
6. Report changed files, tests, build result, security notes, remaining risks, and the next recommended task.
