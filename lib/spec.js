// dm spec prd|arch — writes .design-recall/specs/PRD.md and SOLUTION-ARCHITECTURE.md skeletons from
// model.json + DDRs + findings. Mechanical facts only; every claim is traceable. Claude then
// enriches the narrative sections (marked <!-- claude: ... -->) following the design-spec skill.
const fs = require("fs");
const path = require("path");

function gen(kind, ctx) {
  const { DM, model, decisions, findings, cfg, ROOT } = ctx;
  const out = path.join(DM, "specs");
  fs.mkdirSync(out, { recursive: true });
  const ddrs = decisions.filter((d) => d.status === "active");
  const confirmed = ddrs.filter((d) => d.confidence === "confirmed");
  const inferred = ddrs.filter((d) => d.confidence === "inferred");
  const open = findings.filter((f) => f.status !== "resolved");
  const tc = readIf(path.join(ROOT, cfg.tech_constraints || ".design-recall/context/tech-constraints.md"));
  const md = kind === "prd" ? prd({ model, ddrs, confirmed, inferred, open }) : arch({ model, ddrs, confirmed, inferred, open, tc });
  const file = path.join(out, kind === "prd" ? "PRD.md" : "SOLUTION-ARCHITECTURE.md");
  fs.writeFileSync(file, md);
  return file;
}
function readIf(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }
const H = (n, s) => "\n" + "#".repeat(n) + " " + s + "\n\n";
const req = (d) => `- **[${d.confidence === "confirmed" ? "decided" : "inferred"} · ${d.id}]** ${d.change}${d.rationale ? ` — *${d.rationale}*` : ""}`;
const today = () => new Date().toISOString().slice(0, 10);

