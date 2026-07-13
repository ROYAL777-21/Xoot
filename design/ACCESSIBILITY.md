# Accessibility

Target WCAG 2.2 AA for web and equivalent platform guidance for iOS and Android.

## Required behaviour

- Full keyboard operation and visible focus on web.
- Correct semantic roles, names, states, and relationships.
- Logical reading and focus order after route, sheet, and validation changes.
- Touch targets of at least 44 x 44 points on iOS and 48 x 48 density-independent pixels on Android unless the native control guarantees equivalent access.
- Dynamic Type and Android font scaling without clipped or overlapping content.
- Text and meaningful non-text contrast tested in every state and glass background sample.
- Status never conveyed by colour, motion, sound, or haptic alone.
- Reduced motion, reduced transparency, increased contrast, and screen-reader paths.
- Plain-language errors linked to fields and summarised at the step level.
- Accessible authentication, password generation/autofill, OTP, and recovery flows.
- Captions/transcripts for meaningful media.

## Figma annotations

Every approved critical frame includes focus order, heading hierarchy, accessible names for icon controls, live-region intent, minimum tap area, contrast notes, large-text layout, reduced-motion state, and reduced-transparency fallback.

## Test matrix

Automated checks are necessary but insufficient. Critical flows require keyboard, NVDA or equivalent desktop reader, VoiceOver, TalkBack, 200 percent web zoom, large native text, reduced motion, increased contrast, and colour-vision review.

An accessibility exception needs an owner, user impact, mitigation, due date, and release decision.
