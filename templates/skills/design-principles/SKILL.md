---
name: design-principles
description: Distil the designer's confirmed Design Decision Records into an explicit, evidence-linked set of design principles at .design-recall/context/design-principles.md — the tacit-knowledge layer that every other skill reads. Use when the user asks "what have you learned about how I design", "summarise my decisions", "what are my design principles", "update the principles", "am I being consistent", or when dm status shows 10+ confirmed DDRs since the last run (offer it once, one line). Also use to check drift: "did I contradict myself".
---

# design-principles

Claude has no memory between sessions. This file is how the designer's tacit knowledge
survives: a short, readable list of principles, each backed by the DDRs that prove it, loaded
in every session through CLAUDE.md. It is the designer's — they can edit it, and edits win.

## Write / update

1. `node .design-recall/bin/dm.js principles` → an evidence digest: concerns by frequency, everything
   the designer rejected and why, every confirmed decision with rationale and their own words,
   and the existing principles (if any). Only **confirmed** DDRs count; inferred ones are
   guesses and must not shape principles. If there are fewer than 5 confirmed DDRs, say so
   and stop — offer `dm ddr list --pending` to confirm some first.
2. Read `.design-recall/docs/principles-schema.md` for the exact format.
3. Distil. Rules:
   - A principle needs **≥2 supporting DDRs**, or 1 DDR plus an explicit rejection. One
     decision is an event, not a principle.
   - Write it as the designer would say it, in their vocabulary (use their `tacit_tags` and
     `source_prompt` phrasing). Not textbook heuristics. "Nielsen #4" is not a principle of
     theirs.
   - Prefer specific over general: "Single-field inputs stay inline; modals only for
     multi-step" beats "Reduce friction".
   - Mark `Kind: personal` when it shows up across pages/explorations and reads like taste;
     `Kind: project` when it's driven by a stated constraint (stack, brand, platform).
   - Exceptions are first-class. A DDR that goes against a principle *with a rationale* is an
     `Exceptions:` entry, not a reason to weaken the principle.
   - If the existing file has a principle, **update it**: add evidence, add exceptions, sharpen
     the wording. Retire (append `[retired]` to the heading, keep it) only when later
     decisions clearly reverse it. Never renumber; new ones get the next `P` number.
   - Keep the designer's hand edits. If a hand-edited statement now conflicts with evidence,
     leave the statement and add a line `- Note: evidence since <date> leans the other way (ddr-…)`.
   - 5–15 principles. If you have 30, you're listing decisions, not principles.
4. Write the file. Then `node .design-recall/bin/dm.js principles --mark`.
5. Show the designer the principles that are **new or changed** only, one line each, and ask
   the single most useful question: which one they'd word differently.

## Check drift

`node .design-recall/bin/dm.js principles --check` finds, mechanically:
- `rejected-reintroduced` — a later decision resembles an option an earlier DDR rejected, and doesn't cite it.
- `unclassified-evidence` — a confirmed DDR carries a principle's tag but isn't listed as evidence or exception.
- `dangling-evidence` — a principle cites a DDR that's gone or reverted.

Present these as questions, not verdicts: "ddr-0021 adds a sticky bar; ddr-0004 rejected one
because of the iOS toolbar. Did the constraint change, or is this an exception?" Their answer
becomes either `dm ddr edit ddr-0021 --set rationale="…(supersedes ddr-0004)"` or an
`Exceptions:` line. Then re-run the write step for that principle.

## Don't

- Don't write principles from inferred DDRs, findings, or from what "good design" says.
- Don't delete principles or evidence. Retire, annotate, cite.
- Don't paraphrase a rationale into something stronger than the designer said.
- Don't run this silently; the designer must see what changed.
