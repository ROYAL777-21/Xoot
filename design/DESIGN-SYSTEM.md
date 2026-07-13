# Design System

Status: provisional foundations pending approved Figma variables and frames.

## Semantic token model

Use semantic names shared across platforms:

- `surface.canvas`
- `surface.raised`
- `surface.subtle`
- `surface.inverse`
- `surface.carePlus`
- `content.primary`
- `content.secondary`
- `content.inverse`
- `content.disabled`
- `border.subtle`
- `border.strong`
- `action.primary`
- `action.primaryPressed`
- `action.secondary`
- `status.success`
- `status.warning`
- `status.danger`
- `status.info`
- `service.home`, `service.deep`, `service.office`, `service.turnover`

Raw colour values belong in one source and generate web and mobile adapters. Product code should consume semantic tokens rather than hex values.

## Typography

Web currently uses Space Grotesk for display and DM Sans for body through Fontsource under OFL-1.1. Native currently uses system type. Preserve system type on mobile for performance and platform fidelity unless an approved Figma comparison justifies a bundled family.

Typography rules:

- no viewport-scaled font sizes;
- no negative letter spacing;
- sentence case by default;
- compact panel headings remain compact;
- support Dynamic Type and Android font scaling;
- numbers and status labels must not rely on colour alone.

## Spacing and layout

Use a 4-point base with named steps. Default content gutters are 16 on compact mobile, 24 on large mobile/tablet, and responsive constrained widths on web. Fixed-format boards, toolbars, tiles, and nav bars require stable dimensions.

## Shape

Cards use a maximum 8px radius unless an approved platform component or glass control requires another token. Do not place cards inside cards. Page sections are unframed bands. Pills are reserved for tags, compact filters, status, and segmented controls.

## Elevation

Prefer borders, tonal separation, and local shadow. Strong shadows are reserved for temporary overlays. Glass is specified separately in `GLASS-SYSTEM.md`.

## Component contract

Every interactive component defines:

- default, hover where relevant, focused, pressed, selected, disabled, loading, error, and success states;
- keyboard and screen-reader semantics;
- minimum 44 x 44 iOS and 48 x 48 Android touch targets;
- reduced-motion behaviour;
- content-length and large-text constraints;
- analytics event, when needed, without personal data.

## Primitives before patterns

Build tokens and primitives first: text, icon, button, input, selection control, divider, surface, overlay, feedback, progress, and navigation. Product patterns such as service picker, booking step, job card, and support handoff compose those primitives.
