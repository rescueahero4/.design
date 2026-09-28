// dm principles — the tacit-knowledge layer.
//   digest(ctx)  → compact evidence pack for Claude to distil into .design/context/design-principles.md
//   check(ctx)   → mechanical drift: later decisions that re-introduce something earlier rejected,
//                  and decisions that contradict a recorded principle's tags without citing an exception
//   parse(md)    → principles file → structured list (used by viewer + check)
//   mark(ctx)    → record that principles were (re)written against the current DDR count
const fs = require("fs");
const path = require("path");

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "than", "then", "when", "over", "under", "above", "below", "user", "users", "page", "button", "make", "made", "move", "moved", "add", "added", "use", "used", "more", "less", "just", "also", "very", "about", "after", "before", "because", "keep", "kept", "same", "have", "has", "was", "were", "will", "would", "should", "could"]);
const tokens = (s) => new Set(String(s || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)));
const overlap = (a, b) => [...a].filter((w) => b.has(w));

function principlesPath(ctx) { return path.join(ctx.ROOT, ".design", "context", "design-principles.md"); }
function readPrinciples(ctx) { try { return fs.readFileSync(principlesPath(ctx), "utf8"); } catch { return null; } }

// ---- parse the markdown principles file ----
// Format (see docs/principles-schema.md):
// ## P3 — Title
// - Statement: …
// - Evidence: ddr-0004, ddr-0011
// - Exceptions: ddr-0030 (why)
// - Tags: hierarchy, mobile-viewport
// - Kind: personal | project
function parse(md) {
  if (!md) return [];
  const out = [];
  const blocks = md.split(/^## +/m).slice(1);
  for (const b of blocks) {
    const [head, ...rest] = b.split("\n");
    const m = head.match(/^(P\d+)\s*[—\-–:]\s*(.+)$/);
    if (!m) continue;
    const p = { id: m[1], title: m[2].trim(), statement: "", evidence: [], exceptions: [], tags: [], kind: null, retired: /\[retired\]/i.test(head) };
    for (const line of rest) {
      const f = line.match(/^\s*[-*]\s*(\w+)\s*:\s*(.*)$/);
      if (!f) continue;
      const [, k, v] = f; const key = k.toLowerCase();
      if (key === "statement") p.statement = v.trim();
      else if (key === "evidence") p.evidence = v.match(/ddr-\d+/g) || [];
      else if (key === "exceptions") p.exceptions = v.match(/ddr-\d+/g) || [];
      else if (key === "tags") p.tags = v.split(",").map((s) => s.trim()).filter(Boolean);
      else if (key === "kind") p.kind = v.trim();
    }
    out.push(p);
  }
  return out;
}

// ---- digest: what Claude reads before writing principles ----
function digest(ctx) {
  const { decisions } = ctx;
  const confirmed = decisions.filter((d) => d.confidence === "confirmed" && d.status !== "reverted");
  const inferred = decisions.filter((d) => d.confidence === "inferred" && d.status === "active");
  const tagCount = {};
  for (const d of confirmed) for (const t of d.tacit_tags || []) tagCount[t] = (tagCount[t] || 0) + 1;
  const rejected = confirmed.flatMap((d) => (d.rejected || []).map((r) => ({ ddr: d.id, option: r.option, why: r.why })));
  const byTag = {};
  for (const d of confirmed) for (const t of d.tacit_tags || []) (byTag[t] = byTag[t] || []).push(d.id);
  const existing = readPrinciples(ctx);
  const s = ctx.state();
  const last = s.principles_last_run || null;
  const pack = {
    generated: new Date().toISOString(),
    counts: { confirmed: confirmed.length, inferred_pending: inferred.length, since_last_run: last ? confirmed.length - last.confirmed : confirmed.length },
    tags: Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([tag, n]) => ({ tag, n, ddrs: byTag[tag] })),
    rejected,
    decisions: confirmed.map((d) => ({ id: d.id, v: `${d.exploration}/v${String(d.iteration).padStart(2, "0")}`, trigger: d.trigger, page: d.scope?.page, components: d.scope?.components, change: d.change, rationale: d.rationale, rejected: d.rejected, tags: d.tacit_tags, said: d.source_prompt })),
    existing_principles: parse(existing),
    existing_file: existing,
  };
  return pack;
}

