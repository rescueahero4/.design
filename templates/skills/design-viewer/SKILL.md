---
name: design-viewer
description: Build and open the local design-memory viewer — a single static HTML page showing the iteration tree, side-by-side version compare, DDRs and critique findings for the mockups in .design/. Use when the user asks to "see the history", "open the viewer", "compare versions visually", "show me the iterations", "review the decisions", or wants to share the design history with someone. Also rebuild it after a batch of iterations when the user is reviewing.
---

# design-viewer

```
node .design/bin/dm.js viewer
```

Writes `.design/viewer/index.html` (data inlined; extracts every version to `.design/snapshots/`).
Then tell the user to open it — on macOS `open .design/viewer/index.html`, or double-click.
No server, no dependencies. Rebuild after new iterations; it is a snapshot, not live.

What they'll see: exploration picker · iteration tree (branches indented) · page tabs · iframe
preview · **Compare** button (pick a second version → two iframes side by side) · right panel
with the DDR (change, rationale, rejected, tags, designer's original words) and any critique
findings for that version · "pending only" filter for DDRs still `inferred` · click a tag to
filter the tree by that concern.

If a page tab is missing, the version has no `.html` files; if iframes are blank, the browser is
blocking `file://` iframes — run `python3 -m http.server -d .design 8000` and open
`http://localhost:8000/viewer/`.

Sharing: the viewer needs `.design/snapshots/` next to it. Zip `.design/viewer` +
`.design/snapshots` together.
