# HANDOFF.md — Where things stand

A living "current state and next steps" note. Update this at the **end of each
working session** so the next one (a future Claude session, or TK coming back
after a break) can pick up without re-deriving everything. For the durable "how
this project works" reference, see [CLAUDE.md](CLAUDE.md).

**How to use this file:** keep it short and current. When something in "Next up"
gets done, move it to "Recently done" (or delete it). Don't let it grow into a
changelog — git history is the changelog; this is the *state of play*.

---

## Last updated
2026-07-02

## Current status
✅ **Stable.** The map works and is deployed. The codebase was just modularized
and hardened, and the git history has a clean baseline to fall back on.

## Recently done
- Split the old single-file `script.js` (~1,600 lines) into 15 ES modules under
  `js/` (see the module map in [CLAUDE.md](CLAUDE.md)).
- Hardening: added a Content-Security-Policy, self-hosted the DAR + State logos,
  fixed a boot crash on malformed share-link hashes, added network timeouts, and
  tightened URL escaping.
- An adversarial multi-agent review confirmed one behavior change: search now
  treats curly quotes as ʻokina-equivalents, so "milolii" finds the Miloliʻi
  areas (it found nothing before). Kept as a deliberate improvement, documented
  in `js/utils.js`.
- Set up the PR / GitHub-Desktop review workflow and these handoff docs.

## Next up — the big one
🔜 **Database overhaul.** Replace the current Esri attribute table with a proper
relational-table backend (better structure, more capable, more clickable). This
is the reason haMMA3 exists as a fresh repo. When starting this:
- The data-fetching code all lives in `js/data.js`; the field schema is in
  `js/config.js` — those two files are where the new DB shape will land.
- Expect to revisit `render.js` if the rules schema changes shape.
- Keep the untrusted-data escaping discipline (see CLAUDE.md Conventions).

## Ideas / backlog (optional, not scheduled)
- Favicon + "Add to Home Screen" (PWA) so fishers can pin haMMA like an app;
  natural follow-on: offline caching of rules for no-signal spots on the water.
- Self-host the Inter font (last remaining third-party dependency).
- Decide on a LICENSE (currently "all rights reserved").

## Known gotchas for whoever picks this up
- The app needs an http server to run locally (`python -m http.server 8734`) —
  `file://` won't load the ES modules.
- Any new external host must be added to the CSP in `index.html`.
- Don't commit to `main` — feature branches only; TK merges in GitHub Desktop.
