# Changelog

## 0.4.1 — README for designers
- README rewritten for designers and non-technical readers: one-minute setup in three steps, "just talk to Claude" examples, a viewer guide with screenshots, and reference sections (glossary, commands, file locations, troubleshooting, notes for AI agents)
- no code changes

## 0.4.0 — viewer served over http
- **The viewer now needs http**: open it with `npx design-recall viewer --serve` (or any static server over the project root → `/.design-recall/viewer/`). Opening `index.html` as a file shows a message explaining this
- `dm viewer --serve [--port <n>]`: built-in static server for `.design-recall/`, local only (127.0.0.1), never serves the shadow `.git`; combines with `--watch`
- snapshots: no per-version folders or hard links any more — each distinct file is stored once in `snapshots/blobs/` and `snapshots/manifest.json` maps every version to its files; a service worker (`viewer/sw.js`) serves `viewer/snap/<expl>/vNN/<path>` from them with the right content type
- existing 0.3.x snapshots are discarded and rebuilt automatically on the next viewer build
- sharing: zip `viewer/` + `snapshots/` together and serve the folder over http (see the design-viewer skill)

## 0.3.3 — snapshot updatess
- snapshots: identical files across versions stored once (`snapshots/.blobs/`) and hard-linked into each version (copy fallback); sample project 17 MB → 2 MB
- snapshots: incremental — only new or changed versions are extracted; removed versions and unused blobs are cleaned up (a viewer rebuild with nothing new takes ~0.1 s)
- snapshots read blobs straight from the shadow git (no `tar` dependency)

## 0.3.2 — viewer redesign
- viewer redesign: dark, high-contrast, square corners, one accessible blue; Inter + JetBrains Mono; shaded sections; hidden scrollbars
- viewer: iterations as a VS Code-style commit graph, newest first, one line each; expanding shows timestamp, rationale, rejected options, tags, id; filters dim rows instead of hiding them
- viewer: show/hide buttons for both side panels (`[` / `]`), drag the edges to resize (double-click resets, drag below 100px hides); layout remembered per browser
- `update` and `init` rebuild an existing viewer so upgrades show up immediately
- installs `.design-recall/README.md`: running the viewer, dm command reference, how principles get into the viewer
- `principles --mark` rebuilds the viewer so newly written principles appear right away
- fix: viewer build failed on Windows when Git's GNU tar was first on PATH (`tar -C C:\...`)

## 0.3.1 — viewer
- viewer: flat iteration list (no per-depth indent); forks show "↳ from vNN"
- viewer: cards clamp to two lines; ▸ expands to rationale, rejected options, tags, id; expand/collapse all
- viewer: serif chrome with sans labels and mono ids, so the tool never reads as part of the mockup
- viewer rebuilt automatically after iterate / revert / fork / ddr confirm / findings once it exists
- `dm viewer --watch` rebuilds on any change to decisions, context, findings or mockups
- viewer: ↻ button / R key to reload; over http it checks for a newer build only when the tab regains focus (no polling); remembers selected exploration/version per tab

## 0.3.0 — tacit-knowledge layer
- **Renamed package to `design-recall`** (`dot-design` on npm belongs to someone else). Bin `dm` unchanged; old CLAUDE.md markers still recognised by `update`/`uninstall`
- **Project folder is now `.design-recall/`** (was `.design/`). `update`, `init` and any `dm` command migrate an existing `.design/` in place
- `dm principles` evidence digest, `--check` drift detection, `--mark` run tracking
- `design-principles` skill: distil confirmed DDRs into `.design-recall/context/design-principles.md`
- `docs/principles-schema.md`
- design-iterate reads principles and asks when a request contradicts one
- design-critique / agents / design-spec cite principles
- CLAUDE.md block tells Claude to read principles at session start
- viewer: principles panel; click to filter the tree to a principle's evidence
- `dm status` reports confirmed DDRs since last principles run

## 0.2.0
- viewer, DOM extraction + mechanical checks, critique skill + three agents, PRD / solution-architecture generators

## 0.1.0
- installer, shadow git, iterate loop with DDR capture
