# Changelog

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
