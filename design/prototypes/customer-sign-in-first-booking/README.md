# Customer Sign-In And First Booking Prototype

Status: owner-review fallback while Figma MCP writes are unavailable.

This directory contains three isolated, non-production visual directions for the connected customer sign-in and first-booking journey:

- A: Vibrant Native
- B: Clear Glass Concierge
- C: Editorial Trust

The owner review preference is now a B+C hybrid:

- B supplies restrained clear-glass navigation, guided choices and Concierge entry points
- C supplies process evidence, payment boundaries, booking truth and human-support tone

`selected-bc.html` is the interactive high-fidelity revision of that combined direction. It remains a prototype and does not satisfy the Figma approval gate by itself.

Open `index.html` in a browser or run the repository preview command documented below. These prototypes do not call Supabase, create bookings, take payments, or alter the Expo application. They exist only to support owner direction selection before approved Figma frames are produced.

## Review route

1. Review all three directions at the same viewport.
2. Select one direction or record an explicit combination.
3. Recreate the selected connected flow in Figma with all required states.
4. Mark final frames `APPROVED BY OWNER`.
5. Record exact node IDs in `design/approved-frames.json`.
6. Only then implement the approved production UI.

## Local preview

From this directory, serve the repository root and open:

`/design/prototypes/customer-sign-in-first-booking/index.html`

Selected high-fidelity revision:

`/design/prototypes/customer-sign-in-first-booking/selected-bc.html`

The board uses repository-owned assets only. The Editorial Trust direction deliberately flags the current portrait as reference-only because its commissioning and provenance are not approved for production trust evidence.
