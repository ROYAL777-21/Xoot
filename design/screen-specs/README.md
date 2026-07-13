# Screen Specifications

- `customer-sign-in-first-booking.md`: connected customer onboarding, authentication, booking, continuity and support contract.

A screen specification is created only after its Figma frame is recorded in `../approved-frames.json`.

Each specification must include:

- product area and route
- approved Figma file key and node ID
- user role and primary job
- loading, empty, success, error, offline, unauthorised, and reduced-motion states
- keyboard, screen-reader, and focus behaviour
- analytics events with privacy-safe properties
- data source and RLS/Edge Function boundary
- responsive constraints and supported devices
- motion and haptic tokens
- performance budget
- visual-regression references
- acceptance tests

Do not duplicate business policy in a screen specification. Link to the authoritative policy or backend contract.
