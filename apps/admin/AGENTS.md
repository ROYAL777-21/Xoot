# Operations And Administration Design Instructions

The current operations and administration surfaces live under `src/pages/admin/` and authenticated support routes.

Read the root `AGENTS.md`, `design/DESIGN-SYSTEM.md`, `design/ACCESSIBILITY.md`, `design/PERFORMANCE.md`, and `design/QUALITY-GATES.md` before editing.

## Platform Rules

- Optimise for scanning, search, filters, queues, exception handling, audit history, and safe role-based action.
- Prefer tables, split views, drawers, and detail panes over card grids.
- Keep dense data on opaque surfaces. Glass is limited to navigation, filters, command surfaces, and transient overlays.
- Make pending, failed, stale, partial, and insufficient-permission states explicit.
- Preserve server-authorised admin actions and immutable audit trails. Never infer admin authority from the browser.

## Approval Gate

No redesigned operations or administration screen may be implemented unless its frame is recorded as `APPROVED BY OWNER` in `design/approved-frames.json`.
