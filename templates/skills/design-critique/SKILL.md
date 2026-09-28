---
name: design-critique
description: Run a structured critique of the current HTML mockups in .design/ — edge cases, unhappy paths, and technical feasibility — and record findings against the current iteration. Use when the user asks to "critique", "review", "stress test", "find edge cases", "what am I missing", "poke holes", "is this feasible", "what would engineering say", "unhappy paths", or before generating a PRD. Also offer it (one line, don't run unprompted) after a new-exploration or a large iteration.
---

# design-critique

Three lenses, each a separate agent persona with its own checklist. The mechanical part is
already done by `dm extract`; the agents add judgement on top. Findings are recorded, never
applied — the designer decides what to change.

## Procedure

1. `node .design/bin/dm.js status` — note exploration + iteration. Findings attach to it.
2. `node .design/bin/dm.js extract` — writes `.design/model.json`: pages, flows, components,
   states, forms, nav graph, implied data model, and `checks` (mechanical findings). Read it.
   Read `.design/context/tech-constraints.md` if it has content, and
   `.design/context/design-principles.md` if it exists — findings should be framed in the
   designer's own principles where one applies ("conflicts with P2", not "modals add friction").
3. Ask which lenses, unless the user said. Default: all three. In Claude Code, dispatch the
   subagents in `.claude/agents/` in parallel (`edge-case-hunter`, `unhappy-path-walker`,
   `feasibility-reviewer`), giving each the model.json path, the mockup files, and the
   constraints file. In Cowork or without subagents, run each checklist yourself, one lens at
   a time, in the same order. The checklists are in `.design/docs/critique-checklists.md`.
4. Each lens returns a json array of findings (schema: `.design/docs/findings-schema.md`).
   Merge, de-duplicate against `model.checks` (don't re-report what extract already found —
   reference it instead), drop anything speculative that the mockup gives no evidence for,
   cap at ~12 findings per lens, ordered by severity.
5. Write the array to a temp file and run
   `node .design/bin/dm.js findings add --file /tmp/findings.json`.
6. Report to the user: 3–6 line summary — count by severity, the top 3 things to look at, and
   the exact command to see all (`dm findings list --open`). Do **not** paste the whole list.
   Do not change any mockup.

## When the designer acts on a finding

They'll say "fix f-0004" or "handle the empty cart case". That is a normal design-iterate
loop with two extras: the DDR gets `--trigger <agent-name>` and rationale referencing the
finding, and after the iteration run
`node .design/bin/dm.js findings resolve f-0004 --ddr <new-ddr-id>`. That's how a critique
becomes a traceable decision.

## Severity

- `high` — a user can get stuck, lose data, or the feature can't be built as drawn.
- `medium` — a real gap the PRD must answer (missing state, undefined rule, unclear ownership).
- `low` — polish, a11y baseline, or a question engineering will ask anyway.

## Guardrails

- Evidence only. Every finding names a page and, where possible, a component and state. "Users
  might want dark mode" is not a finding.
- Don't invent business rules; ask them as questions in `suggestion`.
- Don't rewrite the design in `suggestion` — one sentence pointing at an option is enough.
- Respect the DDRs: if `dm ddr list` shows the designer already rejected sticky CTAs, don't
  suggest sticky CTAs. Read decisions before critiquing.
