#!/usr/bin/env node
/**
 * design-recall installer
 *
 *   npx design-recall init        install into current project (idempotent)
 *   npx design-recall update      refresh scripts, docs and skill; keep data
 *   npx design-recall uninstall   remove tool files; keep .design-recall/decisions, .git, mockups
 *   npx design-recall <dm cmd>    passthrough to .design-recall/bin/dm.js
 *
 * Writes:
 *   .design-recall/bin/                             dm.js + viewer/extract/spec modules
 *   .design-recall/docs/*.md                        conventions, DDR + findings schemas, critique checklists
 *   .design-recall/mockups/                         your HTML/CSS/JS mockups (single source of truth)
 *   .design-recall/{config.json,state.json,decisions/,snapshots/,context/,.git/}   via dm init
 *   .claude/skills/design-{iterate,critique,spec,viewer,principles}/SKILL.md
 *   .claude/agents/{edge-case-hunter,unhappy-path-walker,feasibility-reviewer}.md
 *   CLAUDE.md / AGENTS.md                    a marked block pointing at the skill (appended)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PKG = path.resolve(__dirname, "..");
const ROOT = process.cwd();
const D = path.join(ROOT, ".design-recall");
const MARK_START = "<!-- design-recall:start -->";
const MARK_END = "<!-- design-recall:end -->";
// legacy markers written by releases published as "dot-design" (< 0.3); still recognised so update/uninstall replace them
const esc = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
const BLOCK_RE = new RegExp("(?:" + esc(MARK_START) + "|<!-- dot-design:start -->)[\\s\\S]*?(?:" + esc(MARK_END) + "|<!-- dot-design:end -->)");
const VERSION = require(path.join(PKG, "package.json")).version;

const BLOCK = `${MARK_START}
## Design memory

This project uses **design-recall** (v${VERSION}). Mockups live in \`.design-recall/mockups/\` and are the
single source of truth for UX, the PRD and the solution architecture. Every change to them is an
iteration recorded by \`node .design-recall/bin/dm.js\` with a Design Decision Record (DDR).

Skills in \`.claude/skills/\` (read the matching SKILL.md before acting):
- **design-iterate** — ANY create/change/compare/revert/fork of a mockup. Never edit mockups without it.
- **design-critique** — edge cases, unhappy paths, feasibility → findings (uses agents in \`.claude/agents/\`).
- **design-spec** — PRD and solution-architecture docs derived from mockups + DDRs + findings.
- **design-viewer** — build the local HTML viewer of iterations and decisions.
- **design-principles** — distil confirmed DDRs into \`.design-recall/context/design-principles.md\`; check drift.

**Read \`.design-recall/context/design-principles.md\` at the start of any design work** if it exists. It is
the designer's own stated preferences, with evidence, and outranks generic best practice.

Never run plain \`git\` against \`.design-recall/\`; use \`dm\` commands only.
Docs: \`.design-recall/docs/\` (conventions, ddr-schema, findings-schema, critique-checklists).
${MARK_END}`;

// Installs made before the rename live in .design/ — move them to .design-recall/ once, keeping history and DDRs.
function migrateLegacyDir() {
  const old = path.join(ROOT, ".design");
  if (fs.existsSync(D) || !fs.existsSync(path.join(old, "config.json"))) return false;
  let leftover = false;
  try { fs.renameSync(old, D); }
  catch (e) {
    // rename can be refused (cross-device, locked, restricted mounts): copy, then try to remove the original
    fs.cpSync(old, D, { recursive: true });
    try { fs.rmSync(old, { recursive: true, force: true }); } catch { leftover = true; }
  }
  const cfgPath = path.join(D, "config.json");
  fs.writeFileSync(cfgPath, fs.readFileSync(cfgPath, "utf8").replace(/\.design(?![\w-])/g, ".design-recall"));
  const gi = path.join(ROOT, ".gitignore");
  if (fs.existsSync(gi)) fs.writeFileSync(gi, fs.readFileSync(gi, "utf8").replace(/^(# )?\.design(?=\/|$)/gm, "$1.design-recall").replace(/^# dot-design$/m, "# design-recall"));
  log("migrated .design/ → .design-recall/ (history, decisions and mockups kept)");
  if (leftover) log("  WARNING: could not delete the old .design/ folder — it is now a stale copy; delete it yourself");
  return true;
}

function copyFile(src, dst) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
function log(s) { process.stdout.write("design-recall: " + s + "\n"); }

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
  const re = BLOCK_RE;
  txt = re.test(txt) ? txt.replace(re, BLOCK) : txt.replace(/\s*$/, "\n\n") + BLOCK + "\n";
  fs.writeFileSync(p, txt);
  return true;
}
function removeBlock(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return;
  const re = new RegExp("\\n*" + BLOCK_RE.source + "\\n?");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(re, "\n"));
}

function dm(args) {
  execFileSync(process.execPath, [path.join(D, "bin", "dm.js"), ...args], { stdio: "inherit", cwd: ROOT });
}

function cmdInit(args) {
  migrateLegacyDir();
  const fresh = !fs.existsSync(path.join(D, "config.json"));
  installFiles();
  if (fresh) {
    const mockups = args.includes("--mockups") ? args[args.indexOf("--mockups") + 1] : ".design-recall/mockups";
    dm(["init", "--mockups", mockups]);
  } else log(".design-recall/ already initialised — refreshed tool files only");
  const wroteClaude = upsertBlock("CLAUDE.md", { createIfMissing: true });
  const wroteAgents = upsertBlock("AGENTS.md", { createIfMissing: false });
  // keep eng repo tidy: ignore shadow-git internals if project has a .gitignore
  const gi = path.join(ROOT, ".gitignore");
  if (fs.existsSync(gi)) {
    const cur = fs.readFileSync(gi, "utf8");
    const lines = [".design-recall/.git/", ".design-recall/snapshots/", ".design-recall/state.json"].filter((l) => !cur.split("\n").includes(l));
    if (lines.length) fs.writeFileSync(gi, cur.replace(/\s*$/, "\n") + "# design-recall\n" + lines.join("\n") + "\n");
  }
  log(`installed v${VERSION}`);
  log("  .design-recall/bin/, .design-recall/docs/, .design-recall/mockups/");
  log("  .claude/skills/{" + SKILLS.join(",") + "}  .claude/agents/{" + AGENTS.join(",") + "}");
  log(`  CLAUDE.md${wroteAgents ? " + AGENTS.md" : ""} (marked block${wroteClaude ? "" : " skipped"})`);
  if (fresh) log("next: open Claude Code or Cowork here and ask for a mockup. Or: npx design-recall status");
}

function cmdUpdate() {
  migrateLegacyDir();
  if (!fs.existsSync(D)) return log("not installed here; run: npx design-recall init");
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
  log("removed tool files. Kept .design-recall/mockups, .design-recall/decisions, .design-recall/.git (delete .design-recall/ yourself if you want them gone)");
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "help" || cmd === "--help") {
  console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("\n").slice(2).map((l) => l.replace(/^ \* ?/, "")).join("\n"));
} else if (cmd === "init") cmdInit(rest);
else if (cmd === "update") cmdUpdate();
else if (cmd === "uninstall") cmdUninstall();
else if (cmd === "--version" || cmd === "-v") console.log(VERSION);
else {
  migrateLegacyDir();
  if (!fs.existsSync(path.join(D, "bin", "dm.js"))) { log("not installed here; run: npx design-recall init"); process.exit(1); }
  dm([cmd, ...rest]);
}
