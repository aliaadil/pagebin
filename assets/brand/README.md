# pagebin brand assets

The pagebin identity — a paginated pun, not a pastebin pun — comes from the
**folded-corner page sitting inside an open bin**. The page is the *page* of
the name; the bin is the *bin* of the name. Together the mark reads as a
stylized lowercase `p` with a deliberate page-of-a-book motif.

## Files

| File                              | Purpose                                  | Where to use                                          |
|-----------------------------------|------------------------------------------|-------------------------------------------------------|
| `logo-square.svg`                 | Master square mark (gradient + details)  | App icon, large headers, profile pictures             |
| `logo-square-mark.svg`            | Simplified square mark (fewer details)   | Favicons, OG/Twitter avatars, anything ≤ 48px         |
| `logo-horizontal.svg`             | Mark + wordmark, side-by-side            | Website header, docs covers, slide decks              |
| `logo-mono.svg`                   | Single-color mark (uses `currentColor`)  | Dark backgrounds, single-color print, footers         |
| `logo-mono-512.png`               | Pre-rasterized mono version on slate BG  | Embedded in dark docs / previews                      |
| `og-card.svg` / `og-card.png`     | Open Graph / Twitter social card         | `<meta property="og:image">` — render the PNG, never link the SVG (most platforms won't render it) |
| `apple-touch-icon.png`            | iOS home-screen icon                     | `<link rel="apple-touch-icon">`                       |
| `favicon.svg` / `favicon-*.png`   | Browser tab + bookmark icons             | `<link rel="icon">`                                   |
| `favicon.ico`                     | Legacy fallback (32×32 inside)           | Browsers that ignore the SVG version                  |

The same PNGs are also mirrored under `public/` so Next.js can serve them at
the site root (`/favicon.ico`, `/og-card.png`, …).

## Concept

- **The page.** A white rectangular page sits in the tray. It has a
  folded top-right corner — the universal "look, this is a page, not a screen"
  cue. Two to four pale indigo strokes run across it as placeholder text
  lines.
- **The bin.** An indigo tray cradles the page from below. The tray is a deep,
  saturated indigo (#6366F1 → #4338CA gradient) which gives the brand its
  primary color and stops the page from floating in empty space.
- **The pun.** Together, page + bin = pagebin. The folded corner literally
  curls into the bin — paste *goes in*, but it's a *page* that goes in.

## Colors

| Role           | Hex       | Where                              |
|----------------|-----------|------------------------------------|
| Bin (primary)  | `#6366F1` | Indigo-500 — gradient start        |
| Bin (deep)     | `#4338CA` | Indigo-700 — gradient end, tray    |
| Bin (rim)      | `#312E81` | Indigo-900 — inner shadow / depth  |
| Page (white)   | `#FFFFFF` | The page surface                   |
| Page (fold)    | `#D8DEE9` | The back of the folded corner      |
| Page (lines)   | `#6366F1` | Placeholder content strokes        |
| Wordmark gray  | `#1F2937` | "page" in the horizontal lockup    |
| Wordmark blue  | `#6366F1` | "bin" in the horizontal lockup      |

Use the wordmark blue only for "bin". The rest of the wordmark stays neutral
gray so the eye reads `page` (the product noun) before `bin` (the action).

## Sizing

The mark is geometrically anchored to a 512×512 viewBox. Practical sizes:

| Context                       | File                       | Min size |
|-------------------------------|----------------------------|----------|
| Browser tab (default)         | `favicon-32x32.png`        | 32px     |
| Browser tab (HiDPI)           | `favicon.svg`              | any      |
| iOS home screen               | `apple-touch-icon.png`     | 180px    |
| OG / Twitter card preview     | `og-card.png`              | 1200px   |
| Twitter / Discord avatar      | `favicon-512x512.png`      | 128px+   |
| README hero / docs cover      | `logo-horizontal.svg`      | 240px+   |
| Terminal splash / footer      | `logo-square-mark.svg`     | 24px+    |

Don't use `logo-square.svg` (the detailed version) below 64px. Below that,
the four text strokes smear into a single grey blob. Switch to
`logo-square-mark.svg` (two strokes + bigger fold) which is the simplified
version of the mark tuned for tiny sizes.

## Clear space

Reserve clear space around the mark equal to **the height of the bin tray
(roughly 1/6 of the mark's width)** on every side. Nothing — type, other
logos, edges of the canvas — should enter that zone.

```
  ┌────────────────────────────┐  ← clear space
  │                            │
  │       ┌──────────┐         │
  │       │  MARK    │         │
  │       └──────────┘         │
  │                            │
  └────────────────────────────┘
```

For the horizontal lockup, the clear space is the height of the wordmark
cap-height on the top and bottom, and the same on the left/right.

## Do

- Use the gradient mark on light, neutral, or photographic backgrounds.
- Use `logo-mono.svg` (or `logo-mono-512.png`) on dark backgrounds, dark
  hero panels, and inside other colored surfaces (e.g. on a teal cover slide).
- Re-color the mono mark via `currentColor` or the `color` attribute:
  `<svg color="#FACC15">` turns it yellow.
- Ship the PNG social card, not the SVG. Slack, Discord, X/Twitter and most
  link-previewers will not fetch SVGs.

## Don't

- Don't recolor the gradient mark. The indigo → deep-indigo gradient is the
  brand. If you need a different brand color, use the monochrome mark.
- Don't put the indigo mark on a saturated indigo or violet background —
  the bin disappears. Switch to monochrome.
- Don't add drop shadows, outer glows, or strokes around the mark.
- Don't stretch, skew, or rotate the mark.
- Don't place the mark below the minimum size for its variant.
- Don't edit the wordmark — *page* stays gray, *bin* stays indigo, the
  hyphen-like treatment comes from kerning only.
- Don't use the page-of-a-book motif on its own (without the bin). The bin
  is what carries the brand identity.

## Updating the assets

Re-render all PNGs from the SVG sources if anything changes:

```bash
# one-time install
uv tool install resvg

# from repo root
bash assets/brand/build.sh
```

The build script regenerates every PNG in `public/` and the monochrome PNG
pre-render. It does *not* regenerate `favicon.ico` or
`apple-touch-icon.png` — those are produced by an additional Pillow step
(see the comment in the script for the rationale, or just rerun `build.sh`
followed by `python3 -c "from PIL import Image; ..."` if you need to
repack the `.ico` multi-size container).
