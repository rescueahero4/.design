# design-recall

`design-recall` is a tool designers install into a project folder. Published on npm as `design-recall` (npm names cannot start with a dot). Mockups are plain HTML/CSS/JS;
every AI or manual change becomes a versioned iteration with a Design Decision Record (DDR),
so rationale, rejected alternatives and old versions are never lost.

Everything lives in one folder, `.design-recall/`, so it never collides with your project.

## Install

```
cd my-project
npx design-recall init
```

That's it. It:

- creates `.design-recall/` (scripts, docs, mockups folder, shadow git repo, decisions store)
- adds four skills to `.claude/skills/` (iterate, critique, spec, viewer) and three critique
  agents to `.claude/agents/` so Claude Code and Cowork know the workflow
- appends a marked block to `CLAUDE.md` (created if missing) and `AGENTS.md` (only if it exists)
- adds `.design-recall/.git/`, `.design-recall/snapshots/`, `.design-recall/state.json` to `.gitignore` if you have one

Safe to re-run. `npx design-recall update` refreshes tool files after a new release;
`npx design-recall uninstall` removes tool files but keeps your history and decisions.

Requires `node` ≥ 18 and `git`. No runtime dependencies.

## Layout after install

```
my-project/
  .design-recall/
    mockups/             ← your HTML/CSS/JS. Single source of truth. Versioned by dm.
    decisions/           ← ddr-0001.json … one per iteration
    context/tech-constraints.md   ← fill in with engineering
    context/design-principles.md  ← your distilled principles (Claude writes, you edit)
    docs/                ← DDR schema, mockup conventions
    bin/dm.js            ← the CLI
    config.json  state.json  snapshots/  .git/ (shadow repo)
    findings.json        ← critique findings (f-0001 …), resolved against DDRs
    specs/               ← PRD.md, SOLUTION-ARCHITECTURE.md (derived, regenerable)
    viewer/index.html    ← run `dm viewer` once; kept current after every iteration
    model.json           ← run `dm extract` (regenerated)
  .claude/skills/design-{iterate,critique,spec,viewer,principles}/SKILL.md
  .claude/agents/{edge-case-hunter,unhappy-path-walker,feasibility-reviewer}.md
  CLAUDE.md              ← marked block appended
```

## CLI

```
npx design-recall status
npx design-recall iterate --change "Moved CTA above summary" --rationale "…"
npx design-recall log
npx design-recall back | forward | goto v3 | revert v3 | fork v2 --as variant-b
npx design-recall ddr list --pending
npx design-recall viewer [--watch]              # build once; auto-rebuilt after each iteration (--watch: also on manual edits)
npx design-recall extract                       # DOM + mock-data → model.json + mechanical checks
npx design-recall findings list --open
npx design-recall spec prd | arch               # skeletons; Claude fills the narrative
npx design-recall principles                    # evidence digest → Claude writes design-principles.md
npx design-recall principles --check            # drift: rejected-then-reintroduced, unclassified evidence
```

## Workflow

1. **Iterate** — ask Claude for a mockup change. It edits `.design-recall/mockups/`, commits an
   iteration, records a DDR, asks at most one "why" question.
2. **Critique** — "poke holes in this". `dm extract` builds a model of the DOM; three agent
   lenses (edge cases, unhappy paths, feasibility) add findings. Nothing is changed.
3. **Act** — "fix f-0004" → a normal iteration, triggered by the agent, resolving the finding.
4. **Spec** — "give me the PRD" / "solution architecture". Generated from mockups + DDRs +
   findings; every requirement tagged *decided* or *inferred* with its DDR id.
5. **Review** — `dm viewer`: iteration list, side-by-side compare, decisions, findings, principles.
   Built once, refreshed automatically; ↻ (or R) reloads the page — no background polling.
6. **Distil** — after ~10 confirmed decisions, "what have you learned about how I design?" →
   `.design-recall/context/design-principles.md`: your principles, each backed by DDR ids, loaded in
   every session via CLAUDE.md. Skills check new requests against it and ask when you
   contradict yourself. `dm principles --check` finds drift mechanically.

(`npx dm …` also works.) Normally you don't type these — Claude does, following the skill.

## Status

- ✅ install + shadow git + iterate loop with DDR capture
- ✅ local HTML viewer
- ✅ DOM extraction + mechanical checks
- ✅ critique skill + three agents
- ✅ PRD / solution-architecture generators
- ✅ principles distillation + drift check (tacit-knowledge layer)

Ideas: cross-project principles (a portable `~/.design-recall/` profile); screenshot diffing per
iteration; export viewer as shareable zip; Figma import as a `new-exploration`.
