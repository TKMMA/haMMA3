# CLAUDE.md — Project guide for haMMA3

This file is read at the start of every Claude Code session. It's the durable
"how this project works" reference. For "where we left off and what's next,"
see [HANDOFF.md](HANDOFF.md).

---

## What this is

**haMMA** — a public, mobile-first Leaflet map of Hawaiʻi's ~92 managed marine
and freshwater areas and the fishing rules that apply in each. Built by Tyler
Kueffner (TK, tk85@hawaii.edu) for the Hawaiʻi Division of Aquatic Resources
(DAR) and for Hawaiʻi's fishers. Tap the map → see the rules for every area at
that spot, including a combined summary when areas overlap.

TK is **not a coder** — explain changes in plain English, and verify things
actually work in the browser rather than assuming.

---

## Workflow — how changes get made

**Claude edits files and commits to a feature branch. TK reviews and merges in
GitHub Desktop.**

1. Claude works on a `feature/<name>` branch — **never commits directly to main**
2. Claude makes the edits and can commit them locally with clear messages
3. TK reviews the changes in **GitHub Desktop**, then commits/merges and pushes
4. `main` only ever gains commits through TK's review in GitHub Desktop

So: main stays protected, TK sees every change before it lands, and version
control stays in TK's hands.

At the **end of a working session**, update [HANDOFF.md](HANDOFF.md) so the next
session can pick up cleanly.

---

## Architecture

No framework, no build step. Plain ES modules served as static files.

- **The page must be served over http(s)** — GitHub Pages works; double-clicking
  `index.html` from disk does **not** (browsers block ES modules on `file://`).
- Local preview: `python -m http.server 8734` in the project folder, then open
  `http://localhost:8734`.

### Module map (`js/`)

| File | Responsibility |
| --- | --- |
| `main.js` | Entry point — wires all event listeners, boots the app |
| `config.js` | Constants + data schema — **edit here when ArcGIS fields change** |
| `state.js` | Shared app state (selection, timers, share payload) |
| `dom.js` | Element lookups (must match ids in `index.html`) |
| `utils.js` | Pure helpers — escaping, URL validation, Hawaiian-text search |
| `map-core.js` | Leaflet map + basemap tile layers |
| `panel.js` | Panel state machine + mobile bottom-sheet drag |
| `geometry.js` | Point-in-polygon, overlap counting, panel-aware map fitting |
| `layer-styles.js` | Polygon hover / selection / flash highlighting |
| `selection.js` | Clearing selections, marking the active list item |
| `render.js` | All HTML builders — cards, tabs, rules, combined summary |
| `info-panel.js` | Opening the info panel for areas, overlaps, About |
| `share.js` | Share links + restoring a shared link on load |
| `sidebar.js` | Island list, search filtering, zoom-to-area |
| `data.js` | Loads the ArcGIS service and builds the map layers |

### Data source

A hosted **ArcGIS Online feature service** (`TKMMAFEATURECLASS2`) supplies area
geometries and a ~16-field rules schema per area. Treat every text field from
it as **untrusted** — always escape before rendering (see Conventions).

---

## Conventions & gotchas

- **Never commit to `main`.** Feature branches only; TK merges.
- **No build step.** Don't introduce bundlers, npm dependencies, or a compile
  stage without asking — TK maintains this by editing files directly.
- **Escape everything from the data layer.** Text → `escapeHtml()`, URLs →
  `getSafeUrl()`, before it reaches any `innerHTML`/`href`/`src`. This is the
  app's main XSS defense.
- **Content-Security-Policy** lives in `index.html`. Any **new external host**
  (tile server, font host, CDN, image domain) must be added to the CSP or the
  browser will silently block it.
- **Self-host assets.** Logos live in `assets/img/` — don't hot-link third-party
  servers (they disappear).
- **Hawaiian diacritics.** Rule/area text uses ʻokina and kahakō. Search is
  diacritic-insensitive via `normalizeHawaiianText()` in `utils.js` — its regexes
  contain literal Unicode characters, so edit them carefully (there's a comment
  explaining the deliberate curly-quote handling).
- **Bump `version.json`** (`appLastUpdated`, format `YYYY-MM-DD`) on any
  meaningful change — the About pane shows it. The `v.X` string in the README
  title is TK's own scheme; don't guess-bump it.
- **Verify in the browser.** Before calling something done, run the preview and
  click through the affected feature.

---

## Deploying

The site is served via GitHub (Pages). Once TK merges to `main` and pushes,
the live site updates. No build or deploy step beyond the push.
