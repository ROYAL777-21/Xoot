# Palette migration — red/white to the kit's violet, with red scoped to Care+

Approved by the founder 2026-08-02. This file holds the computed mapping and the contrast
audit so the swap itself is mechanical.

## The finding that changes two values

The kit's brand colours **fail WCAG AA for white body text at their 500 weight**. Measured:

| Pair | Ratio | Verdict |
|---|---|---|
| white on `violet-500` `#7C5CFC` | **4.38** | fails AA body (needs 4.5) |
| white on `violet-600` `#6440E8` | 6.10 | passes |
| white on `careplus-500` `#E63329` | **4.31** | fails AA body |
| white on `ink-900` `#151515` | 18.26 | passes |
| `ink-900` on `neutral-25` | 16.51 | passes |
| `neutral-500` on `neutral-25` | 4.00 | UI/large text only |
| white on `sage-500` | 3.25 | UI only |
| white on `mist-500` | 3.38 | UI only |
| white on `coral-500` | 3.87 | UI only |
| `ink-900` on `honey-500` | 8.43 | passes |

This codebase already learned this once. `src/index.css` carries the note that `--primary` is
`51%` rather than `53%` because "at 53% white-on-red measures 4.35:1, which fails AA for body
text and a 14px button label is body text". The kit's `careplus-500` is `3 79% 53%` — the same
colour at the same lightness, with the same problem.

**So any filled surface carrying white text uses the 600, not the 500:**

- Violet CTA or chip with a white label → `violet-600` `253 79% 58%`.
- Care+ badge or paywall button with white text → darken to `3 79% 51%`, matching the
  existing `--primary` precedent, or use `careplus-600` `2 77% 44%`.
- The 500s stay correct for fills that carry no text, borders, icons, and tints.

A pleasing coincidence worth recording: `careplus-500` converts to `3 79% 53%` and the
existing `--zoey-fill` is `3 78% 53%`. The company red and Zoey's red are already the same
colour, so scoping red to Care+ does not change the mascot at all.

## Computed HSL, kit hex to `src/index.css` format

| Kit token | Hex | HSL |
|---|---|---|
| `violet-500` | `#7C5CFC` | `252 96% 67%` |
| `violet-600` | `#6440E8` | `253 79% 58%` |
| `violet-300` | `#C6B9FA` | `252 87% 85%` |
| `violet-100` | `#EDE9FD` | `252 83% 95%` |
| `ink-900` | `#151515` | `0 0% 8%` |
| `ink-800` | `#242424` | `0 0% 14%` |
| `ink-600` | `#5A5754` | `30 3% 34%` |
| `neutral-0` | `#FFFFFF` | `0 0% 100%` |
| `neutral-25` | `#F5F3F2` | `20 13% 95%` |
| `neutral-50` | `#EFEDEB` | `30 11% 93%` |
| `neutral-100` | `#E8E5E3` | `24 10% 90%` |
| `neutral-200` | `#DCD8D5` | `26 9% 85%` |
| `neutral-300` | `#C6C1BD` | `27 7% 76%` |
| `neutral-500` | `#7C7773` | `27 4% 47%` |
| `neutral-600` | `#5E5A56` | `30 4% 35%` |
| `careplus-500` | `#E63329` | `3 79% 53%` |
| `careplus-600` | `#C4211A` | `2 77% 44%` |
| `careplus-wash` | `#FDEBE8` | `9 84% 95%` |
| `sage-500` | `#3AA075` | `155 47% 43%` |
| `honey-500` | `#E7A338` | `37 78% 56%` |
| `mist-500` | `#4A8FD8` | `211 65% 57%` |
| `coral-500` | `#E64B36` | `7 78% 56%` |
| `onboard-900` | `#1A1614` | `20 13% 9%` |

## Semantic mapping

The kit's rule is that the commit button is ink and violet carries emphasis, selection and
progress. Mapping onto this codebase's existing semantic names:

| `src/index.css` | Becomes | Kit source |
|---|---|---|
| `--background` | `20 13% 95%` | `surface-page` / `neutral-25` |
| `--foreground` | `0 0% 8%` | `text-primary` / `ink-900` |
| `--card` | `0 0% 100%` | `surface-card` / `neutral-0` |
| `--primary` | `0 0% 8%` | `action-primary` / `ink-900` — the commit button |
| `--primary-foreground` | `0 0% 100%` | `neutral-0` |
| **`--brand`** (new) | `253 79% 58%` | `action-brand`, at the 600 for AA |
| **`--brand-foreground`** (new) | `0 0% 100%` | |
| `--care-plus` | `3 79% 51%` | `careplus-500`, darkened 2% for AA |
| `--secondary` | `30 11% 93%` | `neutral-50` |
| `--muted` | `24 10% 90%` | `neutral-100` |
| `--muted-foreground` | `27 4% 47%` | `neutral-500` |
| `--border` | `26 9% 85%` | `neutral-200` |
| `--success` | `155 47% 43%` | `sage-500` |
| `--warning` | `37 78% 56%` | `honey-500` |
| `--info` | `211 65% 57%` | `mist-500` |
| `--destructive` | `7 78% 56%` | `coral-500` |
| `--zoey-fill` | unchanged `3 78% 53%` | already the company red |

Adding `--brand` rather than repurposing `--accent` is deliberate. `--accent` is currently
marigold and is consumed in places that expect a dark foreground; silently turning it violet
would change those without anyone deciding to. `--accent` maps to `honey-500`, which is the
kit's nearest equivalent and keeps existing usages reading the same.

## Order of work

1. Light `:root` in `src/index.css`, then the `.dark` scope from the kit's
   `[data-theme="dark"]` block.
2. Mirror into `src/lib/design-tokens.ts` — `design-tokens.test.ts` parses `index.css` and
   fails on any drift, so this is enforced rather than remembered.
3. `npm run shared:sync`, then `npm run icons:render` — the launcher and launch-screen images
   are generated from the mascot against the background colour and will be stale.
4. `mobile/app.config.ts`: the splash and adaptive-icon backgrounds are `#15100f` and the app
   is pinned dark. The kit is light-default. `ios-build-setup.test.ts` fails if the launch
   screen and the pinned scheme disagree, so those move together or not at all.
5. Re-run the contrast audit over every foreground/background pair actually used, not just the
   ten above.

## Not yet done

Steps 1–5. The values are computed and the traps are named; what remains is the edit itself
and verifying no component reads a token in a way this mapping changes unintentionally.
