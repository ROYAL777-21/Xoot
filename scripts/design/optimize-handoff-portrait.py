"""Encode the uploaded full-resolution portrait for high-density screens.

Optional authoring dependency: Pillow. No crop, resize or artwork change.
The lower-resolution supplied WebP remains the default source.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "design/handoff-2026-09-03/xoot/assets/marketing/xooter-female-polo.png"
TARGET = ROOT / "src/assets/xooter-female-polo-large.webp"

if __name__ == "__main__":
    with Image.open(SOURCE) as portrait:
        assert portrait.size == (1792, 2400), "Inspect changed source dimensions before regenerating"
        portrait.save(TARGET, "WEBP", quality=90, method=6)
    print(f"{TARGET.name}: 1792x2400, {TARGET.stat().st_size:,} bytes")
