---
name: design-spec
description: Generate or refresh the PRD and the Solution Architecture document from the mockups, DDRs and critique findings in .design/. Use when the user asks for a "PRD", "spec", "requirements doc", "solution architecture", "tech spec", "hand-off doc", "what should I give engineering", or "document the design". The mockups are the source of truth; the documents are derived, traceable, and regenerable.
---

# design-spec

Two documents, both regenerated from the same sources, both citing DDR ids so every requirement
traces to an iteration and a diff:

- `.design/specs/PRD.md` — user-facing: journeys, per-screen requirements, decision log, open questions.
- `.design/specs/SOLUTION-ARCHITECTURE.md` — eng-facing: routes, nav graph, component inventory, implied data model + API surface, constraints, feasibility flags.

## Procedure

1. `node .design/bin/dm.js status`. If there are DDRs pending confirmation
   (`pending_confirmation` non-empty), tell the user in one line: those will appear as
   *inferred*, not *decided*. Offer to confirm them first (each is one question). Don't block.
2. If no critique has been run on this iteration (`dm findings list --open` empty and the user
   hasn't declined), say so in one line and offer `design-critique` first. Don't block.
3. `node .design/bin/dm.js spec prd` and/or `spec arch` — writes skeletons with every mechanical
   fact filled in and `<!-- claude: … -->` markers where narrative is needed.
4. Open the skeleton and replace each marker with prose. Rules:
   - **Only from evidence**: DDR `rationale` / `source_prompt`, findings, the mockup itself,
     `tech-constraints.md`, and `design-principles.md` (cite principles as `P2` where a
     requirement follows from one — engineers get the reasoning, not just the rule). If the evidence isn't there, write "Not yet decided — see open
     questions" rather than a plausible sentence.
   - Keep the `[decided · ddr-0007]` / `[inferred · ddr-0009]` tags exactly; engineers rely on
     them.
   - Acceptance criteria: one per field constraint, one per state present in the mockup, one
     per resolved finding. Given/When/Then is fine but not required.
   - Solution architecture: map components to the design system named in
     `tech-constraints.md`; if it's empty, say the mapping is pending engineering input.
     Propose endpoints as *implied by the UI*, never as decisions.
   - Leave the "Mechanical checks" and "Open questions" sections generated as-is; they're the
     audit trail.
5. Remove the markers you've filled. Leave any you couldn't fill, with a one-line reason.
6. Tell the user the file path(s) and the three most consequential open questions. If they
   want a Word/PDF/Notion version, convert from the markdown — the `.md` in `.design/specs/`
   stays the source.

## Regenerating

Re-running `spec prd|arch` overwrites the skeleton, losing your prose. Before regenerating,
read the current file, then regenerate, then re-apply prose where the underlying facts
haven't changed. Say which sections changed because the mockups changed.

## Don't

- Don't generate a spec for a mockup with `high` open findings without saying so at the top
  of the document.
- Don't paraphrase DDR rationales into something stronger than the designer said.
- Don't write a spec with zero DDRs — ask the designer to record the first iteration's intent.
