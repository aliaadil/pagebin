#!/usr/bin/env bash
# Build all pagebin brand PNGs from the master SVGs.
# Run from the repo root: bash assets/brand/build.sh
#
# Outputs:
#   - public/favicon-16x16.png        public/favicon-32x32.png        public/favicon-48x48.png
#   - public/favicon-180x180.png      public/favicon-512x512.png       public/apple-touch-icon.png
#   - public/og-card.png              (1200x630)
#   - assets/brand/logo-mono-512.png  (monochrome PNG)
#
# Requirements: resvg (cargo install resvg or uv tool install resvg)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BRAND="$ROOT/assets/brand"
PUB="$ROOT/public"

if ! command -v resvg >/dev/null 2>&1; then
  echo "resvg not found. Install with:  uv tool install resvg" >&2
  exit 1
fi

mkdir -p "$PUB"

echo "==> Rendering favicons (square mark, simplified for tiny sizes)"
resvg -w 16  -h 16  "$BRAND/logo-square-mark.svg" "$PUB/favicon-16x16.png"
resvg -w 32  -h 32  "$BRAND/logo-square-mark.svg" "$PUB/favicon-32x32.png"
resvg -w 48  -h 48  "$BRAND/logo-square-mark.svg" "$PUB/favicon-48x48.png"

echo "==> Rendering 180 (apple-touch-icon) + 512 (master tile, full mark)"
resvg -w 180 -h 180 "$BRAND/logo-square.svg"      "$PUB/favicon-180x180.png"
resvg -w 512 -h 512 "$BRAND/logo-square.svg"      "$PUB/favicon-512x512.png"

# Apple touch icon: same source as 180 but conventionally a flat square w/o transparency.
# We pin it to a copy here, and the layout.tsx <link> will target favicon-180x180.png.

echo "==> Rendering OG / Twitter social card (1200x630)"
resvg -w 1200 -h 630 "$BRAND/og-card.svg"        "$PUB/og-card.png"

echo "==> Rendering monochrome variant (PNG, dark BG)"
resvg -w 512  -h 512 "$BRAND/logo-mono.svg"      "$BRAND/logo-mono-512.png" \
  --background "#0F172A"

echo
echo "Done. Listing PNG deliverables:"
ls -la "$PUB"/favicon-*.png "$PUB"/apple-touch-icon.png "$PUB"/og-card.png 2>/dev/null || true
ls -la "$BRAND"/logo-mono-512.png
