#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regenerate every image from brand/icon.svg.

    python3 tools/makeicons.py

Needs `rsvg-convert` (Debian/Ubuntu: librsvg2-bin) and Pillow. Both are
deliberately outside the site build, which stays dependency-free and runs in
CI: this runs by hand on the rare occasion the artwork changes, and its output
is committed.

Rendering each size from the vector rather than downsampling one bitmap is the
whole point of having the vector. A 32-pixel favicon resampled from 1024 pixels
is mush; rendered at 32 it is as good as 32 pixels can be.
"""
import os
import subprocess
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, "brand", "icon.svg")
OUT = os.path.join(ROOT, "assets")
CREAM = (0xFE, 0xF2, 0xE2)

SIZES = [(1024, os.path.join(ROOT, "brand", "icon-1024.png")),
         (512, None), (180, None), (32, None), (16, None)]
NAMES = {512: "logo-512.png", 180: "apple-touch-icon.png",
         32: "favicon-32.png", 16: "favicon-16.png"}


def render(size, path):
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size),
                    SVG, "-o", path], check=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    for size, explicit in SIZES:
        path = explicit or os.path.join(OUT, NAMES[size])
        render(size, path)
        print("  %4d  %s" % (size, os.path.relpath(path, ROOT)))

    # Open Graph card: the mark on the same cream, at the ratio every
    # link-preview crops to.
    tmp = os.path.join(OUT, "_mark.png")
    render(420, tmp)
    og = Image.new("RGB", (1200, 630), CREAM)
    og.paste(Image.open(tmp).convert("RGB"), ((1200 - 420) // 2, (630 - 420) // 2))
    og.save(os.path.join(OUT, "og-image.png"))
    os.remove(tmp)
    print("  1200x630  assets/og-image.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
