"""Generate static native font weights from the uploaded handoff.

Requires fonttools. Runtime builds use the committed files without Python.
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "design/handoff-2026-09-03/xoot/assets/fonts"
OUTPUT = ROOT / "mobile/assets/fonts"
FONTS = [
    ("PlusJakartaSans[wght].ttf", "XootJakarta", {"wght": 500}),
    ("PlusJakartaSans[wght].ttf", "XootJakartaBold", {"wght": 700}),
    ("Newsreader[opsz,wght].ttf", "XootNewsreader", {"wght": 400, "opsz": 36}),
    ("Newsreader[opsz,wght].ttf", "XootNewsreaderStrong", {"wght": 600, "opsz": 36}),
    ("Caveat[wght].ttf", "XootCaveat", {"wght": 600}),
    ("DMMono-Regular.ttf", "XootMono", {}),
]

if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for filename, name, axes in FONTS:
        font = TTFont(SOURCE / filename, recalcTimestamp=False)
        if axes:
            font = instantiateVariableFont(font, axes, inplace=True)
        font.flavor = None
        destination = OUTPUT / f"{name}.ttf"
        font.save(destination)
        print(f"{name}: {destination.stat().st_size:,} bytes")
