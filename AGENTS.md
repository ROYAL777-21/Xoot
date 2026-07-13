# Zoot Product Design Authority

Before changing any user-facing interface, read the applicable documents in `design/` and the platform instructions under `apps/*/AGENTS.md`.

## Required Sequence

1. Confirm the product area, user role, journey, and relevant source-of-truth behaviour.
2. Check `design/approved-frames.json` for an owner-approved Figma frame.
3. If no approved frame exists, stop visual implementation and produce a screen specification or Figma direction for owner review.
4. Preserve business logic, RLS boundaries, Edge Function contracts, payment verification, and role checks.
5. Implement only the approved frame and documented states.
6. Verify against Figma, accessibility requirements, performance budgets, and representative devices.
7. Record implementation and Design QA status only after evidence exists.

## Governing Documents

- Brand and product intent: `design/BRAND.md`, `design/UX-PRINCIPLES.md`
- Components and tokens: `design/DESIGN-SYSTEM.md`
- Material and interaction: `design/GLASS-SYSTEM.md`, `design/MOTION.md`, `design/HAPTICS.md`
- Content and assets: `design/CONTENT-GUIDE.md`, `design/ICONOGRAPHY.md`, `design/PHOTOGRAPHY.md`, `design/ILLUSTRATION.md`
- Quality: `design/ACCESSIBILITY.md`, `design/PERFORMANCE.md`, `design/QUALITY-GATES.md`
- Figma process: `design/FIGMA-WORKFLOW.md`, `design/approved-frames.json`
- Current evidence and gaps: `design/PHASE-1-AUDIT.md`, `blocker.md`

## Non-Negotiable Rules

- The product owner is the final visual authority. A frame existing in Figma is not approval.
- Do not invent prices, availability, bookings, payments, client claims, reviews, or operational outcomes.
- Do not expose household access details, private notes, payment details, credentials, or cross-account data.
- Do not put every surface in glass or a rounded card. Content remains on stable, legible surfaces.
- Respect reduced motion, reduced transparency, increased contrast, Dynamic Type, browser zoom, keyboard use, VoiceOver, and TalkBack.
- No production deployment or visual-baseline acceptance without explicit owner approval and passing release gates.