function digestMarkdown(pack) {
  let s = `# Principles digest — ${pack.counts.confirmed} confirmed decisions (${pack.counts.since_last_run} new since last run), ${pack.counts.inferred_pending} still inferred\n\n`;
  s += `## Concerns by frequency\n` + pack.tags.map((t) => `- **${t.tag}** ×${t.n} — ${t.ddrs.join(", ")}`).join("\n") + "\n\n";
  if (pack.rejected.length) s += `## Rejected options (what the designer said no to)\n` + pack.rejected.map((r) => `- ${r.option}${r.why ? ` — ${r.why}` : ""} (${r.ddr})`).join("\n") + "\n\n";
  s += `## Decisions\n` + pack.decisions.map((d) => `- **${d.id}** ${d.v}${d.trigger !== "designer" ? ` [${d.trigger}]` : ""} · ${d.change}\n  - why: ${d.rationale}${d.tags?.length ? `\n  - tags: ${d.tags.join(", ")}` : ""}${d.said ? `\n  - said: "${d.said}"` : ""}`).join("\n") + "\n\n";
  if (pack.existing_principles.length) s += `## Existing principles (${pack.existing_principles.length}) — update, don't restart\n` + pack.existing_principles.map((p) => `- ${p.id} ${p.title}${p.retired ? " [retired]" : ""} — evidence ${p.evidence.length}, exceptions ${p.exceptions.length}`).join("\n") + "\n";
  else s += `## No principles file yet — write the first one\n`;
  return s;
}

// ---- check: mechanical drift ----
function check(ctx) {
  const { decisions } = ctx;
  const active = decisions.filter((d) => d.status !== "reverted").sort((a, b) => a.id.localeCompare(b.id));
  const findings = [];
  // 1. rejected-then-reintroduced
  for (const a of active) {
    for (const r of a.rejected || []) {
      const rt = tokens(r.option);
      if (!rt.size) continue;
      for (const b of active) {
        if (b.id <= a.id) continue;
        const bt = new Set([...tokens(b.change), ...tokens(b.rationale)]);
        const hit = overlap(rt, bt);
        const cites = new RegExp(a.id).test((b.rationale || "") + (b.source_prompt || ""));
        if (hit.length >= Math.min(2, rt.size) && !cites) findings.push({ kind: "rejected-reintroduced", severity: "medium", ddr: b.id, against: a.id, detail: `${b.id} "${b.change}" looks like "${r.option}", which ${a.id} rejected${r.why ? ` (${r.why})` : ""}. If intentional, cite ${a.id} in the rationale or add an exception to the principle.` });
      }
    }
  }
  // 2. decisions tagged with a principle's concern but not in its evidence/exceptions
  const principles = parse(readPrinciples(ctx));
  for (const p of principles.filter((x) => !x.retired && x.tags.length)) {
    const known = new Set([...p.evidence, ...p.exceptions]);
    for (const d of active.filter((x) => x.confidence === "confirmed")) {
      if ((d.tacit_tags || []).some((t) => p.tags.includes(t)) && !known.has(d.id)) findings.push({ kind: "unclassified-evidence", severity: "low", ddr: d.id, against: p.id, detail: `${d.id} is tagged ${d.tacit_tags.filter((t) => p.tags.includes(t)).join("/")} but ${p.id} "${p.title}" lists it as neither evidence nor exception. Re-run principles.` });
    }
  }
  // 3. principles citing DDRs that no longer exist or were reverted
  const ids = new Set(active.map((d) => d.id));
  for (const p of principles) for (const id of [...p.evidence, ...p.exceptions]) if (!ids.has(id)) findings.push({ kind: "dangling-evidence", severity: "low", ddr: id, against: p.id, detail: `${p.id} cites ${id}, which is missing or reverted.` });
  return { principles: principles.length, findings };
}

function mark(ctx) {
  const s = ctx.state();
  const confirmed = ctx.decisions.filter((d) => d.confidence === "confirmed" && d.status !== "reverted").length;
  s.principles_last_run = { ts: new Date().toISOString(), confirmed };
  ctx.saveState(s);
  return s.principles_last_run;
}

module.exports = { digest, digestMarkdown, check, parse, mark, readPrinciples, principlesPath };
