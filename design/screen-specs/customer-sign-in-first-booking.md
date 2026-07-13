# Customer Sign-In And First Booking Screen Specification

Status: exploration handoff; Figma approval required before production UI implementation.

Governing files:

- `AGENTS.md`
- `apps/mobile/AGENTS.md`
- `mobile/AGENTS.md`
- `design/features/customer-sign-in-first-booking/BRIEF.md`
- `design/DESIGN-SYSTEM.md`
- `design/GLASS-SYSTEM.md`
- `design/MOTION.md`
- `design/HAPTICS.md`
- `design/ACCESSIBILITY.md`
- `design/PERFORMANCE.md`
- `design/FIGMA-WORKFLOW.md`
- `design/QUALITY-GATES.md`

## Product outcome

A guest can understand services and prepare a booking without account friction. Authentication begins only when the draft becomes account-owned. The draft survives the secure callback, and all payment, booking, matching, and assignment statuses come from approved backend state.

## Connected screen family

| Screen | Primary outcome | Backend boundary | Required next action |
| --- | --- | --- | --- |
| Customer home | Select an approved service as a guest | Approved service catalogue only | Open service scope |
| Service scope | Choose duration and household scope | No price or completion inference | Open location and availability |
| Location and availability | Select a service-area address and verified opening | Mapbox and availability through approved APIs | Preserve draft and continue |
| Auth handoff | Verify identity without losing the draft | Supabase Auth callback only | Resume review route |
| Review and payment | Understand service, timing, terms and payment boundary | Payment provider and Edge Function truth | Open approved provider flow |
| Preferred Zooter and repeat care | Configure a transparent future preference | No silent substitution or client-side recurrence | Review recurring terms |
| Booking status | Understand confirmed backend status | Read-only safe booking summary | Track or get support |
| Service issue | Create a structured human handoff | No refund, blame or outcome promise | Send safe support summary |

## Navigation contract

- Native and web tab navigation remains available on ordinary customer routes.
- `/auth/callback` is a non-tab route and must render without the tab shell.
- Auth providers appear only when enabled for the current environment.
- Callback error, retry and return-to-account actions remain accessible without a valid session.
- A verified callback restores the session and returns to the preserved draft or safe account route.

## State contract

Every approved Figma screen family must include:

- initial, returning and resumed draft;
- loading, empty, partial, stale and offline;
- invalid address and outside service area;
- no availability and changed availability;
- unauthenticated, expired session, wrong role and disabled account;
- sign-in success, invalid link, callback error, recovery sent and recovery complete;
- payment not started, redirect, pending, confirmed, failed, cancelled and unknown;
- booking submitting, confirmed, duplicate-protected, timeout and support-required;
- preferred-Zooter available, unavailable, leave and explicit substitution choices;
- service issue standard, urgent safety, payment dispute and human handoff;
- keyboard open, large text, reduced motion, reduced transparency and increased contrast;
- VoiceOver, TalkBack, keyboard focus and error-summary annotations.

## Direction decision

The review board at `design/prototypes/customer-sign-in-first-booking/index.html` contains:

- A: Vibrant Native, optimized for speed and low-friction onboarding.
- B: Clear Glass Concierge, optimized for guided reassurance with opaque form surfaces.
- C: Editorial Trust, optimized for first-booking confidence and process transparency.

The owner review preference is now B+C. B supplies restrained clear-glass navigation and guided choices. C supplies process evidence, payment boundaries, verified booking truth and human-support tone. The interactive refinement is at `design/prototypes/customer-sign-in-first-booking/selected-bc.html`. This is not Figma approval.

## Motion and haptics

- Selection: immediate visual state, optional light selection haptic, 100-180 ms settle.
- Step change: 220-320 ms continuity while moving focus to the new heading.
- Callback: no decorative delay; status is announced as soon as it changes.
- Booking/payment success: success feedback only after backend confirmation.
- Reduced motion: render the settled state immediately.
- No haptic at launch, while loading, or for disabled controls.

Exact production values must come from owner-approved Figma motion context.

## Glass contract

- Use clear glass for navigation and temporary Concierge or auth chrome only.
- Forms, payment details, legal copy and issue reporting use opaque semantic surfaces.
- A separate backdrop makes underlying text unreadable behind modal/chat/auth overlays.
- Web and Android fallback light originates from the top right and settles after interaction.
- Reduced-transparency and low-performance modes use opaque surfaces.

## Accessibility contract

- Persistent field labels; placeholders are examples only.
- Buttons expose button semantics, accessible names and current states.
- Minimum 44-point iOS and 48-dp Android touch targets.
- Password manager and email autofill metadata are present where applicable.
- Focus moves to the route heading or first actionable error.
- Status changes use screen-reader announcements and visible text.
- No status depends on colour, material, motion or haptic alone.

## Performance contract

- Customer home does not eagerly import Mapbox, support history or admin modules.
- Location tooling loads only at the address step and has a manual fallback.
- Draft data is small, versioned, expiry-aware and excludes secrets.
- Analytics is deferred and contains no email, address, note, booking ID or payment reference.
- No blocking custom launch animation.

## Approval evidence required

Before implementation:

1. Selected direction is fully rebuilt in Figma.
2. All required states and platform variants exist.
3. Motion, haptic, material, responsive and accessibility annotations exist.
4. Exact frames are labelled `APPROVED BY OWNER`.
5. Exact node IDs are added to `design/approved-frames.json`.

After implementation:

1. Same-state Figma and implementation captures are compared.
2. Staging sign-in, callback, restore, recovery and sign-out pass.
3. Android physical-device and iOS physical-device/TestFlight builds pass.
4. Accessibility, performance, security and functional evidence is stored with build IDs and timestamps.
