# Sunset Palms Cover Press

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/haidildariell/gta6-cover-art-01-v4/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/haidildariell/gta6-cover-art-01-v4/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Bounty: https://make.fun/bounty/gta6-cover-art-01

An offline browser app that turns your photos into GTA 6-style multi-panel
poster cover art — a Vice City sunset/neon grade, comic halftone ink, a giant
gradient title with a neon script subtitle, and a starburst badge — exported
as a shareable PNG.

## What it does

- **6 layouts** — 9-panel grid with title block (the default), Hero + Three,
  Full Bleed, Tilted Snapshots, 4-panel grid, and 2-panel split.
- **6 grades** — Sunset, Neon Nights, Teal Noir, Rose Gold, Mono Poster, and
  Poster Ink, a real halftone dot screen drawn on canvas (posterize +
  duotone gradient map + ink dots that follow the photo's luminance).
- **Any photo** — upload photos from your machine (they never leave it),
  fill several panels with one photo or several, drag to position each
  panel's photo, scroll to zoom, reset the crop per panel.
- **Lettering** — editable eyebrow, giant gradient title, neon script
  subtitle, tagline strip, and starburst badge, all drawn on canvas.
- **Fast and easy** — one-click presets (Photo Cover, Hero Photo, Neon
  Night), undo/redo (Ctrl+Z / Ctrl+Y), and one-click PNG export in
  1080 × 1080, 1080 × 1350, and 1920 × 1080.
- **Polish** — film grain, vignette, palm silhouettes, live preview.
- **Fully offline** — every script, font, and image is a file under `app/`;
  the page makes zero network requests.

## How to run

Any static server works:

```sh
node serve.ts
# open http://localhost:8080
```

or `python3 -m http.server` from `app/`, then open `index.html`.

## How to use

1. Upload your photos, or click a sample photo to put it in the selected
   panel (double-click fills every panel).
2. Pick a layout and a grade, or hit a preset.
3. Edit the title, subtitle, tagline, and badge.
4. Click a panel, drag to reposition its photo, scroll to zoom.
5. Export a PNG in Square, Story, or Wide.

## Photo credits

Sample photos generated with an image model for this entry; no real person
depicted. Fonts: Anton and Pacifico, both under the SIL Open Font License
(see `app/fonts/OFL-Anton.txt` and `app/fonts/OFL-Pacifico.txt`).

## Files

- `main.ts` — the program that hands the app in (Node 22, stdlib only).
- `app/index.html`, `app/style.css`, `app/src/` — the editor
  (`cover.js` layouts + renderer, `grades.js` grades + halftone,
  `editor.js` state/undo/presets/export, `main.js` boot).
- `app/fonts/` — Anton + Pacifico (OFL).
- `app/samples/` — the four sample photos.
- `screenshots/` — the exported cover and the editor at work.
