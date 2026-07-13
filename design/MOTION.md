# Motion

Status: motion language defined; production timing comes from approved Figma motion context.

## Principles

Motion explains cause and effect, spatial continuity, status, or attention. It must not delay booking, authentication, payment, safety, or support actions. Avoid decorative looping motion.

## Motion families

- `feedback`: immediate press, selection, toggle, and validation response.
- `continuity`: route, sheet, step, and shared-element transitions.
- `progress`: skeleton, determinate progress, and genuine waiting state.
- `attention`: one-time safe prompt or changed status.
- `celebration`: restrained, only after backend-verified success.

## Figma source rule

For approved animated frames, retrieve static structure and authoritative motion context. Match by node ID, preserve timing/easing/transform origin, and do not invent animation for static nodes. Shared motion must be factored into reusable variants. Motion screenshots show only rest state; non-trivial timelines require sampled video evidence.

## Product guidance

- Navigation selection: brief tactile compression, active indicator continuity, settle.
- Concierge: the robotic star transitions into sheet chrome; messages enter only when actually appended.
- Booking: selection feedback is immediate; step transition preserves context and focus.
- App launch: prefer platform splash and fast content reveal over a blocking branded sequence.
- Lists and dashboards: no per-item entrance cascade on routine navigation.
- Payment and booking confirmation: animate only after server verification.

## Performance rules

Prefer opacity and transform. Avoid animating layout, large blurs, shadows, or multiple independent glass layers. One animation must be validated end to end before repetition. Cancel obsolete transitions when navigation changes.

## Reduced motion

Under reduced-motion settings, render the resting state immediately, preserve focus placement, replace spatial travel with a short opacity change or no animation, and never remove information conveyed by motion.

## Evidence

Each approved pattern records its Figma node, playback trigger, interruption behaviour, reduced-motion state, performance trace, and visual-regression resting state.
