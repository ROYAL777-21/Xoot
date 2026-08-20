# Design System

Status: provisional foundations pending approved Figma variables and frames.

> ⚠️ **PARTLY SUPERSEDED BY `Xoot_App.html` — see ZD-030 (2026-08-13).** This document predates the
> exported kit, and `design/README.md` states that where the two disagree the export wins. Two
> sections here are out of date and are marked inline below: **Typography** and **Shape**. The
> semantic token model, component contract, spacing base and "primitives before patterns" all
> still stand and are what the port is built on.

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

⚠️ **Superseded (ZD-030).** Web now uses **Newsreader** for display and **Plus Jakarta Sans**
for body — the families the exported kit names in its own `--xoot-font-display` and
`--xoot-font-core` tokens — self-hosted as subset variable WOFF2 (73 KB total, SIL OFL-1.1). The
Space Grotesk / DM Sans pairing below was never shipped.

Web previously used Space Grotesk for display and DM Sans for body through Fontsource under OFL-1.1. Native currently uses system type. Preserve system type on mobile for performance and platform fidelity unless an approved Figma comparison justifies a bundled family.

Typography rules:

⚠️ **Two of these are superseded (ZD-030).** The exported kit uses negative letter-spacing on
display type and positive-tracked UPPERCASE labels, measured from its own modules:
`--xoot-track-label` (+0.1em) 18 uses, `--xoot-track-tight` (-0.01em) 7, `--xoot-track-display`
(-0.018em) 4 — and `SectionLabel.tsx`, ported straight from the kit, renders uppercase text with
the label tracking. Per `design/README.md` the export is the newer authority. `src/index.css` maps
Tailwind's `tracking-tight` onto `--xoot-track-display` so the components inherit the kit's value.
The remaining rules below still stand.

- no viewport-scaled font sizes;
- ~~no negative letter spacing~~ — superseded; use `--xoot-track-display` / `--xoot-track-tight`;
- ~~sentence case by default~~ — superseded for labels and eyebrows, which take
  `--xoot-track-label` with `text-transform: uppercase`; still the default for prose and headings;
- compact panel headings remain compact;
- support Dynamic Type and Android font scaling;
- numbers and status labels must not rely on colour alone.

## Spacing and layout

Use a 4-point base with named steps. Default content gutters are 16 on compact mobile, 24 on large mobile/tablet, and responsive constrained widths on web. Fixed-format boards, toolbars, tiles, and nav bars require stable dimensions.

## Shape

⚠️ **Superseded (ZD-030).** The exported kit honours an 8px cap nowhere; it ships a radius scale
of 10 / 14 / 16 / 20 / 26 / 34 px plus a pill, as `--xoot-radius-xs` through `--xoot-radius-xl`.
Use that scale. The rules that follow in this section — no cards inside cards, unframed section
bands, pills reserved for tags and filters — are unaffected and are being applied.

Previously: cards use a maximum 8px radius unless an approved platform component or glass control requires another token. Do not place cards inside cards. Page sections are unframed bands. Pills are reserved for tags, compact filters, status, and segmented controls.

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
