# Public assets

Static assets served from the site root by Next.js.

## Required for Meta App Review (Issue #17)

Before submitting to Meta App Review, replace the placeholders with the
final brand assets:

| Path | Purpose | Spec |
|------|---------|------|
| `icon-1024.png` | Meta App Review app icon | 1024×1024 PNG, square, no transparency, no text. The same icon shows up on Meta's reviewer queue and in some IG surfaces. |
| `logo.svg` | Site logo (header) | Inline SVG, brand colors. |
| `logo-mark.svg` | Square mark for OAuth screens | Inline SVG, square. |
| `favicon.ico` | Browser tab icon | 32×32 ICO (multi-resolution acceptable). |
| `apple-touch-icon.png` | iOS home-screen icon | 180×180 PNG. |
| `og-image.png` | Open Graph preview | 1200×630 PNG. |

Until those are supplied, Next.js falls back to its default favicon and
the OAuth/App Review screens show no app icon.

This README is the only file in the directory at MVP-1 scaffolding time —
the rest are design work tracked in `docs/ops/launch-prerequisites.md`.
