# Hardening Command Evidence

Reviewed: 2026-07-11 07:35 SAST

This ledger tracks the required command attempts from the whole-platform hardening programme. It is release evidence, not a substitute for rerunning the commands on the final release candidate.

No command in this file requires or records private secrets.

## Current Evidence

| Command | Scope | Latest evidence | Current status | Next action |
| --- | --- | --- | --- | --- |
| `npm run lint` | Web/root | Local run passed on 2026-07-11 as part of `npm run verify`. | Passing | Require the same result in PR #25 CI before merge. |
| `npm test` | Web/root | Local run passed 37 files and 175 tests on 2026-07-11 as part of `npm run verify`. | Passing | Require the same result in PR #25 CI before merge. |
| `npm run build` | Web/root | Local Vite production build passed on 2026-07-11 as part of `npm run verify`. | Passing | Require the same result in PR #25 CI before merge. |
| `npm run security:scan` | Whole repo | Local run passed on 2026-07-11, including all nine unauthenticated Edge Function body-limit guards and provider-specific payment webhook authentication. | Passing | Require the same result in PR #25 CI before merge. |
| `npm run build:artifact-scan` | Web/root | Local production artifact scan passed on 2026-07-11 as part of `npm run verify`. | Passing | Re-run after every production build artifact is generated. |
| `npm run mobile:config:check` and `npm run mobile:typecheck` | Expo mobile | Local development config validation and TypeScript check passed on 2026-07-11. | Passing | Re-run in PR #25 CI and before the next EAS build. |
| `npm audit --omit=dev --audit-level=high` and mobile equivalent | Web/mobile production dependencies | Both production trees reported zero vulnerabilities on 2026-07-11; CI now enforces both audits. | Passing | Re-run in PR #25 CI and after dependency changes. |
| `npm run ops:readiness -- -Json` | Whole repo | 2026-07-11 local run passed with 428 pass, 0 fail, 11 manual, 1 skipped. | Passing with live/manual blockers | Use `-IncludeExternal -RequireLive` only after provider credentials and live accounts are configured. |
| `npm run ops:readiness -- -IncludeExternal -Json` | Whole repo plus local provider auth | 2026-07-10 local run showed 347 pass, 1 fail, 11 manual, 0 skipped. The single fail was Supabase CLI auth missing from the shell. GitHub and CodeRabbit were authenticated. | Blocked by local Supabase auth | Load rotated `SUPABASE_ACCESS_TOKEN` locally or run `supabase login`; do not paste tokens into chat or commit them. |
| `npx expo-doctor` | Expo mobile app | 2026-06-24 discovery evidence recorded 21 of 21 checks passed. A 2026-07-10 local re-run through `npm --prefix mobile exec -- expo-doctor` timed out after 184 seconds without producing a result. | Needs fresh successful run | Re-run from `/mobile` with normal network access before the next EAS build or store submission. |
| `supabase db reset` | Local Supabase database | 2026-07-10 CLI help confirmed the command is installed. It was not run because Docker is unavailable on this Windows host and the command resets a local or specified database. | Environment-blocked | Install/start Docker Desktop or use an approved isolated ops shell, then run against local only unless a live reset is explicitly approved. |
| `supabase test db` | Local or linked pgTAP tests | 2026-07-10 CLI help confirmed the command is installed. It was not run because Docker/local DB is unavailable and no pgTAP test path is currently present under `supabase/`. | Environment/project-blocked | Add pgTAP tests or identify an approved test directory, then run with local Docker or an explicitly approved linked/staging target. |
| `npx expo prebuild --platform ios` | Expo mobile generated native iOS project | 2026-07-10 CLI help confirmed the command is available. It was not run in the working tree because `expo prebuild` writes generated native folders; prior EAS simulator build evidence validates the generated iOS path. | Needs disposable-workspace or EAS evidence | Run in a disposable workspace with `--no-install` or through EAS development/preview build before claiming local prebuild evidence. |
| `npx expo prebuild --platform android` | Expo mobile generated native Android project | 2026-07-10 CLI help confirmed the command is available. It was not run in the working tree because `expo prebuild` writes generated native folders; prior EAS Android preview build evidence validates the generated Android path. | Needs disposable-workspace or EAS evidence | Run in a disposable workspace with `--no-install` or through EAS development/preview build before claiming local prebuild evidence. |
| `coderabbit --version` / `coderabbit auth status --agent` | Current branch review | Attempted on 2026-07-11; the installed `coderabbit.exe` is not a valid Windows application and could not start. | Blocked by incompatible local executable | Use the GitHub CodeRabbit app on PR #25 or install/authenticate the supported CLI in WSL. |

## Release Rule

Before a production release candidate, this ledger must be refreshed with:

1. Local command output or GitHub/EAS run IDs for every passing command.
2. Exact blocker reasons for commands that cannot run.
3. `blocker.md` entries for every unresolved launch-critical failure.
4. Confirmation that no command used chat-pasted secrets, production customer data, real payment actions, real communications, or unapproved provider configuration changes.
