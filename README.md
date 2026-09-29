<div align="center">

<h1>design-recall</h1>

**Never lose a design decision again — every version of your mockups, and the reason behind it.**

[![npm](https://img.shields.io/npm/v/design-recall?style=for-the-badge&color=cb3837&logo=npm)](https://www.npmjs.com/package/design-recall)
[![Star this repo](https://img.shields.io/github/stars/rescueahero4/design-recall?style=for-the-badge&logo=github&label=Star&color=f5c518)](https://github.com/rescueahero4/design-recall)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](https://github.com/rescueahero4/design-recall/blob/main/LICENSE)
[![Claude Code + Cowork](https://img.shields.io/badge/Claude_Code-%7C%20Cowork-black?style=for-the-badge)](#setup)

</div>

| | |
|:--:|:--:|
| <img src="https://raw.githubusercontent.com/rescueahero4/design-recall/main/docs/images/viewer-history.png" alt="The viewer: version history, the mockup, and the decision behind it"> | <img src="https://raw.githubusercontent.com/rescueahero4/design-recall/main/docs/images/viewer-principles.png" alt="The viewer with your design principles"> |
| Every version, and why it changed | Your design principles, learned from your decisions |

## What you can do

- 🕘 **Keep every version automatically.** Each change Claude makes to your mockups is saved. You never have to "save a version".
- 💬 **Remember *why*.** Every version comes with a short note: what changed, why, and which ideas were rejected.
- 🔀 **Go back, branch off, compare.** Return to any version, try a different direction without losing the first, or view two versions side by side.
- 🔎 **Get a second opinion.** Three AI reviewers look for edge cases, error states and things that are hard to build.
- 🧠 **Turn your taste into principles.** Claude learns how you design from your decisions, and asks when a new request goes against them.

> **You don't need to learn any commands.** Install once, then just talk to Claude in plain words. Everything stays in one folder inside your project, on your computer.

<div align="center">

**⭐ Leave a star if you find this useful**

</div>

---

## Contents

- [Setup](#setup) — get it running, ~1 minute
- [How to use it](#how-to-use-it) — what to say to Claude, and the history viewer
- [Reference](#reference) — words, commands, file locations, troubleshooting, notes for AI agents

---

# Setup

Three steps. The first one is only needed once per computer.

## Step 1 — Install Node, Git and Claude

You need three things:

- [Node.js](https://nodejs.org) — version 18 or newer
- [Git](https://git-scm.com/downloads)
- [Claude Code](https://claude.com/claude-code) or Cowork

Install each with the default settings. Not sure if you already have them? Open a terminal and run:

```sh
node --version    # want v18 or newer
git --version     # any version
```

If either says `command not found` or `not recognized`, install it from the links above, then **close the terminal and open a new one.**

<details>
<summary><b>How do I open a terminal in my project folder?</b></summary>

- **Windows** — open the folder in File Explorer, right-click an empty spot inside it and choose **Open in Terminal**.
- **macOS** — right-click the folder in Finder and choose **New Terminal at Folder**. (If it's missing: **System Settings → Keyboard → Keyboard Shortcuts → Services**, turn it on.)

Any folder works as a project, even an empty one.

</details>

## Step 2 — Add design-recall to your project

In a terminal opened in your project folder, paste this and press Enter:

```sh
npx design-recall init
```

<details>
<summary>What this adds to your project</summary>

- a `.design-recall/` folder, which holds your mockups, their history and your decisions
- five skills in `.claude/skills/` and three reviewer agents in `.claude/agents/`, so Claude knows the workflow
- a short marked section in `CLAUDE.md` (created if missing)

It doesn't touch your project's own Git history or code. Safe to run again.

</details>

## Step 3 — Ask Claude for a design

Open Claude Code (or Cowork) in the same folder and ask for something:

> Make a mockup of a checkout page for a coffee shop.

That's it. From now on every change is saved automatically.

---

# How to use it

## Just talk to Claude

Say what you want in plain words:

| Say something like… | What happens |
|---|---|
| "Make the Pay button bigger" | Claude changes the mockup and saves a new version. It may ask one short question: *why?* |
| "Go back to version 3" | The mockup returns to how it looked in version 3. Nothing is deleted. |
| "Try a completely different direction for this page" | Starts a separate **exploration**, so both ideas are kept. |
| "Show me the history" | Opens the viewer (below). |
| "Poke holes in this design" | Three reviewers check for edge cases, error states and things that are hard to build. Your design isn't changed. |
| "Fix finding f-0004" | Claude fixes one of the problems the reviewers found. |
| "What have you learned about how I design?" | Claude writes down your design principles, each backed by decisions you made. |
| "Write the PRD" | Creates a product requirements document from your mockups and decisions. |

> **Tip:** when Claude asks *why* you made a change, answer in one sentence. Those answers become your design principles — they're what make the history useful later.

## See your history in the viewer

Ask Claude to **"show me the history"**, or run:

```sh
npx design-recall viewer --serve
```

Then open **http://localhost:4178/viewer/** in your browser. Keep the terminal open while you use it; press `Ctrl+C` to stop.

- **Left** — your **principles** and every **version**, newest on top. Click one to see it.
- **Middle** — the mockup itself, fully clickable. Tabs switch between pages.
- **Right** — the **decision**: what changed, why, what was rejected, and your original words.
- **Compare** (top bar) — pick a second version to see both side by side.
- **Orange square** — Claude doesn't know *why* yet. **Pending only** shows just those.

The viewer updates itself after every change. Press **R** or **↻** to reload.

<details>
<summary>Why not just double-click <code>index.html</code>?</summary>

Browsers only let the viewer load your saved versions when it's opened through a web address (`http://…`), not as a file. Opened as a file, it shows a message telling you to use the command above. `--serve` runs a small web server that only your own computer can reach.

Prefer your own server? Serve the project folder with any static server (for example VS Code Live Server) and open `/.design-recall/viewer/`.

</details>

---

# Reference

<details>
<summary><b>Words you'll see</b></summary>

| Word | Meaning |
|---|---|
| **Version** (v01, v02…) | A saved state of your mockups. A new one is made after every change. |
| **Exploration** | A separate line of ideas, e.g. `checkout` vs `checkout-minimal`. Each has its own versions. |
| **Decision** (DDR) | The note saved with each version: what changed, why, and what was rejected. |
| **Inferred / confirmed** | *Inferred* = Claude guessed the reason. *Confirmed* = you gave or approved it. |
| **Principle** | A rule about how you design, learned from your confirmed decisions. |
| **Finding** | A problem spotted by the reviewers ("poke holes in this"). |

</details>

<details>
<summary><b>Handy commands (optional)</b></summary>

Claude runs these for you. Use them only if you like the terminal.

| Command | What it does |
|---|---|
| `npx design-recall status` | Where you are and what's waiting for a reason |
| `npx design-recall log` | List of all versions |
| `npx design-recall goto v3` | Put version 3 back into the mockups folder |
| `npx design-recall viewer --serve` | Open the history viewer |
| `npx design-recall update` | Update to the newest design-recall (keeps your work) |
| `npx design-recall uninstall` | Remove the tools (keeps your mockups, history and decisions) |

Full list: `node .design-recall/bin/dm.js` (no arguments), or `.design-recall/README.md` in your project.

</details>

<details>
<summary><b>Where your files live</b></summary>

Everything is in **`.design-recall/`** inside your project:

| What | Where |
|---|---|
| Your mockups (HTML, CSS, images) — **edit these** | `.design-recall/mockups/` |
| One decision note per version | `.design-recall/decisions/` |
| Your design principles (Claude writes, you edit) | `.design-recall/context/design-principles.md` |
| Reviewer findings | `.design-recall/findings.json` |
| History of your mockups (separate from your project's Git) | `.design-recall/.git/` |
| Generated — safe to ignore | `snapshots/`, `viewer/`, `state.json`, `model.json` |

</details>

<details>
<summary><b>Troubleshooting</b></summary>

- **"npx is not recognized" / "command not found"** — Node.js isn't installed yet. Install it from [nodejs.org](https://nodejs.org), then close and reopen the terminal.
- **The viewer shows a message instead of my mockup** — it was opened as a file. Run `npx design-recall viewer --serve` and use the `http://localhost…` link it prints.
- **I edited a mockup by hand. Is that saved?** — yes. Next time you talk to Claude, it records your edit as a version and asks why.
- **Can I share the history?** — zip `.design-recall/viewer` and `.design-recall/snapshots` together. The other person runs a local web server in that folder (steps in the *design-viewer* skill).
- **Does it touch my project's Git or code?** — no. It adds one folder, a few Claude skill files and a short section in `CLAUDE.md`.

</details>

<details>
<summary><b>For AI agents</b></summary>

Facts for agents working in a project that uses design-recall:

- **Install:** `npx design-recall init` in the project root. Requires Node ≥ 18 and `git` on PATH. No runtime dependencies. Safe to re-run.
- **Installed files:** `.design-recall/` (tool + data); skills in `.claude/skills/design-{iterate,critique,spec,viewer,principles}/SKILL.md`; agents in `.claude/agents/{edge-case-hunter,unhappy-path-walker,feasibility-reviewer}.md`; a marked block in `CLAUDE.md` (and `AGENTS.md` if it exists).
- **Follow the skills.** Every mockup change goes through the `design-iterate` skill, which ends with `node .design-recall/bin/dm.js iterate …` to commit the version and write its DDR. Never skip recording a change.
- **Source of truth:** edit only `.design-recall/mockups/`. Never edit `.design-recall/snapshots/`, `viewer/` or `.git/`; they are generated.
- **Read first:** `.design-recall/context/design-principles.md`. If a request contradicts a principle, ask before changing.
- **CLI:** `node .design-recall/bin/dm.js <command>` (same as `npx design-recall <command>`). Run it with no arguments for full usage. Most commands print JSON; `log` and `ddr list` take `--json`.
- **Viewer:** `dm viewer --serve` serves `http://localhost:4178/viewer/` (next free port if busy; `--port <n>`). Long-running — start it in the background. Must be opened over http; `file://` does not work.
- **Reference docs** in `.design-recall/docs/`: DDR schema, findings schema, principles schema, mockup conventions. Command reference: `.design-recall/README.md`.

</details>

<details>
<summary><b>What's new</b></summary>

See the [CHANGELOG](https://github.com/rescueahero4/design-recall/blob/main/CHANGELOG.md).

</details>

---

<div align="center">

**Found this useful? [⭐ Star it](https://github.com/rescueahero4/design-recall) or share it with a designer who's ever asked "wait, why did we change that?"**

MIT licensed — see [LICENSE](https://github.com/rescueahero4/design-recall/blob/main/LICENSE).

</div>
