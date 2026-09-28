#!/usr/bin/env node
/**
 * dm — design memory CLI
 *
 * Single source of truth for mockups lives in <mockups_dir> (default: .design-recall/mockups/).
 * History lives in a shadow git repo at .design-recall/.git so it never touches the
 * engineering repo. Every iteration = one commit + one tag + one DDR json.
 *
 * Zero dependencies. Requires: node >= 18, git.
 *
 * Commands:
 *   init [--mockups <dir>]
 *   status
 *   iterate  --exploration <name> --change "<text>" [--rationale "<text>"]
 *            [--type iteration|new-exploration|fix|revert|fork]
 *            [--page <name>] [--components a,b] [--tags a,b]
 *            [--rejected "option::why" ...] [--confidence inferred|confirmed]
 *            [--trigger designer|edge-case-agent|unhappy-path-agent|feasibility-agent]
 *            [--prompt "<original user prompt>"] [--ddr-file <path.json>]
 *   log      [--exploration <name>] [--json]
 *   show     <vN> [--exploration <name>]          (print DDR + files changed)
 *   diff     <vA> [<vB>] [--exploration <name>] [--stat]
 *   back / forward                                (move working copy along lineage)
 *   goto     <vN> [--exploration <name>]
 *   revert   <vN> [--exploration <name>] [--rationale "<text>"]
 *   fork     <vN> --as <new-exploration> [--rationale "<text>"]
 *   ddr list [--pending] [--exploration <name>] [--json]
 *   ddr confirm <ddr-id> [--rationale "<text>"] [--rejected "option::why"] [--tags a,b]
 *   ddr edit <ddr-id> --set key=value ...
 *   snapshot                                      (extract every iteration to .design-recall/snapshots/)
 *   viewer   [--watch]                            (build .design-recall/viewer/index.html; --watch rebuilds on any change)
 *            the viewer is also rebuilt automatically after iterate/revert/fork/ddr/findings/principles --mark once it exists
 *   extract  [--json]                             (build .design-recall/model.json from the mockups DOM + mock-data.js)
 *   findings list [--open] [--agent <name>] [--json]
 *   findings add --file <findings.json>           (append critique findings; see docs/findings-schema.md)
 *   findings resolve <id> [--ddr <ddr-id>]
 *   spec prd | arch                               (write .design-recall/specs/*.md skeletons)
 *   principles [--json]                           (evidence digest of confirmed DDRs → stdout; Claude distils it)
 *   principles --check                            (drift: rejected-then-reintroduced, unclassified evidence)
 *   principles --mark                             (record that design-principles.md was updated; rebuilds the viewer)
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// ---------- paths ----------
const ROOT = findRoot(process.cwd());
const DM = path.join(ROOT, ".design-recall");
const GIT_DIR = path.join(DM, ".git");
const CONFIG = path.join(DM, "config.json");
const STATE = path.join(DM, "state.json");
const DECISIONS = path.join(DM, "decisions");
const SNAPSHOTS = path.join(DM, "snapshots");
const CONTEXT = path.join(DM, "context");

function findRoot(start) {
  let dir = start;
  while (true) {
    if (fs.existsSync(path.join(dir, ".design-recall", "config.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

// ---------- helpers ----------
function die(msg, code = 1) {
  process.stderr.write("dm: " + msg + "\n");
  process.exit(code);
}
function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}
function cfg() {
  const c = readJson(CONFIG, null);
  if (!c) die("not initialised here. Run: dm init");
  return c;
}
function state() { return readJson(STATE, { current_exploration: null, cursor: null }); }
function saveState(s) { writeJson(STATE, s); }
function mockupsDir() { return path.join(ROOT, cfg().mockups_dir); }

function git(args, opts = {}) {
  const env = { ...process.env, GIT_DIR, GIT_WORK_TREE: mockupsDir() };
  try {
    return execFileSync("git", args, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trimEnd();
  } catch (e) {
    if (opts.allowFail) return null;
    die("git " + args.join(" ") + "\n" + (e.stderr || e.message));
  }
}
function gitRaw(args) { return git(args, { allowFail: true }); }

function parseArgs(argv) {
  const out = { _: [], rejected: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (key === "rejected") { out.rejected.push(next); i++; continue; }
      if (key === "set") { (out.set = out.set || []).push(next); i++; continue; }
      if (next === undefined || next.startsWith("--")) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}
function list(v) { return v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : []; }
function now() {
  const d = new Date();
  const tz = -d.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const pad = (n) => String(Math.abs(n)).padStart(2, "0");
  return d.toISOString().replace("Z", "") .replace(/\.\d+$/, "") + sign + pad(Math.floor(tz / 60)) + ":" + pad(tz % 60);
}
function vtag(expl, n) { return `${expl}/v${String(n).padStart(2, "0")}`; }
function parseV(s) {
  const m = String(s).match(/^v?(\d+)$/i);
  if (!m) die(`bad iteration reference "${s}" (expected v3 or 3)`);
  return parseInt(m[1], 10);
}

// ---------- DDR store ----------
function allDdrs() {
  if (!fs.existsSync(DECISIONS)) return [];
  return fs.readdirSync(DECISIONS)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(path.join(DECISIONS, f), null))
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}
function nextDdrId() {
  const n = allDdrs().reduce((m, d) => Math.max(m, parseInt(d.id.split("-")[1], 10) || 0), 0) + 1;
  return "ddr-" + String(n).padStart(4, "0");
}
function ddrPath(id) { return path.join(DECISIONS, id + ".json"); }
function findDdr(id) {
  const d = readJson(ddrPath(id), null);
  if (!d) die("no such DDR: " + id);
  return d;
}
function ddrsFor(expl) { return allDdrs().filter((d) => d.exploration === expl); }
function ddrForIteration(expl, n) {
  return ddrsFor(expl).filter((d) => d.iteration === n && d.commit).pop() || null;
}
function maxIteration(expl) { return ddrsFor(expl).reduce((m, d) => Math.max(m, d.iteration || 0), 0); }

function resolveExploration(args, s) {
  const expl = args.exploration || s.current_exploration;
  if (!expl) die("no exploration set. Pass --exploration <name>");
  return expl;
}

// ---------- commands ----------
function cmdInit(args) {
  const mockups = args.mockups || ".design-recall/mockups";
  if (fs.existsSync(CONFIG)) die(".design-recall/ already initialised");
  const root = process.cwd();
  const dm = path.join(root, ".design-recall");
  fs.mkdirSync(path.join(dm, "decisions"), { recursive: true });
  fs.mkdirSync(path.join(dm, "snapshots"), { recursive: true });
  fs.mkdirSync(path.join(dm, "context"), { recursive: true });
  fs.mkdirSync(path.join(root, mockups), { recursive: true });

  writeJson(path.join(dm, "config.json"), {
    version: 1,
    mockups_dir: mockups,
    tech_constraints: ".design-recall/context/tech-constraints.md",
    conventions: { component_attr: "data-component", state_attr: "data-state", flow_attr: "data-flow" },
    tacit_tags: [],
  });
  writeJson(path.join(dm, "state.json"), { current_exploration: null, cursor: null });

  const tc = path.join(dm, "context", "tech-constraints.md");
  if (!fs.existsSync(tc)) fs.writeFileSync(tc,
`# Tech constraints

Filled in by engineering (or the designer, from what engineering said). Read by the
feasibility agent and the solution-architecture generator. Keep it factual.

## Stack

## Existing components / design system

## APIs and data available

## Performance / platform budgets

## Known no-gos
`);

  // shadow git
  execFileSync("git", ["init", "-q", "--initial-branch=main"], { env: { ...process.env, GIT_DIR: path.join(dm, ".git"), GIT_WORK_TREE: path.join(root, mockups) } });
  const env = { ...process.env, GIT_DIR: path.join(dm, ".git"), GIT_WORK_TREE: path.join(root, mockups) };
  execFileSync("git", ["config", "user.name", "design-recall"], { env });
  execFileSync("git", ["config", "user.email", "design-recall@local"], { env });
  fs.writeFileSync(path.join(dm, ".git", "info", "exclude"), ".DS_Store\nnode_modules/\n");

  // keep eng repo clean of shadow git internals but keep DDRs versionable by eng if they want
  fs.writeFileSync(path.join(dm, ".gitignore"), ".git/\nsnapshots/\nstate.json\nviewer/\nmodel.json\n");

  // starter mockup if empty
  const files = fs.readdirSync(path.join(root, mockups));
  if (files.length === 0) {
    fs.writeFileSync(path.join(root, mockups, "index.html"),
`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mockup</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body data-flow="home">
  <main data-component="Hero" data-state="default">
    <h1>Start here</h1>
    <p>Replace this page. Tag components with data-component, states with data-state, flows with data-flow.</p>
  </main>
  <script src="mock-data.js"></script>
</body>
</html>
`);
    fs.writeFileSync(path.join(root, mockups, "styles.css"), `:root{font-family:system-ui,sans-serif;line-height:1.5}body{margin:0;padding:2rem}\n`);
    fs.writeFileSync(path.join(root, mockups, "mock-data.js"), `// All fake data lives here. The solution-architecture generator reads this as the implied data model.\nwindow.MOCK = {};\n`);
  }
  console.log(`initialised .design-recall/ (shadow repo) for mockups in ${mockups}/`);
  console.log(`next: dm iterate --exploration <name> --type new-exploration --change "..." --rationale "..."`);
}

function cmdStatus() {
  const s = state();
  const c = cfg();
  const dirty = gitRaw(["status", "--porcelain"]) || "";
  const head = gitRaw(["rev-parse", "--short", "HEAD"]);
  const pending = allDdrs().filter((d) => d.confidence === "inferred" && d.status === "active");
  const explorations = [...new Set(allDdrs().map((d) => d.exploration))];
  const confirmedN = allDdrs().filter((d) => d.confidence === "confirmed" && d.status !== "reverted").length;
  const lastRun = s.principles_last_run || null;
  const out = {
    mockups_dir: c.mockups_dir,
    current_exploration: s.current_exploration,
    cursor: s.cursor,
    head,
    uncommitted_changes: dirty ? dirty.split("\n") : [],
    explorations: explorations.map((e) => ({ name: e, iterations: maxIteration(e) })),
    pending_confirmation: pending.map((d) => ({ id: d.id, iteration: vtag(d.exploration, d.iteration), change: d.change })),
    principles: { file_exists: fs.existsSync(path.join(CONTEXT, "design-principles.md")), confirmed_ddrs: confirmedN, confirmed_since_last_run: lastRun ? confirmedN - lastRun.confirmed : confirmedN, last_run: lastRun ? lastRun.ts : null },
  };
  console.log(JSON.stringify(out, null, 2));
}

function commitWorkingTree(message) {
  git(["add", "-A"]);
  const staged = gitRaw(["diff", "--cached", "--name-only"]) || "";
  git(["commit", "-q", "--allow-empty", "-m", message]);
  return { hash: git(["rev-parse", "--short", "HEAD"]), files: staged ? staged.split("\n") : [] };
}

function cmdIterate(args) {
  const s = state();
  let ddr = args["ddr-file"] ? readJson(path.resolve(args["ddr-file"]), null) : {};
  if (args["ddr-file"] && !ddr) die("cannot read --ddr-file");

  const expl = args.exploration || ddr.exploration || s.current_exploration;
  if (!expl) die("--exploration required");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(expl)) die("exploration name: lowercase, digits, hyphens only");

  const change = args.change || ddr.change;
  if (!change) die("--change required (one line: what changed)");

  const existing = maxIteration(expl);
  let type = args.type || ddr.type || (existing === 0 ? "new-exploration" : "iteration");
  if (existing === 0 && type === "iteration") type = "new-exploration";

  // parent = where the cursor is (if in this exploration), else tip
  let parent = null;
  if (existing > 0) {
    parent = (s.cursor && s.cursor.exploration === expl) ? s.cursor.iteration : existing;
  }
  const iteration = existing + 1;
  const tag = vtag(expl, iteration);

  let { hash, files } = commitWorkingTree(`${tag}: ${change}`);
  git(["tag", tag]);
  if (iteration === 1) files = (git(["ls-tree", "-r", "--name-only", tag]) || "").split("\n").filter(Boolean);

  const rationale = args.rationale || ddr.rationale || null;
  const id = nextDdrId();
  const record = {
    id,
    ts: now(),
    exploration: expl,
    iteration,
    parent,
    commit: hash,
    type,
    trigger: args.trigger || ddr.trigger || "designer",
    scope: {
      page: args.page || (ddr.scope && ddr.scope.page) || null,
      components: args.components ? list(args.components) : ((ddr.scope && ddr.scope.components) || []),
      files,
    },
    change,
    rationale,
    rejected: args.rejected.length ? args.rejected.map(parseRejected) : (ddr.rejected || []),
    tacit_tags: args.tags ? list(args.tags) : (ddr.tacit_tags || []),
    confidence: args.confidence || ddr.confidence || (rationale ? "confirmed" : "inferred"),
    status: "active",
    source_prompt: args.prompt || ddr.source_prompt || null,
  };
  writeJson(ddrPath(id), record);
  registerTags(record.tacit_tags);
  saveState({ current_exploration: expl, cursor: { exploration: expl, iteration } });
  console.log(JSON.stringify({ ok: true, id, tag, commit: hash, parent: parent ? vtag(expl, parent) : null, files, confidence: record.confidence }, null, 2));
  refreshViewer();
}
function parseRejected(str) {
  const [option, why] = String(str).split("::");
  return { option: option.trim(), why: (why || "").trim() || null };
}
function registerTags(tags) {
  if (!tags.length) return;
  const c = cfg();
  const set = new Set(c.tacit_tags || []);
  tags.forEach((t) => set.add(t));
  c.tacit_tags = [...set].sort();
  writeJson(CONFIG, c);
}

function cmdLog(args) {
  const s = state();
  const expl = args.exploration || s.current_exploration;
  let ds = allDdrs().filter((d) => d.commit);
  if (expl) ds = ds.filter((d) => d.exploration === expl);
  if (args.json) return console.log(JSON.stringify(ds, null, 2));
  const cur = s.cursor;
  for (const d of ds) {
    const here = cur && cur.exploration === d.exploration && cur.iteration === d.iteration ? "*" : " ";
    const conf = d.confidence === "inferred" ? "?" : " ";
    const parent = d.parent ? `← v${String(d.parent).padStart(2, "0")}` : "";
    console.log(`${here} ${vtag(d.exploration, d.iteration).padEnd(28)} ${d.id} ${conf} [${d.type}] ${d.change} ${parent}`);
  }
  if (!ds.length) console.log("(no iterations yet)");
}

function cmdShow(args) {
  const s = state();
  const expl = resolveExploration(args, s);
  const n = parseV(args._[0]);
  const d = ddrForIteration(expl, n);
  if (!d) die(`no iteration ${vtag(expl, n)}`);
  console.log(JSON.stringify(d, null, 2));
}

function cmdDiff(args) {
  const s = state();
  const expl = resolveExploration(args, s);
  const a = vtag(expl, parseV(args._[0]));
  const b = args._[1] ? vtag(expl, parseV(args._[1])) : null;
  const flags = args.stat ? ["--stat"] : [];
  const out = b ? git(["diff", ...flags, a, b]) : git(["diff", ...flags, a]);
  console.log(out || "(no differences)");
}

function checkout(expl, n) {
  const dirty = gitRaw(["status", "--porcelain"]);
  if (dirty) die("working copy has uncommitted changes. Run `dm iterate` first, or discard with: git --git-dir=.design-recall/.git --work-tree=<mockups> checkout -- .");
  const tag = vtag(expl, n);
  if (!gitRaw(["rev-parse", "--verify", "--quiet", tag])) die("no such iteration: " + tag);
  git(["checkout", "-q", "--detach", tag]);
  git(["clean", "-qfd"]);
  const s = state();
  saveState({ current_exploration: expl, cursor: { exploration: expl, iteration: n } });
  console.log(JSON.stringify({ ok: true, at: tag, note: "working copy now shows " + tag + ". Iterating from here creates a new version whose parent is " + tag + "; nothing is lost." }, null, 2));
}
function cmdGoto(args) { const s = state(); checkout(resolveExploration(args, s), parseV(args._[0])); }
function cmdBack() {
  const s = state();
  if (!s.cursor) die("no cursor; nothing to go back from");
  const d = ddrForIteration(s.cursor.exploration, s.cursor.iteration);
  if (!d || !d.parent) die("already at the first iteration");
  checkout(s.cursor.exploration, d.parent);
}
function cmdForward() {
  const s = state();
  if (!s.cursor) die("no cursor");
  // child = iteration in same exploration whose parent is cursor; pick most recent
  const children = ddrsFor(s.cursor.exploration).filter((d) => d.parent === s.cursor.iteration && d.commit);
  if (!children.length) die("already at a tip (no later iteration branches from here)");
  checkout(s.cursor.exploration, children[children.length - 1].iteration);
}

function cmdRevert(args) {
  const s = state();
  const expl = resolveExploration(args, s);
  const n = parseV(args._[0]);
  const tag = vtag(expl, n);
  const dirty = gitRaw(["status", "--porcelain"]);
  if (dirty) die("working copy has uncommitted changes; run `dm iterate` first");
  // restore content of tag into working copy, then iterate as a new version
  const tip = maxIteration(expl);
  git(["checkout", "-q", "--detach", vtag(expl, tip)]);
  saveState({ current_exploration: expl, cursor: { exploration: expl, iteration: tip } });
  git(["checkout", "-q", tag, "--", "."]);
  // remove files that exist at tip but not at tag
  const tipFiles = new Set((git(["ls-tree", "-r", "--name-only", vtag(expl, tip)]) || "").split("\n").filter(Boolean));
  const tagFiles = new Set((git(["ls-tree", "-r", "--name-only", tag]) || "").split("\n").filter(Boolean));
  for (const f of tipFiles) if (!tagFiles.has(f)) fs.rmSync(path.join(mockupsDir(), f), { force: true });
  cmdIterate({ _: [], rejected: [], exploration: expl, type: "revert", change: `Reverted to ${tag}`, rationale: args.rationale || `Restored ${tag} as the current direction`, confidence: args.rationale ? "confirmed" : "inferred" });
  const d = allDdrs().filter((x) => x.exploration === expl).pop();
  d.reverted_to = n;
  writeJson(ddrPath(d.id), d);
}

function cmdFork(args) {
  const s = state();
  const srcExpl = resolveExploration(args, s);
  const n = parseV(args._[0]);
  const dst = args.as;
  if (!dst) die("--as <new-exploration> required");
  if (maxIteration(dst) > 0) die("exploration already exists: " + dst);
  const dirty = gitRaw(["status", "--porcelain"]);
  if (dirty) die("working copy has uncommitted changes; run `dm iterate` first");
  const srcTag = vtag(srcExpl, n);
  git(["checkout", "-q", "--detach", srcTag]);
  git(["clean", "-qfd"]);
  saveState({ current_exploration: dst, cursor: null });
  const change = `Forked from ${srcTag}`;
  cmdIterate({ _: [], rejected: [], exploration: dst, type: "fork", change, rationale: args.rationale || null, confidence: args.rationale ? "confirmed" : "inferred" });
  // annotate fork origin
  const d = allDdrs().filter((x) => x.exploration === dst).pop();
  d.forked_from = { exploration: srcExpl, iteration: n, commit: git(["rev-parse", "--short", srcTag]) };
  writeJson(ddrPath(d.id), d);
}

function cmdDdr(args) {
  const sub = args._[0];
  if (sub === "list") {
    let ds = allDdrs();
    if (args.exploration) ds = ds.filter((d) => d.exploration === args.exploration);
    if (args.pending) ds = ds.filter((d) => d.confidence === "inferred" && d.status === "active");
    if (args.json) return console.log(JSON.stringify(ds, null, 2));
    for (const d of ds) console.log(`${d.id}  ${vtag(d.exploration, d.iteration).padEnd(26)} ${d.confidence === "inferred" ? "?" : " "} ${d.change}${d.rationale ? " — " + d.rationale : ""}`);
    if (!ds.length) console.log("(none)");
    return;
  }
  if (sub === "confirm") {
    const d = findDdr(args._[1]);
    if (args.rationale) d.rationale = args.rationale;
    if (args.rejected.length) d.rejected = [...(d.rejected || []), ...args.rejected.map(parseRejected)];
    if (args.tags) { d.tacit_tags = [...new Set([...(d.tacit_tags || []), ...list(args.tags)])]; registerTags(d.tacit_tags); }
    if (!d.rationale) die("cannot confirm without a rationale (--rationale)");
    d.confidence = "confirmed";
    d.confirmed_at = now();
    writeJson(ddrPath(d.id), d);
    refreshViewer();
    return console.log(JSON.stringify({ ok: true, id: d.id, confidence: d.confidence }, null, 2));
  }
  if (sub === "edit") {
    const d = findDdr(args._[1]);
    for (const kv of args.set || []) {
      const [k, ...rest] = kv.split("=");
      let v = rest.join("=");
      if (["tacit_tags", "components"].includes(k)) v = list(v);
      if (k === "components") d.scope.components = v; else if (k === "page") d.scope.page = v; else d[k] = v;
    }
    if (d.tacit_tags) registerTags(d.tacit_tags);
    writeJson(ddrPath(d.id), d);
    refreshViewer();
    return console.log(JSON.stringify(d, null, 2));
  }
  die("ddr: list | confirm <id> | edit <id> --set k=v");
}

function cmdSnapshot() {
  fs.rmSync(SNAPSHOTS, { recursive: true, force: true });
  fs.mkdirSync(SNAPSHOTS, { recursive: true });
  const ds = allDdrs().filter((d) => d.commit);
  for (const d of ds) {
    const dest = path.join(SNAPSHOTS, d.exploration, `v${String(d.iteration).padStart(2, "0")}`);
    fs.mkdirSync(dest, { recursive: true });
    const tar = execFileSync("git", ["archive", "--format=tar", vtag(d.exploration, d.iteration)], { env: { ...process.env, GIT_DIR, GIT_WORK_TREE: mockupsDir() } });
    // cwd instead of -C: GNU tar (Git for Windows) reads "C:\..." as a remote host
    execFileSync("tar", ["-x"], { input: tar, cwd: dest });
  }
  console.log(JSON.stringify({ ok: true, snapshots: ds.length, dir: path.relative(ROOT, SNAPSHOTS) }, null, 2));
}

// ---------- viewer / extract / findings / spec ----------
const FINDINGS = path.join(DM, "findings.json");
function allFindings() { return readJson(FINDINGS, []); }
function saveFindings(f) { writeJson(FINDINGS, f); refreshViewer(); }
function currentVersion() {
  const s = state();
  return s.cursor || { exploration: s.current_exploration, iteration: null };
}
const VIEWER_FILE = path.join(DM, "viewer", "index.html");
function buildViewer() {
  const P = require("./principles");
  return require("./viewer").build({ ROOT, DM, SNAPSHOTS, decisions: allDdrs(), findings: allFindings(), principles: P.parse(P.readPrinciples({ ROOT })), snapshot: () => { const l = console.log; console.log = () => {}; cmdSnapshot(); console.log = l; } });
}
// Passive refresh: once the designer has built the viewer, keep it current after every recorded change.
function refreshViewer() {
  if (!fs.existsSync(VIEWER_FILE)) return;
  try { buildViewer(); } catch (e) { process.stderr.write("dm: viewer refresh failed: " + e.message + "\n"); }
}
function cmdViewer(args) {
  const file = buildViewer();
  console.log(JSON.stringify({ ok: true, viewer: path.relative(ROOT, file), open: "open " + path.relative(ROOT, file) + "   # or double-click it", live: "serve the project over http (e.g. VS Code Live Server) and the page reloads itself after each rebuild" }, null, 2));
  if (!args.watch) return;
  // --watch: rebuild when decisions, findings, principles or the mockups change (manual edits included)
  const targets = [DECISIONS, CONTEXT, mockupsDir(), FINDINGS].filter((t) => fs.existsSync(t));
  let timer = null;
  const kick = (what) => { clearTimeout(timer); timer = setTimeout(() => { try { buildViewer(); process.stderr.write("dm: viewer rebuilt (" + what + ")\n"); } catch (e) { process.stderr.write("dm: rebuild failed: " + e.message + "\n"); } }, 400); };
  for (const t of targets) {
    try { fs.watch(t, { recursive: fs.statSync(t).isDirectory() }, (ev, f) => { if (f && /viewer|snapshots|\.git/.test(f)) return; kick(f || path.basename(t)); }); }
    catch (e) { process.stderr.write("dm: cannot watch " + path.relative(ROOT, t) + ": " + e.message + "\n"); }
  }
  process.stderr.write("dm: watching " + targets.map((t) => path.relative(ROOT, t)).join(", ") + " — Ctrl+C to stop\n");
  setInterval(() => {}, 1 << 30);
}
function cmdExtract(args) {
  const model = require("./extract").extract({ mockupsDir: mockupsDir(), cfg: cfg() });
  const cur = currentVersion();
  model.version = cur;
  writeJson(path.join(DM, "model.json"), model);
  if (args.json) return console.log(JSON.stringify(model, null, 2));
  console.log(JSON.stringify({ ok: true, model: ".design-recall/model.json", ...model.summary, checks_by_severity: model.checks.reduce((m, c) => (m[c.severity] = (m[c.severity] || 0) + 1, m), {}) }, null, 2));
}
function cmdFindings(args) {
  const sub = args._[0];
  let all = allFindings();
  if (sub === "list") {
    if (args.open) all = all.filter((f) => f.status !== "resolved");
    if (args.agent) all = all.filter((f) => f.agent === args.agent);
    if (args.json) return console.log(JSON.stringify(all, null, 2));
    for (const f of all) console.log(`${f.id}  ${(f.severity || "").padEnd(6)} ${(f.agent || "").padEnd(20)} ${[f.page, f.component].filter(Boolean).join(" ").padEnd(30)} ${f.finding}${f.status === "resolved" ? "  [resolved]" : ""}`);
    if (!all.length) console.log("(none)");
    return;
  }
  if (sub === "add") {
    const inc = readJson(path.resolve(args.file || ""), null);
    if (!Array.isArray(inc)) die("--file must be a json array of findings");
    const cur = currentVersion();
    let n = all.reduce((m, f) => Math.max(m, parseInt(String(f.id).split("-")[1], 10) || 0), 0);
    const added = inc.map((f) => ({ id: "f-" + String(++n).padStart(4, "0"), ts: now(), exploration: f.exploration || cur.exploration, iteration: f.iteration ?? cur.iteration, agent: f.agent || "manual", severity: f.severity || "medium", page: f.page || null, component: f.component || null, state: f.state || null, finding: f.finding, suggestion: f.suggestion || null, status: "open" }));
    saveFindings([...all, ...added]);
    return console.log(JSON.stringify({ ok: true, added: added.map((f) => f.id) }, null, 2));
  }
  if (sub === "resolve") {
    const f = all.find((x) => x.id === args._[1]);
    if (!f) die("no such finding: " + args._[1]);
    f.status = "resolved"; f.resolved_at = now(); if (args.ddr) f.resolved_by = args.ddr;
    saveFindings(all);
    return console.log(JSON.stringify({ ok: true, id: f.id, resolved_by: f.resolved_by || null }, null, 2));
  }
  die("findings: list | add --file <json> | resolve <id> [--ddr <id>]");
}
function cmdSpec(args) {
  const kind = args._[0];
  if (!["prd", "arch"].includes(kind)) die("spec: prd | arch");
  const modelPath = path.join(DM, "model.json");
  let model = readJson(modelPath, null);
  if (!model) { const l = console.log; console.log = () => {}; cmdExtract({}); console.log = l; model = readJson(modelPath, null); }
  const file = require("./spec").gen(kind, { ROOT, DM, model, decisions: allDdrs(), findings: allFindings(), cfg: cfg() });
  console.log(JSON.stringify({ ok: true, file: path.relative(ROOT, file), note: "skeleton written; sections marked <!-- claude: --> need narrative" }, null, 2));
}

function cmdPrinciples(args) {
  const P = require("./principles");
  const ctx = { ROOT, decisions: allDdrs(), state, saveState };
  if (args.check) return console.log(JSON.stringify(P.check(ctx), null, 2));
  if (args.mark) { const run = P.mark(ctx); refreshViewer(); return console.log(JSON.stringify({ ok: true, principles_last_run: run }, null, 2)); }
  const pack = P.digest(ctx);
  if (args.json) return console.log(JSON.stringify(pack, null, 2));
  console.log(P.digestMarkdown(pack));
  console.log(`\n(file: ${path.relative(ROOT, P.principlesPath(ctx))} — ${pack.existing_file ? "exists" : "not yet written"}. Schema: .design-recall/docs/principles-schema.md)`);
}

// ---------- dispatch ----------
const argv = process.argv.slice(2);
const cmd = argv[0];
const args = parseArgs(argv.slice(1));
const commands = {
  init: cmdInit, status: cmdStatus, iterate: cmdIterate, log: cmdLog, show: cmdShow, diff: cmdDiff,
  back: cmdBack, forward: cmdForward, goto: cmdGoto, revert: cmdRevert, fork: cmdFork, ddr: cmdDdr, snapshot: cmdSnapshot,
  viewer: cmdViewer, extract: cmdExtract, findings: cmdFindings, spec: cmdSpec, principles: cmdPrinciples,
};
if (!cmd || cmd === "help" || cmd === "--help") {
  console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("\n").slice(2).map((l) => l.replace(/^ \* ?/, "")).join("\n"));
  process.exit(0);
}
if (!commands[cmd]) die("unknown command: " + cmd + " (try: dm help)");
commands[cmd](args);
