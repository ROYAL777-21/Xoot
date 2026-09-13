"""Build the uploaded handoff's WOFF2 fonts without changing their variable axes.

Requires fonttools[woff] for this optional authoring step. Builds consume the
committed WOFF2 files and do not install Python or download fonts.
"""

from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "design/handoff-2026-09-03/xoot/assets/fonts"
OUTPUT = ROOT / "public/fonts"
FONTS = {
    "PlusJakartaSans[wght].ttf": "plus-jakarta-sans-latin-var.woff2",
    "Newsreader[opsz,wght].ttf": "newsreader-latin-var.woff2",
    "Caveat[wght].ttf": "caveat-latin-var.woff2",
}

# Latin including Afrikaans diacritics, common punctuation, currency and arrows.
UNICODES = set(range(0x20, 0x250)) | set(range(0x2000, 0x2070))
UNICODES |= set(range(0x20A0, 0x20D0)) | set(range(0x2190, 0x2200))
UNICODES |= {0x25CF, 0x2713, 0x2717, 0x2605, 0x2606}

if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for source_name, output_name in FONTS.items():
        font = TTFont(SOURCE / source_name, recalcTimestamp=False)
        original_axes = [(a.axisTag, a.minValue, a.maxValue) for a in font["fvar"].axes]
        options = subset.Options()
        options.layout_features = ["*"]
        options.flavor = "woff2"
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=UNICODES)
        subsetter.subset(font)
        font.flavor = "woff2"
        destination = OUTPUT / output_name
        font.save(destination)
        with TTFont(destination) as result:
            axes = [(a.axisTag, a.minValue, a.maxValue) for a in result["fvar"].axes]
            assert axes == original_axes, f"Variable axes changed in {output_name}"
        size = destination.stat().st_size
        total += size
        print(f"{output_name}: {size:,} bytes; axes preserved: {axes}")
    print(f"Total: {total:,} bytes")
