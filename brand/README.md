# Brand assets

Source of truth for the app icon and every derived image on the site.

| File | What it is |
|---|---|
| `logo-original.png` | The delivered artwork, converted from JPEG to PNG once, losslessly from here on |
| `icon-1024.png` | Full-bleed square for the App Store — the baked-in rounded corners filled with the card colour |

Site images in `../assets/` are generated from `icon-1024.png` by
`tools/makeicons.py`. Do not edit them by hand.

## Colours

| | Hex | Where |
|---|---|---|
| Pot red | `#D4101A` | `--accent` in light mode |
| Card cream | `#FEF2E2` | the ground the pot sits on |
| Lifted red | `#F26A5C` | `--accent` in dark mode — the brand red is too dark to read on a dark ground, so it is lifted rather than replaced |

## Three things to fix before submission

**The source is a JPEG.** Flat colour and hard edges are the worst case for JPEG,
and the artwork carries visible ringing along the pot's outline at full size.
Apple wants a 1024×1024 PNG with no alpha for the App Store icon, and everything
here is regenerated from that one file. Re-export the artwork as PNG — or better
as SVG, since the shape is flat vector work and would then scale to every size
without a resampling step at all.

**The corners are pre-rounded, and iOS rounds again.** The delivered file is a
cream card with rounded corners on white. iOS applies its own mask, so a
pre-rounded icon is rounded twice and shows white slivers outside the card.
`icon-1024.png` fixes it by flooding that white with the card colour — a repair,
not a design. The artwork should be re-exported full-bleed to the edge.

**The monogram will not survive a favicon.** At 32 px, and on a home screen, the
letters inside the pot become texture rather than letters. That is not a fault
in the drawing — it is what happens to any mark with interior detail at that
size. If a small size matters, the usual answer is a second, simpler cut of the
mark: the pot silhouette alone, no lettering. That is a design decision and has
deliberately not been made here.
