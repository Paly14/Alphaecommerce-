# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page static **VSL (Video Sales Letter) landing page** for "Alpha Ecommerce" — a hero video, in-page benefits, YouTube success-story videos, FAQ, and WhatsApp call-to-action buttons. Pure HTML/CSS/JS with **no build step and no dependencies**. All UI text is in Spanish (Argentine).

## Running & deploying

- **Local preview:** open `index.html` directly, or serve the folder: `python3 -m http.server 8000` then visit `http://localhost:8000`.
- **Deploy:** static hosting only. `netlify.toml` publishes `.` with an empty build command. Also documented for GitHub Pages (Settings → Pages → root folder).
- No tests, no linter, no package manager.

## Architecture

The page is **data-driven from a single config object**. `index.html` is an empty shell of elements with `id`s and empty grid containers; nothing is hardcoded as visible content.

- **`assets/js/config.js`** — defines the global `CONFIG` object. This is the ONLY file a non-technical editor should touch (brand, WhatsApp number/message, VSL video link, `casos`/`beneficios`/`faq` arrays, button text). It loads before `app.js`.
- **`assets/js/app.js`** — an IIFE that, on `DOMContentLoaded`, reads `CONFIG` and populates the DOM: sets text into elements by `id`, wires every `[data-wa]` element to a generated `wa.me` link, renders the benefit/case/FAQ lists, and injects the video iframes. It never needs editing for content changes.
- **`assets/css/styles.css`** — all styling; class names match those created in `app.js` (e.g. `card`, `caso`, `faq__item`, `video-placeholder`).

### Key conventions when editing `app.js`

- **The `id`/`data-wa`/class contract is implicit.** `app.js` looks up elements by the exact `id`s in `index.html` (`heroTitle`, `casosGrid`, `beneficiosGrid`, `faqList`, `vslWrap`, etc.) and builds children with the class names `styles.css` expects. Changing any of these three files' names requires updating the other two.
- **YouTube links are format-agnostic.** `youtubeId()` extracts the 11-char ID from `watch?v=`, `youtu.be/`, `embed/`, `shorts/`, `live/`, or a bare ID. Videos render via `youtube-nocookie.com/embed/`. Empty/invalid links fall back to a "Próximamente" placeholder rather than erroring.
- **WhatsApp link** is built in `waLink()`: strips non-digits from `CONFIG.whatsapp.numero` and URL-encodes the message. Numbers must be country code + number, no `+`, no leading `0`, no spaces.
- **All config-derived strings are escaped** via `esc()` before insertion; keep new user-facing content going through `esc()`/`setText()` rather than raw `innerHTML`.
- Helpers: `el(tag, cls, html)` creates elements, `renderList(id, arr, builder)` clears a container and appends one built node per array item.
