# Cutframe

A browser-based video and photo editor, inspired by CapCut and Photoshop. It's a single self-contained HTML file — no build step, no server, no dependencies to install.

**[Live demo](#)** — replace with your GitHub Pages URL once published.

## Features

- **Filters** — 16 one-tap presets (Vivid, Warm, Cool, Noir, Cinema, Sunset, and more)
- **Adjust** — brightness, contrast, saturation, hue, sepia, blur, vignette, plus Auto enhance
- **Effects** — warmth, film grain, pixelate, border
- **Text** — draggable, colored, outlined or boxed, with fonts, opacity, and (on video) fade/pop/slide animations timed to the clip
- **Stickers** — draggable emoji overlays
- **Layers** — overlay another photo or video (picture-in-picture)
- **Draw** — freehand brush with color and size
- **Clip** *(video)* — trim via timeline handles, speed, volume, fade in/out
- **Audio** *(video)* — record a synced voice-over, plus a voice changer (Chipmunk, Deep, Monster, Robot, Radio, Echo) for the voice-over and/or the original clip audio
- **Canvas** — crop ratios, rotate, flip, zoom, reposition
- **Projects** — save your work to the browser's local storage and resume it later from the home screen

## Usage

Just open `index.html` in a browser — no installation needed.

### Hosting on GitHub Pages

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages** and set the source to the branch containing `index.html` (root folder).
3. GitHub will publish it at `https://<username>.github.io/<repo>/`.

## Browser support

- Editing and filters work in any modern browser.
- **Exporting video** and the **voice changer / voice-over** need `MediaRecorder` and Web Audio support — Chrome, Edge, and Firefox work well; Safari support is inconsistent.
- The app loads one web font from `fonts.googleapis.com`.

## How projects are saved

"Save project" stores your edit settings in the browser's `localStorage` — nothing is uploaded anywhere:

- **Photo projects** save fully (a compressed copy of the image is stored), so they reopen instantly.
- **Video projects** save your edits (trims, text, filters, etc.) but not the video file itself — browsers can't persist large video files locally, so resuming a video project will ask you to re-select the same original file.

Clearing your browser's site data for this page will delete saved projects.

## Limitations

- No multi-clip timeline — one media file (plus overlay layers) per project.
- No transitions between clips.
- Background removal isn't included.

## License

Add a license of your choice (e.g. MIT) before publishing publicly.
