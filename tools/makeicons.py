#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regenerate the site's images from brand/icon-1024.png.

    python3 tools/makeicons.py

Needs Pillow, which is why it is a separate script rather than part of build.py:
the site build stays dependency-free and runs in CI, while this runs by hand on
the rare occasion the artwork changes. Its output is committed.
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "brand", "icon-1024.png")
OUT = os.path.join(ROOT, "assets")
CREAM = (0xFE, 0xF2, 0xE2)


def main():
    im = Image.open(SRC).convert("RGB")
    os.makedirs(OUT, exist_ok=True)
    for size, name in ((512, "logo-512.png"), (180, "apple-touch-icon.png"),
                       (32, "favicon-32.png"), (16, "favicon-16.png")):
        im.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))
    og = Image.new("RGB", (1200, 630), CREAM)
    og.paste(im.resize((420, 420), Image.LANCZOS), ((1200 - 420) // 2, (630 - 420) // 2))
    og.save(os.path.join(OUT, "og-image.png"))
    print("assets/ regenerated from brand/icon-1024.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
