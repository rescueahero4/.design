---
name: design-viewer
description: Build and open the local design-memory viewer — a single static HTML page showing the iteration tree, side-by-side version compare, DDRs and critique findings for the mockups in .design-recall/. Use when the user asks to "see the history", "open the viewer", "compare versions visually", "show me the iterations", "review the decisions", or wants to share the design history with someone. Also rebuild it after a batch of iterations when the user is reviewing.
---

# design-viewer

```
node .design-recall/bin/dm.js viewer
```

Writes `.design-recall/viewer/index.html` (data inlined; extracts every version to `.design-recall/snapshots/`).
Then tell the user to open it — on macOS `open .design-recall/viewer/index.html`, or double-click.
No server, no dependencies.

**You only need to build it once.** After that `dm` rebuilds it automatically after every
`iterate`, `revert`, `fork`, `ddr confirm/edit` and findings change. Do not re-run `dm viewer`
after each iteration. The page never polls: served over http it checks for a newer build only when the
tab regains focus and then highlights the ↻ button; ↻ (or the R key) reloads. Live Server-style
tools push the reload themselves anyway. For manual mockup edits outside `dm`, `dm viewer --watch` rebuilds on file change.

What they'll see: exploration picker · flat iteration list (newest at the bottom; a fork shows
"↳ from vNN" instead of an indent; each card clamps to two lines — the ▸ chevron or "expand all"
reveals rationale, rejected options, tags and id) · page tabs · iframe
preview · **Compare** button (pick a second version → two iframes side by side) · right panel
with the DDR (change, rationale, rejected, tags, designer's original words) and any critique
findings for that version · "pending only" filter for DDRs still `inferred` · click a tag to
filter the tree by that concern.

If a page tab is missing, the version has no `.html` files; if iframes are blank, the browser is
blocking `file://` iframes — run `python3 -m http.server -d .design-recall 8000` and open
`http://localhost:8000/viewer/`.

Sharing: the viewer needs `.design-recall/snapshots/` next to it. Zip `.design-recall/viewer` +
`.design-recall/snapshots` together.
