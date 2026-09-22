#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Compose brand/icon.svg from its layers, then regenerate every image.

    python3 tools/makeicons.py

Needs `rsvg-convert` (Debian/Ubuntu: librsvg2-bin) and Pillow. Both are
deliberately outside the site build, which stays dependency-free and runs in
CI: this runs by hand on the rare occasion the artwork changes, and its output
is committed.

Rendering each size from the vector rather than downsampling one bitmap is the
whole point of having the vector. A 32-pixel favicon resampled from 1024 pixels
is mush; rendered at 32 it is as good as 32 pixels can be.

**`brand/layers/` is the source now, and `icon.svg` is made here.** The app
ships a layered icon -- the pot and the monogram as separate pictures, so the
system can give each one its own shadow and highlight and derive the dark,
tinted and clear appearances itself. Only one of the two forms can be the
truth, and it has to be the layered one: stacking layers into the flat picture
is three lines and cannot go wrong, while cutting the flat picture apart meant
knowing that the body path's second subpath is the monogram and that two
further paths are the bowls of the letters. That held for exactly as long as
nobody re-traced the artwork.

**The monogram is a hole no longer.** In the old `icon.svg` the letters were
a counter in the pot and the cream ground showed through them. As a layer they
are a cream shape drawn on top. The picture is the same -- the pot is opaque
and the ground behind it is the same cream -- but the drawing is no longer one
shape, and `--verify` is what says the pictures still match.
"""
import io
import os
import subprocess
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, "brand", "icon.svg")
# **Bottom first -- this is paint order, not stacking order.** An `.icon`
# document lists its groups top first and an SVG paints back to front, and
# getting that backwards puts the monogram behind an opaque pot, where it
# survives as a faint ghost that looks like a design decision.
LAYERS = [os.path.join(ROOT, "brand", "layers", name)
          for name in ("pot.svg", "monogram.svg")]
# The same mark without the lettering. Below about 48 pixels the monogram's
# counters close up and it reads as damage rather than as letters, so the small
# sizes use the pot alone. Nothing above that size needs it.
MARK = os.path.join(ROOT, "brand", "mark.svg")
MARK_BELOW = 48
OUT = os.path.join(ROOT, "assets")
CREAM = (0xFE, 0xF2, 0xE2)

SIZES = [(1024, os.path.join(ROOT, "brand", "icon-1024.png")),
         (512, None), (180, None), (32, None), (16, None)]
NAMES = {512: "logo-512.png", 180: "apple-touch-icon.png",
         32: "favicon-32.png", 16: "favicon-16.png"}


def compose():
    """Write brand/icon.svg: the cream ground, then the layers over it.

    Each layer contributes the two nested transforms it was cut with and its
    own paths; everything between the `<title>` and the closing tag is taken
    as-is, so a layer stays an ordinary SVG that any editor can open.
    """
    parts = []
    for path in LAYERS:
        text = io.open(path, encoding="utf-8").read()
        start = text.index("</title>") + len("</title>")
        parts.append(text[start:text.rindex("</svg>")].strip("\n"))
    svg = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"'
           ' width="1024" height="1024" role="img" aria-label="Red Pot">\n'
           '  <title>Red Pot</title>\n'
           '  <rect width="1024" height="1024" fill="#FEF2E2"/>\n'
           + "\n".join(parts) + "\n</svg>\n")
    io.open(SVG, "w", encoding="utf-8").write(svg)
    print("  %s  from %d layers" % (os.path.relpath(SVG, ROOT), len(LAYERS)))


def render(size, path, src=None):
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size),
                    src or (MARK if size < MARK_BELOW else SVG), "-o", path],
                   check=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    compose()
    for size, explicit in SIZES:
        path = explicit or os.path.join(OUT, NAMES[size])
        render(size, path)
        print("  %4d  %-28s %s" % (size, os.path.relpath(path, ROOT),
                                   "mark" if size < MARK_BELOW else "icon"))

    # Open Graph card: the mark on the same cream, at the ratio every
    # link-preview crops to.
    tmp = os.path.join(OUT, "_mark.png")
    render(420, tmp, SVG)
    og = Image.new("RGB", (1200, 630), CREAM)
    og.paste(Image.open(tmp).convert("RGB"), ((1200 - 420) // 2, (630 - 420) // 2))
    og.save(os.path.join(OUT, "og-image.png"))
    os.remove(tmp)
    print("  1200x630  assets/og-image.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
