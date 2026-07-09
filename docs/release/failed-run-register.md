# Failed Run Register

Reviewed: 2026-07-01 12:43 SAST

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

## EAS iOS Simulator Build `68d6bd1c-6e0c-4e04-ad50-3d0b07f0c9fa`

- Branch: `codex/full-zoot-iphone-pwa-auth-security`
- Environment: EAS iOS preview simulator
- Command: `npx eas-cli@20.5.0 build -p ios --profile preview-simulator --non-interactive --no-wait`
- First root-cause error: the assistant intents config plugin called `project.addSourceFile` without an explicit Xcode group, which caused the generated Xcode project to look for the legacy `Plugins` group during prebuild.
- Affected surface: iOS simulator preview build and Siri/App Intents native source inclusion.
- Severity: medium
- Fix status: fixed in commit `5218e9a` by adding the Swift source to the generated app group explicitly.
- Verification: replacement build moved past prebuild; a later Xcode source-path failure was tracked separately below.

## EAS iOS Simulator Build `be4f91fe-eccb-4764-a25a-ecf7ee0d087d`

- Branch: `codex/full-zoot-iphone-pwa-auth-security`
- Environment: EAS iOS preview simulator
- Command: `npx eas-cli@20.5.0 build -p ios --profile preview-simulator --non-interactive --no-wait`
- First root-cause error: Xcode expected `ios/ZootAppIntents.swift`, but the plugin copied the Swift source into the generated app subfolder.
- Affected surface: iOS simulator preview build and Siri/App Intents native source inclusion.
- Severity: medium
- Fix status: fixed in commit `d007189` by copying the Swift source to the generated iOS project root, matching the Xcode source reference.
- Verification: iOS simulator build `d4de44a1-d827-4045-b1a6-e427066fcd64` finished and produced a simulator archive.

## EAS iOS Simulator Build `d4de44a1-d827-4045-b1a6-e427066fcd64`

- Branch: `codex/full-zoot-iphone-pwa-auth-security`
- Environment: EAS iOS preview simulator
- Command: `npx eas-cli@20.5.0 build -p ios --profile preview-simulator --non-interactive --no-wait`
- Result: finished.
- Artifact: `mobile/outputs/zoot-preview-ios-simulator-build-d4de44a1.tar.gz`
- SHA256: `4CDDAC70FF28A7E5699F8C64309E0A739C2400A8E75EC33DD3F6943DD1C48BA9`
- Note: this is simulator evidence only. Physical-device iOS preview installation still requires EAS internal-distribution iOS credentials.
