# Claude Code Setup for haMMA3

## Workflow

**Claude edits files directly in this folder.** TK reviews diffs in GitHub Desktop, commits, and pushes. Claude never needs to push.

1. **Claude's role:**
   - Edit files to fix bugs, add features, refactor
   - Run `git add` and `git commit` locally (with a sensible message)
   - **Never run `git push`** — TK owns that step
   - If a push ever happens by mistake, it's caught by the hook below

2. **TK's role:**
   - Open GitHub Desktop and pull the latest from `origin/main`
   - Review Claude's commits and diffs
   - Push to GitHub when satisfied

3. **Why this works:**
   - Claude's edits stay local until TK reviews them
   - TK keeps full control of what lands in the repo
   - No merge conflicts or accidental force-pushes
   - Clear audit trail: every commit message shows who did what

## Setup

A `.claude/settings.json` hook blocks `git push` — if Claude ever accidentally tries to push, the hook catches it and shows an error.

## For local testing

Run a static server to preview changes:

```bash
python -m http.server 8734
```

Then open `http://localhost:8734` in a browser. Changes to files auto-reload (or refresh the page).

## Key files

- `js/main.js` — entry point; loads all other modules as ES imports
- `js/config.js` — constants, data schema, rules categories
- `js/state.js` — shared app state
- `README.md` — includes a module map
- `.gitignore` — excludes `.claude/` local settings
