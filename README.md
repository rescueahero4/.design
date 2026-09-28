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
- adds four skills to `.claude/skills/` (iterate, critique, spec, viewer) and three critique
  agents to `.claude/agents/` so Claude Code and Cowork know the workflow
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
    findings.json        ← critique findings (f-0001 …), resolved against DDRs
    specs/               ← PRD.md, SOLUTION-ARCHITECTURE.md (derived, regenerable)
    viewer/index.html    ← run `dm viewer`, then open it (regenerated)
    model.json           ← run `dm extract` (regenerated)
  .claude/skills/design-{iterate,critique,spec,viewer}/SKILL.md
  .claude/agents/{edge-case-hunter,unhappy-path-walker,feasibility-reviewer}.md
  CLAUDE.md              ← marked block appended
```

## CLI

```
npx dot-design status
npx dot-design iterate --change "Moved CTA above summary" --rationale "…"
npx dot-design log
npx dot-design back | forward | goto v3 | revert v3 | fork v2 --as variant-b
npx dot-design ddr list --pending
npx dot-design viewer                        # then open .design/viewer/index.html
npx dot-design extract                       # DOM + mock-data → model.json + mechanical checks
npx dot-design findings list --open
npx dot-design spec prd | arch               # skeletons; Claude fills the narrative
```

## Workflow

1. **Iterate** — ask Claude for a mockup change. It edits `.design/mockups/`, commits an
   iteration, records a DDR, asks at most one "why" question.
2. **Critique** — "poke holes in this". `dm extract` builds a model of the DOM; three agent
   lenses (edge cases, unhappy paths, feasibility) add findings. Nothing is changed.
3. **Act** — "fix f-0004" → a normal iteration, triggered by the agent, resolving the finding.
4. **Spec** — "give me the PRD" / "solution architecture". Generated from mockups + DDRs +
   findings; every requirement tagged *decided* or *inferred* with its DDR id.
5. **Review** — `dm viewer`: iteration tree, side-by-side compare, decisions, findings.

(`npx dm …` also works.) Normally you don't type these — Claude does, following the skill.

## Status

- ✅ install + shadow git + iterate loop with DDR capture
- ✅ local HTML viewer
- ✅ DOM extraction + mechanical checks
- ✅ critique skill + three agents
- ✅ PRD / solution-architecture generators

Ideas: screenshot diffing per iteration; export viewer as shareable zip; Figma import as a
`new-exploration`; DDR summariser ("what does this designer care about").
