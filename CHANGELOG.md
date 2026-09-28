# Changelog

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
