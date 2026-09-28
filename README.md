# .design (dot-design)

`.design` is a tool designers install into a project folder. Published on npm as `dot-design` (npm names cannot start with a dot). Mockups are plain HTML/CSS/JS;
every AI or manual change becomes a versioned iteration with a Design Decision Record (DDR),
so rationale, rejected alternatives and old versions are never lost.

Everything lives in one folder, `.design/`, so it never collides with your project.

## Install

```
cd my-project
npx dot-design init
```

That's it. It:

- creates `.design/` (scripts, docs, mockups folder, shadow git repo, decisions store)
- adds `.claude/skills/design-iterate/SKILL.md` so Claude Code and Cowork know the loop
- appends a marked block to `CLAUDE.md` (created if missing) and `AGENTS.md` (only if it exists)
- adds `.design/.git/`, `.design/snapshots/`, `.design/state.json` to `.gitignore` if you have one

Safe to re-run. `npx dot-design update` refreshes tool files after a new release;
`npx dot-design uninstall` removes tool files but keeps your history and decisions.

Requires `node` ≥ 18 and `git`. No runtime dependencies.

## Layout after install

```
my-project/
  .design/
    mockups/             ← your HTML/CSS/JS. Single source of truth. Versioned by dm.
    decisions/           ← ddr-0001.json … one per iteration
    context/tech-constraints.md   ← fill in with engineering
    docs/                ← DDR schema, mockup conventions
    bin/dm.js            ← the CLI
    config.json  state.json  snapshots/  .git/ (shadow repo)
  .claude/skills/design-iterate/SKILL.md
  CLAUDE.md              ← marked block appended
```

## CLI

```
npx dot-design status
npx dot-design iterate --change "Moved CTA above summary" --rationale "…"
npx dot-design log
npx dot-design back | forward | goto v3 | revert v3 | fork v2 --as variant-b
npx dot-design ddr list --pending
npx dot-design snapshot
```

(`npx dm …` also works.) Normally you don't type these — Claude does, following the skill.

## Roadmap

1. ✅ install + shadow git + iterate loop with DDR capture
2. local HTML viewer (iteration tree, side-by-side compare, DDR browser)
3. DOM extraction (pages, components, states, flows, mock-data model)
4. critique agents: edge-case hunter, unhappy-path walker, feasibility reviewer
5. generators: PRD, solution architecture
