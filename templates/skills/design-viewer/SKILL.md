---
name: design-viewer
description: Build and open the local design-memory viewer — a single static HTML page showing the iteration tree, side-by-side version compare, DDRs and critique findings for the mockups in .design-recall/. Use when the user asks to "see the history", "open the viewer", "compare versions visually", "show me the iterations", "review the decisions", or wants to share the design history with someone. Also rebuild it after a batch of iterations when the user is reviewing.
---

# design-viewer

```
node .design-recall/bin/dm.js viewer --serve
```

Builds `.design-recall/viewer/` (data inlined; stores every version in `.design-recall/snapshots/`) and
serves it on `http://localhost:4178/viewer/` (next free port if taken; `--port <n>` to choose). Tell the
user to open that URL. It keeps running until Ctrl+C, so start it in the background. No dependencies.

The viewer only works over http: version files reach the page through a service worker, and browsers
don't run those for `file://`. Opening `index.html` by double-click shows a message saying so. Any
static server over the project root also works (VS Code Live Server → `/.design-recall/viewer/`).
To only rebuild without serving: `dm viewer`.

**You only need to build it once.** After that `dm` rebuilds it automatically after every
`iterate`, `revert`, `fork`, `ddr confirm/edit` and findings change. Do not re-run `dm viewer`
after each iteration. The page never polls: served over http it checks for a newer build only when the
tab regains focus and then highlights the ↻ button; ↻ (or the R key) reloads. Live Server-style
tools push the reload themselves anyway. For manual mockup edits outside `dm`, `dm viewer --serve --watch` rebuilds on file change.

What they'll see: exploration picker · flat iteration list (newest at the bottom; a fork shows
"↳ from vNN" instead of an indent; each card clamps to two lines — the ▸ chevron or "expand all"
reveals rationale, rejected options, tags and id) · page tabs · iframe
preview · **Compare** button (pick a second version → two iframes side by side) · right panel
with the DDR (change, rationale, rejected, tags, designer's original words) and any critique
findings for that version · "pending only" filter for DDRs still `inferred` · click a tag to
filter the tree by that concern.

If a page tab is missing, the version has no `.html` files. If the preview area says to open the
viewer over http, it was opened as a file: use `dm viewer --serve`. Service workers also need a
secure context, so use `localhost`, not a LAN IP address.

Sharing: send the whole `.design-recall/viewer` and `.design-recall/snapshots` folders together
(zip them; they must stay siblings). The recipient serves the folder that contains them over http,
e.g. `python3 -m http.server 8000` from inside it, and opens `http://localhost:8000/viewer/`.

`snapshots/` is generated: `blobs/` holds each distinct file once and `manifest.json` maps versions
to them. Never edit it — edit the mockups and iterate instead.
