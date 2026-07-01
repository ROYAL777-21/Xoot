# Failed Run Register

Reviewed: 2026-07-01 05:35 SAST

## EAS Android Build `50a3f34f-0067-4b45-ba87-1b309c2afce5`

- Branch: `codex/full-zoot-iphone-pwa-auth-security`
- Environment: EAS Android preview
- Command: `npx eas-cli@20.3.0 build -p android --profile preview`
- First root-cause error: Sentry source-map upload ran without required Sentry organization/auth credentials.
- Affected surface: Android native preview build
- Severity: medium
- Fix status: fixed by gating the Sentry upload plugin behind private `SENTRY_ORG` and `SENTRY_AUTH_TOKEN`.
- Verification: Android build `114d0c10-c754-4426-9a90-9fdfeadb8a06` finished and produced an APK.

## EAS iOS Preview Credential Failure

- Branch: `codex/full-zoot-iphone-pwa-auth-security`
- Environment: EAS iOS preview, physical-device internal distribution
- Command: `npx eas-cli@20.3.0 build -p ios --profile preview --non-interactive --no-wait`
- First root-cause error: EAS could not find credentials suitable for internal distribution in non-interactive mode.
- Affected surface: iOS physical preview build
- Severity: medium
- Fix status: blocked pending Apple/EAS credentials.
- Verification: `preview-simulator` profile added for iOS simulator build evidence only; physical-device validation remains blocked.

