# Claude Code Setup for haMMA3

## Workflow

**Claude edits files, commits locally, and opens pull requests.** TK reviews PRs on GitHub and merges them.

1. **Claude's role:**
   - Edit files to fix bugs, add features, refactor
   - Run `git add` and `git commit` locally (with a sensible message)
   - Push to a feature branch and create a PR with `gh pr create`
   - Write a clear PR title and body explaining the change

2. **TK's role:**
   - Review the PR on GitHub (see diffs, read the explanation)
   - Merge when satisfied, or request changes
   - That's it — merging auto-closes the PR

3. **Why this works:**
   - Every change goes through a PR (clear review trail on GitHub)
   - TK has full control: can request changes, comment inline, or merge
   - Easy to see what changed and why (all in the PR description)
   - Good practice even for solo projects (audit trail matters)

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
