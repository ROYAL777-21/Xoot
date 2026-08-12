# Figma Workflow

Figma is the visual and interaction design authority. Git is the executable product and audit authority.

## File pages

Use the page structure defined in `PHASE-1-AUDIT.md`. Foundations and components precede product screens. Archive rejected directions under `99 Archive` rather than deleting decision history.

## Direction phase

Create three genuinely different systems and critical-flow prototypes:

- A: Vibrant Native
- B: Clear Glass Concierge
- C: Editorial Trust

At minimum cover customer onboarding, service choice, booking details, authentication handoff, booking status, Concierge, account recovery, one Zooter job flow, one operations queue, and one marketing conversion section. Include loading, error, empty, offline, large-text, reduced-motion, and reduced-transparency variants.

## Approval gate

1. Owner reviews the three directions.
2. Owner selects or combines a direction in Figma comments.
3. Final implementation frames are labelled exactly `APPROVED BY OWNER`.
4. Record file key, node ID, platform, approver, timestamp, and notes in `approved-frames.json`.
5. Create a screen specification linked to that registry entry.
6. Only then implement visual changes.

An approval applies only to the recorded node and state family. It does not approve unrelated screens.

## Implementation handoff

For each approved frame retrieve design context, variables, assets, and motion context. Preserve exact motion values when provided. Match Figma nodes to production components, but preserve product logic, accessibility, platform behaviour, and server boundaries from the repository.

Do not fabricate missing assets or animation. Use existing licensed assets, approved Figma exports, the established icon library, or the controlled image-generation workflow.

## Verification loop

1. Capture the approved Figma reference at the target viewport and state.
2. Capture the implementation at the same viewport and state.
3. Compare both together for hierarchy, spacing, type, colour, assets, cropping, radius, states, and motion resting positions.
4. Fix visible differences.
5. Repeat for supported viewports and accessibility variants.
6. Save accepted baselines under the visual-test evidence path.

## Current constraint

The 2026-07-13 audit reached the Figma Starter-plan MCP call limit after discovering the `Native Widgets` page. No redesign frame was inspected deeply enough to approve implementation. Resume the direction phase after the quota resets or the plan changes.
