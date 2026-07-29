# Design reference images

**Phase 1 is blocked until the dispatch-conversation reference images land here.**

The founder is open to replacing the app's design system and colours to align with images
shared in the dispatch conversation. Those images are not reachable from a Claude Code
session — they have to be committed to the repo (or re-shared in-session) before Phase 1's
palette work can be anything better than a guess.

Drop them in this folder, any common raster or vector format. A short note per image helps
("this is the palette I want", "this is the card layout", "this is the flower motif") — the
intent matters more than the file.

## What Phase 1 is waiting to resolve

1. **Palette.** Keep the existing `src/styles.css` tokens (cream / ivory / gold / brown /
   charcoal, OKLCH, "Heritage editorial luxe"), or replace them from these references.
2. **The repo drift.** `docs/BRAND_GUIDE.md` specifies Space Grotesk + DM Sans with
   terracotta and sage. `src/styles.css` specifies Cormorant Garamond + Inter with
   cream/gold/brown. These have never been reconciled. New references may settle it, or may
   introduce a third direction.
3. **Zoey's red.** Her default fill becomes red — which red depends on the palette landing here.
4. **Flowers.** Wanted in the splash screen and elsewhere for vibrancy. Style depends on these.

See `docs/xoot-master-brief.md` §3 for the full conflict write-up.
