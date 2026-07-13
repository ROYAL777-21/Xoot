# Web Design Instructions

The marketing website and browser web application live in `src/` and use React, Vite, TypeScript, Tailwind, Radix primitives, and React Router.

Read the root `AGENTS.md` and relevant `design/` documents before changing UI.

## Platform Rules

- Preserve route-level code splitting, authenticated route guards, role guards, Supabase RLS, and Edge Function boundaries.
- Target WCAG 2.2 AA, responsive mobile web, keyboard navigation, stable focus, browser zoom, and reduced-motion and transparency fallbacks.
- Use solid warm surfaces for forms, legal text, payments, support details, and dense application content.
- Restrict glass to navigation, compact floating controls, contextual sheets, and selected high-value actions.
- Use the established Space Grotesk and DM Sans packages unless an approved typography proposal replaces them.
- Do not ship stock claims, fake partnerships, fake reviews, or unverified commercial wording.

## Approval Gate

No redesigned web screen may be implemented unless its frame is recorded as `APPROVED BY OWNER` in `design/approved-frames.json`.
