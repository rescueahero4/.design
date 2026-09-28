---
name: design-iterate
description: Design-memory loop for HTML/CSS/JS mockups. Use this skill EVERY time the user asks to create, change, tweak, iterate on, explore a variant of, go back to, compare, revert, or fork a mockup, prototype, screen, page, or component in this project — even for tiny changes like "make the button bigger". Also use when the user asks why something was designed a certain way, what alternatives were tried, or asks to "record this decision". It versions every change in a shadow git repo (.design/.git) and captures a Design Decision Record (DDR) so design rationale and tacit knowledge are never lost. If the project has no .design/ folder yet, this skill sets it up.
---

# design-iterate

The mockups in `<mockups_dir>` (see `.design/config.json`, default `.design/mockups/`) are the single
source of truth. Every change you make to them becomes one **iteration**: a commit in the
shadow repo + a **DDR** (Design Decision Record) json in `.design/decisions/`. Old iterations
are never deleted; the designer can move back, forward, revert, or fork at any time.

Your job in this loop: make the design change the user asked for, then capture *why* it
happened as accurately as you can without slowing the designer down.

All mechanics go through one script (zero dependencies, needs `node` + `git`):

```
node .design/bin/dm.js <command>
```

Run `dm.js help` for the full command list. Below: `dm` means that invocation.

## First run

If `.design/config.json` does not exist: run `dm init` (add `--mockups <dir>` if the mockups
live somewhere other than `design/`). Then tell the user, in one line, that design memory is
on and where it lives. If mockup files already existed, immediately record them as the first
iteration:

```
dm iterate --exploration <name> --type new-exploration --change "Imported existing mockups" --rationale "Starting point" --confidence confirmed
```

## Every design request: the loop

1. **Orient** — `dm status`. Note current exploration, cursor, and whether the working copy is
   dirty. If dirty and you didn't cause it, the designer edited by hand: commit it first as its
   own iteration (`--change "Manual edits by designer" --trigger designer --confidence inferred`)
   so your change is not mixed with theirs.

2. **Classify the request** (this decides what to record):
   - `new-exploration` — a new concept/flow, not a change to an existing one. Pick a short
     kebab-case name (`checkout-flow`, `onboarding-v2`). Ask only if the name is unclear.
   - `iteration` — change to the current exploration. The common case.
   - `fix` — typo, broken link, CSS bug. No design intent. Rationale is mechanical.
   - navigation — "go back", "show me v2", "undo that", "compare", "revert to", "fork this" →
     see *Navigation*, do not edit files.
   - question — "why did we…", "what did we try for…" → answer from `dm ddr list` /
     `dm show`; do not edit files.

3. **Make the change** in the mockup files. Follow `.design/docs/conventions.md`
   (`data-component`, `data-state`, `data-flow`, mock data only in `mock-data.js`). Never
   create `index-v2.html` or `index-old.html` copies — versioning is the script's job.

4. **Infer the DDR** before committing. Fill in as much as the evidence supports:
   - `change`: one line, past tense, concrete ("Moved primary CTA above order summary").
   - `scope.page` / `scope.components`: from the `data-component` attributes you touched.
   - `rationale`: **only what the user actually said or clearly implied.** "people keep missing
     it" → rationale is discoverability. "I don't like it" → no rationale; leave null.
   - `rejected`: alternatives the user mentioned and dismissed, or ones you proposed and they
     declined.
   - `tacit_tags`: 1–3 short tags for the underlying design concern (`hierarchy`,
     `mobile-viewport`, `error-recovery`, `cognitive-load`, `brand-voice`…). Reuse tags from
     `config.json` → `tacit_tags` when they fit.
   - `source_prompt`: the user's message, verbatim (trimmed).
   - `confidence`: `confirmed` if the user stated the rationale; `inferred` if you guessed or
     it's missing.

   Do not invent rationale. An honest `inferred` with a null rationale is worth more than a
   plausible fabrication — the PRD generator will only treat `confirmed` DDRs as decisions.

5. **Commit** — for simple cases pass flags; for anything with rejected options or several
   components, write the DDR to a temp json and use `--ddr-file` (schema in
   `.design/docs/ddr-schema.md`):

   ```
   dm iterate --change "Moved primary CTA above order summary" \
     --page checkout --components PrimaryCTA,CartSummary \
     --rationale "Users were scrolling past the summary before finding checkout" \
     --tags hierarchy,mobile-viewport --prompt "move the button up, people keep missing it"
   ```
   Omit `--exploration` to continue the current one. `dm` picks the iteration number and
   parent (= wherever the cursor is, so iterating after `back` forks the lineage automatically).

6. **Report and confirm** — end your reply with:
   - what changed and the new version tag (`checkout-flow/v04`).
   - if `confidence` is `inferred`: **one** short question to capture the missing why, phrased
     as a choice where possible ("Was moving the CTA about hierarchy, or about the mobile
     viewport specifically?"). One question, never a form. When they answer, run
     `dm ddr confirm <id> --rationale "..." [--tags ...] [--rejected "option::why"]` and don't
     ask again. If they ignore it, leave it `inferred` and move on — `dm ddr list --pending`
     shows the backlog and you can offer to clear it later.
   - if `confirmed`: no question. Just the summary.

Keep this reporting to 2–4 lines. The designer is in flow; the DDR is the byproduct, not the
product.

## Navigation (no file edits by you)

| User says | Run |
|---|---|
| "go back" / "undo that iteration" | `dm back` |
| "go forward" / "redo" | `dm forward` (picks the most recent child; if several, list them and use `goto`) |
| "show me v2" / "load version 3" | `dm goto v2` |
| "revert to v3" / "let's go with v3" | `dm revert v3 --rationale "<why, if stated>"` — creates a new iteration whose content is v3; nothing is lost |
| "fork this" / "try a different direction from here" | `dm fork v<N> --as <new-name> --rationale "..."` |
| "what changed between v2 and v4" | `dm diff v2 v4` (add `--stat` for a summary) then explain in design terms, not diff terms |
| "history" / "what have we tried" | `dm log` |
| "why did we…" | `dm ddr list` filtered by exploration, then `dm show vN` for detail |

After `back`/`goto`, tell the user the working copy now shows that version and that editing
from here starts a new branch of the lineage. `back`/`goto`/`fork` refuse to run on a dirty
working copy — commit first with `dm iterate`.

## Multiple explorations

Explorations are parallel concepts (e.g. `checkout-flow` vs `checkout-minimal`), each with its
own v01…vN lineage. They share the same working directory, so only one is checked out at a
time. Switching: `dm goto v<N> --exploration <name>`. When the user asks to compare two
explorations, `dm snapshot` extracts every iteration to `.design/snapshots/<expl>/vNN/` so both
can be opened side by side.

## Manual edits by the designer

Designers will edit files directly. Treat a dirty working copy at the start of a request as
their iteration (step 1). If they ask you to "record what I just did", run `dm diff v<tip>`
to see the changes, describe them in the `change` field, and ask the one question.

## What not to do

- Never delete or rewrite files in `.design/decisions/` by hand; use `dm ddr edit/confirm`.
- Never run plain `git` in the project — the shadow repo is reached only through `dm`, so the
  engineering repo stays untouched.
- Never batch several unrelated design changes into one iteration. One intent → one iteration.
  If the user asks for three unrelated things, make three iterations.
- Never ask more than one clarifying question per iteration.

## References

- `.design/docs/ddr-schema.md` — full DDR field list, allowed values, examples of good vs bad rationale.
- `.design/docs/conventions.md` — markup conventions the mockups must follow (component/state/flow tags, mock data, file layout) and why they matter for later critique and PRD generation.
