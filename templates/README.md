# .design-recall

Design memory for this project: versioned HTML mockups, the decisions behind each version
(Design Decision Records), critique findings and the design principles distilled from them.

> This file is installed by design-recall and replaced on `npx design-recall update`.
> Keep your own notes elsewhere (e.g. `context/`).

Everyday work happens in Claude Code / Cowork: ask for a mockup change and the `design-iterate`
skill records it. The commands below are for looking at the history yourself.

## Running commands

Run everything from the project root (the folder that contains `.design-recall/`). Two equivalent forms:

```
npx design-recall <command>            # via the package
node .design-recall/bin/dm.js <command>   # the installed script directly, no network
```

Requires Node 18+ and git on PATH.

## Viewer

```
npx design-recall viewer --serve       # build it and serve it on http://localhost:4178/viewer/
npx design-recall viewer --serve --watch   # …and rebuild on any change to decisions, findings, principles or mockups
npx design-recall viewer               # build only (.design-recall/viewer/)
```

The viewer must be opened over **http**, not by double-clicking `index.html`: each version's files
are served to the page by a service worker, and browsers only run those over http. Either use
`--serve` (local only, `--port <n>` to pick a port), or serve the project root with any static server
(e.g. VS Code Live Server) and open `/.design-recall/viewer/`. Use ↻ or `R` to reload after a rebuild.

Once the viewer exists it is rebuilt automatically after every iterate, revert, fork, `ddr confirm`,
findings change and `principles --mark`, and after `npx design-recall update`.

Viewer keys: `[` / `]` show or hide the side panels (or drag their edges; double-click an edge to
reset), `R` reloads, ↑ ↓ move through iterations, → ← expand or collapse one, Enter selects.

## Getting principles into the viewer

The viewer's **Principles** panel reads `.design-recall/context/design-principles.md`. That file is
written by Claude, not by a command. The script gathers the evidence and Claude turns it into principles:

1. Confirm decisions so they count as evidence (only **confirmed** DDRs are used, at least 5):
   ```
   npx design-recall ddr list --pending
   npx design-recall ddr confirm ddr-0004 --rationale "why this was done"
   ```
2. In Claude Code, ask: **"update the design principles"** (the `design-principles` skill). It runs
   `dm principles` for the evidence digest, writes `context/design-principles.md` in the format in
   `docs/principles-schema.md`, then runs `dm principles --mark`.
3. `--mark` rebuilds the viewer, so the principles show up right away. Click a principle to
   highlight the decisions that back it.

Check for drift (a rejected option coming back, decisions that contradict a principle):

```
npx design-recall principles --check
```

## Command reference

| Command | What it does |
|---|---|
| `status` | Current exploration/version, pending DDRs, principles status |
| `log [--exploration <name>]` | Iteration history |
| `show <vN>` | One DDR plus the files it changed |
| `diff <vA> [<vB>] [--stat]` | Diff mockups between versions |
| `goto <vN>` / `back` / `forward` | Move the working mockups along the history |
| `revert <vN>` | New version that restores vN |
| `fork <vN> --as <name>` | Start a new exploration from vN |
| `ddr list [--pending]` | Decisions; `--pending` = inferred, awaiting a rationale |
| `ddr confirm <id> [--rationale ...]` | Confirm a decision (makes it principle evidence) |
| `ddr edit <id> --set key=value` | Fix a recorded field |
| `findings list [--open]` | Critique findings from the review agents |
| `principles [--check \| --mark]` | Evidence digest / drift check / record an update |
| `viewer [--serve] [--watch]` | Build the viewer; `--serve` serves it on localhost |
| `snapshot` | Store every version's files in `snapshots/` (the viewer does this for you) |
| `extract` | Build `model.json` from the mockups' DOM |
| `spec prd \| arch` | Write PRD / architecture skeletons to `specs/` |

`node .design-recall/bin/dm.js` with no arguments prints the full usage.

## What's in here

| Path | Contents | Commit it? |
|---|---|---|
| `mockups/` | The mockups, single source of truth | yes |
| `decisions/` | One JSON Design Decision Record per version | yes |
| `context/` | `design-principles.md`, constraints and other notes Claude reads | yes |
| `findings.json` | Critique findings | yes |
| `docs/` | Schemas and conventions (installed) | optional |
| `bin/` | `dm.js` and modules (installed) | optional |
| `.git/` | Shadow history of the mockups; never touches your project's git | no |
| `snapshots/`, `viewer/`, `state.json`, `model.json` | Generated | no |

`snapshots/` holds every version's files for the viewer: each distinct file is stored once in
`snapshots/blobs/` (named by its git id, no extension) and `snapshots/manifest.json` lists which
files make up each version, so it grows only with real changes. There are no per-version folders to
browse; use the viewer, or `dm goto vN` to put a version back into `mockups/`. It is regenerated
from the shadow history, so it is safe to delete.
