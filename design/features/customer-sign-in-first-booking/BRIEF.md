# Customer Sign-In And First Booking

Status: pre-Figma feature brief
Target user: customer
Desired outcome: a new or returning customer can choose a service, preserve progress through authentication, review verified terms, and reach an honest booking status with minimal friction.

This is the default next feature inferred from the active goal's explicit sign-in, onboarding, booking, and testable-preview requirements. It is not an approved visual direction.

## Product boundaries

- Browsing services and general Concierge guidance may remain available without sign-in.
- Require authentication only before account-owned, payment, or booking creation work.
- Preserve safe booking draft state through sign-in, sign-up, recovery, backgrounding, and deep-link return.
- Create a booking only through the approved backend contract.
- Never show payment, booking, assignment, Care+, or credit success from client inference.
- Do not request household access secrets in the booking chat or Concierge.
- Assistant or deep-link phrases may prefill safe intent, service, and date context but never complete a booking.

## Complete flow to design in Figma

1. Launch or resume into a useful customer home.
2. Choose Home clean, Deep clean, Office, Airbnb turnover, or another approved service.
3. Confirm service area and select or add a saved address through Mapbox-assisted search with manual fallback.
4. Choose service scope through clear segmented choices, steppers, and contextual guidance.
5. Choose an available date and time with honest unavailable-state explanations.
6. Add safe preferences and optional notes that explicitly exclude codes or credentials.
7. Sign in, sign up, use password autofill/generation, recover access, or return from email/OTP callback without losing the draft.
8. Review service, scope, location summary, date, price source, cancellation terms, and payment route.
9. Complete payment through an approved provider flow where required.
10. Show awaiting confirmation, payment pending, awaiting assignment, assigned, or support-required state from backend truth.
11. Offer track, message, get help, or return home actions appropriate to verified status.

## Required states

Every relevant frame includes:

- initial, returning-user, and resumed-draft states;
- loading, skeleton, empty, partial-data, and stale-data states;
- invalid address, outside service area, no availability, and changed availability;
- unauthenticated, session expired, wrong role, and account disabled;
- sign-in success, invalid credentials, unverified email, OTP delay, callback error, recovery sent, and recovery complete;
- payment not started, provider redirect, pending, confirmed, failed, cancelled, and unknown;
- booking submission in progress, confirmed, duplicate-tap protected, timeout, recoverable error, and support-required;
- offline before auth, during draft, before payment, and after submission;
- keyboard open, large text, reduced motion, reduced transparency, increased contrast, VoiceOver/TalkBack focus, and web keyboard focus;
- privacy-safe notification and widget summaries.

## Three Figma directions

### A - Vibrant Native

Light canvas, distinct service colours, compact native controls, direct progressive booking, system type on mobile, and minimal glass limited to navigation and transient sheets. Real service photography provides warmth. This best supports speed and low-friction onboarding.

### B - Clear Glass Concierge

Clear glass navigation and Concierge sheet, more guided conversational assistance, restrained refraction, top-right light cue for web/Android fallback, and solid form surfaces. This direction demonstrates the premium glass system without making the booking form translucent.

### C - Editorial Trust

Stronger real-service photography, visible trust/process evidence, calmer colour use, and quieter controls. Booking remains progressive, but supporting content does more reassurance work before commitment.

Owner preference recorded from conversation: use A as the foundation with selected trust and photography elements from C. Exact combined frames still require owner approval.

## Motion, haptics, and glass

- Launch: native splash followed by useful content; no blocking logo animation.
- Service selection: immediate colour and outline state, light selection haptic, optional small scale settle.
- Step change: preserve spatial context and focus; no long page slide.
- Auth handoff: draft-summary continuity remains visible before and after the secure flow.
- Validation: local field response without shaking the entire page.
- Success: haptic and restrained motion only after backend confirmation.
- Glass: navigation and temporary sheet chrome only. Forms, review details, legal copy, and payment state use opaque surfaces.
- Reduced motion/transparency: immediate state changes and opaque semantic surfaces.

Production motion values must come from Figma motion context. Do not fabricate animation for unanimated nodes.

## Accessibility specification

- One logical heading per step and one primary action.
- Explicit labels, hints, errors, progress, and required/optional state.
- Address results, calendars, segmented controls, steppers, password controls, and OTP inputs have complete semantics.
- Password manager, iCloud Keychain, Android Autofill, and platform password generation are supported without blocking paste.
- Focus returns to the relevant heading or error after navigation.
- Draft summary remains readable at large text without trapping the user in nested scrolling.
- No status depends on colour, motion, haptic, or icon alone.

## Performance specification

- Home and first service-choice UI do not import Mapbox, charts, admin, or rich support modules before needed.
- Mapbox loads only at location selection and has text/manual fallback.
- Draft persistence is small, versioned, expiry-aware, and excludes secrets.
- Prevent duplicate server mutations with idempotency and disabled/loading state.
- Defer non-essential analytics and imagery from the first interaction path.
- Validate on a mid-range Android device, a supported iPhone, and constrained mobile web.

## Privacy-safe analytics

Suggested events:

- `booking_started`
- `booking_service_selected`
- `booking_location_step_completed`
- `booking_scope_completed`
- `booking_slot_selected`
- `booking_auth_required`
- `booking_auth_completed`
- `booking_reviewed`
- `booking_submission_requested`
- `booking_submission_result`
- `booking_support_opened`

Properties may include service category, step, safe result category, platform, environment, and latency bucket. Do not send address, notes, email, phone, booking ID, payment reference, or raw error payload.

## Figma deliverables

For A, B, and C:

- foundations mini-board;
- compact customer home;
- service selection;
- address and service-area selection;
- scope and duration;
- date/time;
- sign-in/sign-up/recovery handoff;
- booking review and provider transition;
- pending/confirmed/support states;
- Concierge entry and handoff;
- accessibility and reduced-effect variants;
- iOS, Android, mobile web, and desktop web examples;
- motion prototype and annotations.

## Approval and implementation

No implementation begins until the complete selected flow is labelled `APPROVED BY OWNER`, every relevant node is entered in `design/approved-frames.json`, and a screen specification is created for each implementation surface.

## Test evidence required after implementation

- current Android preview APK labelled `Zoot` installed on a physical device;
- physical iOS development/TestFlight build labelled `Zoot`;
- mobile-web and desktop-web captures;
- staging sign-up, sign-in, callback, restore, recovery, and sign-out evidence;
- staging booking draft continuity and duplicate-tap tests;
- payment pending/confirmed/failed truth tests;
- cross-account and wrong-role denials;
- visual comparison against approved Figma frames;
- VoiceOver, TalkBack, keyboard, large text, reduced motion/transparency, and performance traces.
