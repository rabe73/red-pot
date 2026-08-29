# Brand assets

Source of truth for the app icon and every derived image on the site.

| File | What it is |
|---|---|
| `icon.svg` | **The source.** 3 KB of vector, full-bleed, two flat colours |
| `icon-1024.png` | Rendered from it for the App Store icon |
| `logo-original.png` | The delivered JPEG artwork, kept for reference |

Everything in `../assets/` and `icon-1024.png` is rendered from `icon.svg` by
`tools/makeicons.py`. Do not edit them by hand.

## How the vector was made

The artwork arrived as a 1024×1024 JPEG. It was recovered rather than redrawn:

1. Every pixel classified as pot-red or card-cream by nearest colour — not by a
   luminance threshold, which turns JPEG ringing into speckle along every edge.
2. A 5×5 median filter to drop the remaining isolated pixels without moving real
   edges.
3. `potrace` over the resulting bitmap, `--alphamax 1.0 --opttolerance 0.2`.
4. The traced path dropped onto a full-bleed cream square at the brand red.

**It is 0.12 % different from the original by pixel classification**, which is
edge smoothing, and it is better than the original in three ways: no JPEG
ringing, no baked-in rounded corners, and every size rendered from the vector
instead of resampled from one bitmap. The 1024 PNG went from 260 kB to 38 kB
because most of that file was compression noise.

It is still a **reconstruction**. If the original vector file exists, use it —
a trace inherits whatever the JPEG lost, and no measurement of the JPEG can
find that.

## Colours

| | Hex | Where |
|---|---|---|
| Pot red | `#D4101A` | `--accent` in light mode |
| Card cream | `#FEF2E2` | the ground the pot sits on |
| Lifted red | `#F26A5C` | `--accent` in dark mode — the brand red is too dark to read on a dark ground, so it is lifted rather than replaced |

## What is now fixed, and what is not

Two of the three problems the delivered file had are gone: it is no longer a
JPEG, and the corners are no longer pre-rounded — `icon.svg` is full-bleed, so
iOS's own mask is the only rounding applied.

**The monogram still will not survive a favicon.** At 32 px, and on a home screen, the
letters inside the pot become texture rather than letters. That is not a fault
in the drawing — it is what happens to any mark with interior detail at that
size, and rendering from the vector helps the edges without helping the
counters. If a small size matters, the usual answer is a second, simpler cut of
the mark: the pot silhouette alone, no lettering. With `icon.svg` that is now a
five-minute edit — delete the letter paths — but it is a design decision and has
deliberately not been made here.
