#!/usr/bin/env node
/**
 * dot-design installer
 *
 *   npx dot-design init        install into current project (idempotent)
 *   npx dot-design update      refresh scripts, docs and skill; keep data
 *   npx dot-design uninstall   remove tool files; keep .design/decisions, .git, mockups
 *   npx dot-design <dm cmd>    passthrough to .design/bin/dm.js
 *
 * Writes:
 *   .design/bin/                             dm.js + viewer/extract/spec modules
 *   .design/docs/*.md                        conventions, DDR + findings schemas, critique checklists
 *   .design/mockups/                         your HTML/CSS/JS mockups (single source of truth)
 *   .design/{config.json,state.json,decisions/,snapshots/,context/,.git/}   via dm init
 *   .claude/skills/design-{iterate,critique,spec,viewer,principles}/SKILL.md
 *   .claude/agents/{edge-case-hunter,unhappy-path-walker,feasibility-reviewer}.md
 *   CLAUDE.md / AGENTS.md                    a marked block pointing at the skill (appended)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PKG = path.resolve(__dirname, "..");
const ROOT = process.cwd();
const D = path.join(ROOT, ".design");
const MARK_START = "<!-- dot-design:start -->";
const MARK_END = "<!-- dot-design:end -->";
const VERSION = require(path.join(PKG, "package.json")).version;

const BLOCK = `${MARK_START}
## Design memory

This project uses **dot-design** (v${VERSION}). Mockups live in \`.design/mockups/\` and are the
single source of truth for UX, the PRD and the solution architecture. Every change to them is an
iteration recorded by \`node .design/bin/dm.js\` with a Design Decision Record (DDR).

Skills in \`.claude/skills/\` (read the matching SKILL.md before acting):
- **design-iterate** — ANY create/change/compare/revert/fork of a mockup. Never edit mockups without it.
- **design-critique** — edge cases, unhappy paths, feasibility → findings (uses agents in \`.claude/agents/\`).
- **design-spec** — PRD and solution-architecture docs derived from mockups + DDRs + findings.
- **design-viewer** — build the local HTML viewer of iterations and decisions.
- **design-principles** — distil confirmed DDRs into \`.design/context/design-principles.md\`; check drift.

**Read \`.design/context/design-principles.md\` at the start of any design work** if it exists. It is
the designer's own stated preferences, with evidence, and outranks generic best practice.

Never run plain \`git\` against \`.design/\`; use \`dm\` commands only.
Docs: \`.design/docs/\` (conventions, ddr-schema, findings-schema, critique-checklists).
${MARK_END}`;

function copyFile(src, dst) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
function log(s) { process.stdout.write("dot-design: " + s + "\n"); }

const SKILLS = ["design-iterate", "design-critique", "design-spec", "design-viewer", "design-principles"];
const AGENTS = ["edge-case-hunter", "unhappy-path-walker", "feasibility-reviewer"];
function installFiles() {
  for (const f of fs.readdirSync(path.join(PKG, "lib"))) copyFile(path.join(PKG, "lib", f), path.join(D, "bin", f));
  for (const f of fs.readdirSync(path.join(PKG, "templates", "docs"))) copyFile(path.join(PKG, "templates", "docs", f), path.join(D, "docs", f));
  for (const s of SKILLS) copyFile(path.join(PKG, "templates", "skills", s, "SKILL.md"), path.join(ROOT, ".claude", "skills", s, "SKILL.md"));
  for (const a of AGENTS) copyFile(path.join(PKG, "templates", "agents", a + ".md"), path.join(ROOT, ".claude", "agents", a + ".md"));
  fs.writeFileSync(path.join(D, "VERSION"), VERSION + "\n");
}

function upsertBlock(file, { createIfMissing }) {
  const p = path.join(ROOT, file);
  const exists = fs.existsSync(p);
  if (!exists && !createIfMissing) return false;
  let txt = exists ? fs.readFileSync(p, "utf8") : `# ${path.basename(ROOT)}\n`;
  const re = new RegExp(MARK_START.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "[\\s\\S]*?" + MARK_END.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"));
  txt = re.test(txt) ? txt.replace(re, BLOCK) : txt.replace(/\s*$/, "\n\n") + BLOCK + "\n";
  fs.writeFileSync(p, txt);
  return true;
}
function removeBlock(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return;
  const re = new RegExp("\\n*" + MARK_START.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "[\\s\\S]*?" + MARK_END.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\n?");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(re, "\n"));
}

function dm(args) {
  execFileSync(process.execPath, [path.join(D, "bin", "dm.js"), ...args], { stdio: "inherit", cwd: ROOT });
}

function cmdInit(args) {
  const fresh = !fs.existsSync(path.join(D, "config.json"));
  installFiles();
  if (fresh) {
    const mockups = args.includes("--mockups") ? args[args.indexOf("--mockups") + 1] : ".design/mockups";
    dm(["init", "--mockups", mockups]);
  } else log(".design/ already initialised — refreshed tool files only");
  const wroteClaude = upsertBlock("CLAUDE.md", { createIfMissing: true });
  const wroteAgents = upsertBlock("AGENTS.md", { createIfMissing: false });
  // keep eng repo tidy: ignore shadow-git internals if project has a .gitignore
  const gi = path.join(ROOT, ".gitignore");
  if (fs.existsSync(gi)) {
    const cur = fs.readFileSync(gi, "utf8");
    const lines = [".design/.git/", ".design/snapshots/", ".design/state.json"].filter((l) => !cur.split("\n").includes(l));
    if (lines.length) fs.writeFileSync(gi, cur.replace(/\s*$/, "\n") + "# dot-design\n" + lines.join("\n") + "\n");
  }
  log(`installed v${VERSION}`);
  log("  .design/bin/, .design/docs/, .design/mockups/");
  log("  .claude/skills/{" + SKILLS.join(",") + "}  .claude/agents/{" + AGENTS.join(",") + "}");
  log(`  CLAUDE.md${wroteAgents ? " + AGENTS.md" : ""} (marked block${wroteClaude ? "" : " skipped"})`);
  if (fresh) log("next: open Claude Code or Cowork here and ask for a mockup. Or: npx dot-design status");
}

function cmdUpdate() {
  if (!fs.existsSync(D)) return log("not installed here; run: npx dot-design init");
  installFiles();
  upsertBlock("CLAUDE.md", { createIfMissing: false });
  upsertBlock("AGENTS.md", { createIfMissing: false });
  log(`updated to v${VERSION} (decisions, history and mockups untouched)`);
}

function cmdUninstall() {
  for (const p of ["bin", "docs", "VERSION", "viewer", "model.json"]) fs.rmSync(path.join(D, p), { recursive: true, force: true });
  for (const s of SKILLS) fs.rmSync(path.join(ROOT, ".claude", "skills", s), { recursive: true, force: true });
  for (const a of AGENTS) fs.rmSync(path.join(ROOT, ".claude", "agents", a + ".md"), { force: true });
  removeBlock("CLAUDE.md"); removeBlock("AGENTS.md");
  log("removed tool files. Kept .design/mockups, .design/decisions, .design/.git (delete .design/ yourself if you want them gone)");
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "help" || cmd === "--help") {
  console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("\n").slice(2).map((l) => l.replace(/^ \* ?/, "")).join("\n"));
} else if (cmd === "init") cmdInit(rest);
else if (cmd === "update") cmdUpdate();
else if (cmd === "uninstall") cmdUninstall();
else if (cmd === "--version" || cmd === "-v") console.log(VERSION);
else {
  if (!fs.existsSync(path.join(D, "bin", "dm.js"))) { log("not installed here; run: npx dot-design init"); process.exit(1); }
  dm([cmd, ...rest]);
}