function prd({ model, ddrs, confirmed, inferred, open }) {
  let s = `# PRD — <!-- claude: product/feature name -->\n\n_Generated ${today()} from .design-recall/ · ${model.summary.pages} pages · ${Object.keys(model.components).length} components · ${confirmed.length} decided / ${inferred.length} inferred decisions · ${open.length} open findings_\n\n> Legend: **decided** = designer confirmed the rationale (DDR). **inferred** = agent-inferred, treat as a proposal until confirmed. Every requirement cites its DDR so it can be traced back to the iteration and the mockup diff.\n`;
  s += H(2, "1. Problem & goals") + "<!-- claude: 3–6 sentences. Use DDR rationales and source_prompts as evidence; do not invent user research. -->\n";
  s += H(2, "2. User journeys");
  for (const [flow, pages] of Object.entries(model.flows).map(([f, ps]) => [f, [...ps].sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : 0))])) {
    s += H(3, `Flow: ${flow}`);
    s += pages.map((p) => { const pg = model.pages.find((x) => x.file === p); return `- \`${p}\`${pg.title ? ` — ${pg.title}` : ""}`; }).join("\n") + "\n\n";
    const steps = model.nav.filter((n) => pages.includes(n.from) && (n.kind === "page" || n.kind === "nav")).map((n) => `${n.from} → ${n.to}${n.via ? ` ("${n.via}")` : ""}`);
    if (steps.length) s += "Navigation:\n" + steps.map((x) => "- " + x).join("\n") + "\n\n";
    s += "<!-- claude: narrate the happy path in 3–5 steps, then list unhappy paths from findings tagged unhappy-path-agent for these pages -->\n";
  }
  s += H(2, "3. Requirements by screen");
  for (const p of model.pages) {
    s += H(3, `\`${p.file}\`${p.title ? ` — ${p.title}` : ""}`);
    const comps = [...new Set(p.components.map((c) => c.name))];
    if (comps.length) s += "Components: " + comps.map((c) => `\`${c}\``).join(", ") + "\n\n";
    const mine = ddrs.filter((d) => d.scope.page && (p.file.startsWith(d.scope.page) || p.flow === d.scope.page) || (d.scope.files || []).includes(p.file));
    if (mine.length) s += "Decisions:\n" + mine.map(req).join("\n") + "\n\n";
    for (const f of p.forms.filter((f) => !f.orphan)) {
      s += `Form${f.id ? ` \`${f.id}\`` : ""}${f.submit ? ` (submit: "${f.submit}")` : ""}:\n\n| Field | Type | Required | Constraints |\n|---|---|---|---|\n`;
      s += f.fields.map((x) => `| ${x.name || "—"} | ${x.type} | ${x.required ? "yes" : "no"} | ${[x.maxlength && `max ${x.maxlength}`, x.minlength && `min ${x.minlength}`, x.pattern && `pattern \`${x.pattern}\``].filter(Boolean).join(", ") || "—"} |`).join("\n") + "\n\n";
      s += "Acceptance criteria: <!-- claude: one per field constraint + submit success/failure; cite findings -->\n\n";
    }
    const states = p.components.reduce((m, c) => { (m[c.name] = m[c.name] || new Set()).add(c.state); return m; }, {});
    const st = Object.entries(states).map(([n, set]) => `\`${n}\`: ${[...set].join(", ")}`).join("; ");
    if (st) s += "States present in mockup: " + st + "\n\n";
    if (p.requires.length) s += "Access: " + p.requires.map((r) => `\`${r.requires}\` on ${r.on}`).join(", ") + "\n\n";
  }
  s += H(2, "4. Decision log (all)") + ddrs.map((d) => `${req(d)}${d.rejected?.length ? `\n  - rejected: ${d.rejected.map((r) => r.option + (r.why ? ` (${r.why})` : "")).join("; ")}` : ""}${d.tacit_tags?.length ? `\n  - concerns: ${d.tacit_tags.join(", ")}` : ""}`).join("\n") + "\n";
  s += H(2, "5. Open questions") + (open.length ? open.map((f) => `- [ ] **${f.severity}** ${f.page ? `\`${f.page}\`` : ""} ${f.component ? `\`${f.component}\`` : ""}: ${f.finding}${f.suggestion ? ` → _${f.suggestion}_` : ""} _(${f.agent || f.check})_`).join("\n") : "_none recorded — run the critique skill_") + "\n";
  if (inferred.length) s += "\nInferred decisions needing designer confirmation: " + inferred.map((d) => d.id).join(", ") + " (`dm ddr list --pending`)\n";
  s += H(2, "6. Out of scope / non-goals") + "<!-- claude: derive from rejected alternatives and parked explorations; do not invent -->\n";
  return s;
}

function arch({ model, ddrs, confirmed, inferred, open, tc }) {
  let s = `# Solution architecture — <!-- claude: product/feature name -->\n\n_Generated ${today()} from .design-recall/ · derived from mockup DOM, mock-data.js and ${ddrs.length} DDRs_\n\n> Everything below is **implied by the mockups**, not decided by engineering. Treat as the design's contract with engineering: what the UI needs, in eng terms. Constraints section is engineering's input.\n`;
  s += H(2, "1. Routes / screens") + "| Route | File | Flow | Title | Access |\n|---|---|---|---|---|\n" + model.pages.map((p) => `| /${p.file.replace(/\.html$/, "").replace(/^index$/, "")} | \`${p.file}\` | ${p.flow || "—"} | ${p.title || "—"} | ${p.requires.map((r) => r.requires).join(", ") || "public"} |`).join("\n") + "\n";
  s += H(2, "2. Navigation graph") + "```mermaid\nflowchart LR\n" + model.nav.filter((n) => n.kind === "page" || n.kind === "nav").map((n) => `  ${id(n.from)} -->|${(n.via || "").replace(/[|"]/g, "")}| ${id(n.to)}`).join("\n") + "\n```\n";
  s += H(2, "3. Component inventory") + "| Component | Instances | Pages | States in mockup | Missing states (checks) | Gating |\n|---|---|---|---|---|---|\n";
  const missing = (n) => model.checks.filter((c) => c.component === n && c.check.startsWith("missing-")).map((c) => c.check.replace("missing-", "").replace("-state", "")).join(", ") || "—";
  s += Object.values(model.components).map((c) => `| \`${c.name}\` | ${c.instances} | ${c.pages.join(", ")} | ${c.states.join(", ")} | ${missing(c.name)} | ${c.requires.join(", ") || "—"} |`).join("\n") + "\n";
  s += "\n<!-- claude: map each component to an existing design-system component from tech-constraints.md, or mark as new -->\n";
  s += H(2, "4. Data model (implied by mock-data.js)");
  if (model.data_model.present && Object.keys(model.data_model.entities).length) {
    s += "```json\n" + JSON.stringify(model.data_model.entities, null, 2) + "\n```\n<!-- claude: turn into entities + relations; flag fields the UI displays but mock data lacks, and vice versa -->\n";
  } else s += "_No mock data found. Add `mock-data.js` exposing `window.MOCK` shaped like real data._\n";
  s += H(2, "5. Inputs & API surface (implied)");
  const forms = model.pages.flatMap((p) => p.forms.filter((f) => !f.orphan).map((f) => ({ page: p.file, ...f })));
  s += forms.length ? "| Screen | Form | Method | Fields | Submit |\n|---|---|---|---|---|\n" + forms.map((f) => `| \`${f.page}\` | ${f.id || f.component || "—"} | ${f.method.toUpperCase()} | ${f.fields.map((x) => `${x.name || "?"}:${x.type}${x.required ? "*" : ""}`).join(", ")} | ${f.submit || "—"} |`).join("\n") + "\n" : "_No forms in mockups._\n";
  s += "\n<!-- claude: propose one endpoint per form + one read endpoint per data entity a screen renders; note auth from Access column -->\n";
  s += H(2, "6. Design decisions with engineering impact") + (confirmed.filter((d) => d.tacit_tags?.some((t) => /feasib|perform|mobile|access|offline|latency/.test(t)) || d.trigger === "feasibility-agent").map(req).join("\n") || "_none tagged yet_") + "\n";
  s += H(2, "7. Constraints (from engineering)") + (tc && tc.trim().split("\n").filter((l) => l && !l.startsWith("#")).length > 3 ? tc : "_`.design-recall/context/tech-constraints.md` is still the template — fill it in with engineering._") + "\n";
  s += H(2, "8. Feasibility flags & open technical questions") + (open.filter((f) => f.agent === "feasibility-agent" || f.severity === "high").map((f) => `- [ ] **${f.severity}** ${f.page ? `\`${f.page}\`` : ""} ${f.component ? `\`${f.component}\`` : ""}: ${f.finding}${f.suggestion ? ` → _${f.suggestion}_` : ""}`).join("\n") || "_none — run the critique skill with the feasibility agent_") + "\n";
  s += H(2, "9. Mechanical checks (from `dm extract`)") + (model.checks.length ? model.checks.map((c) => `- ${c.severity} · ${c.check} · ${c.page || ""} ${c.component || ""} — ${c.detail}`).join("\n") : "_clean_") + "\n";
  return s;
}
function id(f) { return f.replace(/[^\w]/g, "_"); }

module.exports = { gen };
