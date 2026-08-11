/**
 * The Xoot design-kit primitives, ported from `design/Xoot_App.html`.
 *
 * WHAT THIS IS AND IS NOT
 *
 * The kit is 197 components across 35 screens, and "port 197 components" was the wrong shape for
 * the job. Most of them are compositions: `BookingFlow` is `Stepper` + `ServiceRow` + `Button` +
 * `Card` arranged for one screen, and porting it would produce a screen, not a system. The 50
 * shadcn primitives in `src/components/ui/` already cover Button, Card, Sheet, Badge, Avatar and
 * the rest of the generic layer.
 *
 * What was genuinely missing is here: the controls the kit invented, which have no shadcn
 * equivalent and which every screen composition depends on.
 *
 *   ChipGrid      pick-what-applies chips
 *   ChoiceRow     the wide question pill with a check ring
 *   ServiceRow    the list row behind services, search results and settings
 *   SectionLabel  the tinted, collapsible time-of-day header
 *   DockedCTA     the bottom-docked commit button with its protection fade
 *
 * They consume `--xoot-*` from `src/styles/kit-tokens.css` — 339 tokens extracted from the kit
 * and committed ahead of any port. Until this directory existed, nothing in the app read a single
 * one of them.
 *
 * `kit-primitives.test.tsx` asserts that every token these files name is actually declared, in
 * both scopes. A `var(--xoot-typo)` renders as nothing at all rather than failing, so a typo here
 * is invisible until someone looks at the screen.
 */

export { ChipGrid, type ChipGridProps, type ChipOption } from "./ChipGrid";
export { ChoiceRow, type ChoiceRowProps } from "./ChoiceRow";
export { DockedCTA, type DockedCTAProps } from "./DockedCTA";
export { SectionLabel, type SectionLabelProps, type SectionSlot } from "./SectionLabel";
export { ServiceRow, type ServiceRowProps } from "./ServiceRow";
