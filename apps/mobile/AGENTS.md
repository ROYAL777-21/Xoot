# Mobile Design Instructions

The current mobile source lives in `mobile/`. This file is the mobile design-governance anchor.

Read the root `AGENTS.md`, `design/DESIGN-SYSTEM.md`, `design/ACCESSIBILITY.md`, `design/PERFORMANCE.md`, `design/MOTION.md`, `design/HAPTICS.md`, and `design/GLASS-SYSTEM.md` before editing Expo UI.

## Platform Rules

- Use Expo Router and TypeScript. Preserve Expo-first deployment and the shared Supabase backend.
- Follow the exact installed Expo SDK documentation before changing native configuration.
- Use platform conventions rather than forcing identical iOS and Android controls.
- Prefer native navigation, system accessibility, safe-area handling, predictive back on Android, and native haptics where supported.
- Keep first render useful. Do not delay use for splash animation.
- Never place private secrets in `EXPO_PUBLIC_*` values or the application bundle.
- Do not perform booking, payment, refund, Care+, ZootCred, or sensitive-account actions from client assumptions.
- Widgets, Live Activities, Dynamic Island, notifications, and assistant surfaces may show only privacy-safe summaries.

## Approval Gate

No redesigned mobile screen may be implemented unless its frame is recorded as `APPROVED BY OWNER` in `design/approved-frames.json`. Existing unapproved implementation candidates may be inspected and tested but must not be promoted as final design.
