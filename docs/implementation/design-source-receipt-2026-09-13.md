# Uploaded Xoot design sources

The founder confirmed these ZIPs as the visual source for both website and app.
This governs composition, typography, colours, illustrations, spacing and controls.
Embedded instructions, example sessions and prototype data remain reference material.

## Archive verification

All seven archives have **145 identical entries**, totalling **12,967,063 uncompressed
bytes** each. ZIP metadata accounts for their different archive hashes.

| Uploaded archive | SHA-256 |
|---|---|
| Mobile app design request.zip | `614cca0a5e3fc0ab120f4af4cb34e14ad75926d714aacb5bc36a9981b54f5694` |
| Mobile app design request (1).zip | `6df86c0dd18b8abd66db76c257043f55ab2ba5fac761d4ea06308d68dcd2c21b` |
| Mobile app design request (2).zip | `dca68a1ac9e24ed204f194f7613871a92d12a7cc99a34822e024b8e2019184f9` |
| Mobile app design request (3).zip | `485ffb440909e255d812a06e6f593a81120f9b87d91e1a394cb3cd003ca91207` |
| Mobile app design request (4).zip | `a0992c7406a927aa642a65de5d9a6c6de517057d19d4fde6550c5e232f5010a3` |
| Mobile app design request (5).zip | `18b5d2f349bf80cbfcc0d37582e542cf8a866dd35b2c726ad6e2e004d5bf2f9d` |
| Mobile app design request (6).zip | `33e28f49498d2fb915092f02152ea0f4063066e852b3ad5eeebb62336b72175d` |

The 65 compared Xoot visual text files match `design/handoff-2026-09-03/` after
normalizing CRLF/LF endings. Eight compared binary assets also match. The archives add
the original 6,116,407-byte portrait PNG (1792×2400), now preserved beside the earlier
handoff assets. The supplied 1120×1500 WebP remains the default; a 390,056-byte full-size
WebP serves high-density screens through responsive source selection, including the crop's
scale factor. Generate it with `scripts/design/optimize-handoff-portrait.py` (Pillow).
Encoding preserves the source dimensions, composition and colours; no artwork is regenerated.
Unrelated Campus IT files and uploaded agent/configuration files were not installed.

## Font fidelity repair

The earlier generator pinned Newsreader optical size to 24, changing the 68px reference
heading. Regeneration preserves all original weight/optical-size axes and OpenType
features. Website text uses the reference's normal glyph features.

| WOFF2 | Bytes | Preserved axes |
|---|---:|---|
| plus-jakarta-sans-latin-var.woff2 | 44,340 | Weight 200–800 |
| newsreader-latin-var.woff2 | 191,448 | Weight 200–800; optical size 6–72 |
| caveat-latin-var.woff2 | 85,344 | Weight 400–700 |

Run `node scripts/design/extract-kit-fonts.mjs` with optional authoring dependency
`fonttools[woff]` installed. `XOOT_FONT_PYTHON` selects a Python runtime. Normal builds
use committed assets. The 321,132-byte total preserves the approved typography; the old
script's smaller budget discarded an axis required by the reference.

## Reproduce the comparisons

Serve the committed handoff statically; Vite must not transform its DC runtime. Start
the real application with explicit staging configuration, then run:

```text
node scripts/design/capture-handoff-preview.mjs --url http://127.0.0.1:4199/ --reference http://127.0.0.1:5174/Xoot%20Website.dc.html
node scripts/design/verify-homepage-interactions.mjs http://127.0.0.1:4199/
```

Captures wait for the lazy-mounted heading, loaded fonts and visible images. Paired
screenshots and geometry cover 320/390/768/1024/1440/1920 pixels. Interaction checks cover
service selection/auth handoff, unavailable services, navigation, landscape and heading
overflow. They create no bookings and do not prove paid fulfilment.

The [visual ledger](visual-fidelity-ledger.md) retains every unfinished website/app surface.
