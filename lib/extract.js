// dm extract — builds .design/model.json: pages, flows, components, states, forms, nav graph,
// implied data model (from mock-data.js), plus mechanical checks. Zero dependencies.
// The critique agents and the spec generators read this instead of raw HTML.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function extract(ctx) {
  const { mockupsDir, cfg } = ctx;
  const conv = cfg.conventions || {};
  const A = { comp: conv.component_attr || "data-component", state: conv.state_attr || "data-state", flow: conv.flow_attr || "data-flow" };
  const files = walk(mockupsDir).filter((f) => !f.includes("node_modules"));
  const html = files.filter((f) => f.endsWith(".html")).sort();
  const pages = html.map((f) => parsePage(fs.readFileSync(path.join(mockupsDir, f), "utf8"), f, A));
  const components = mergeComponents(pages);
  const flows = {};
  for (const p of pages) { const fl = p.flow || "(none)"; (flows[fl] = flows[fl] || []).push(p.file); }
  const nav = pages.flatMap((p) => p.links.map((l) => ({ from: p.file, to: l.target, via: l.text, kind: l.kind })));
  const pageSet = new Set(html);
  const data = readMockData(mockupsDir);
  const checks = runChecks({ pages, components, nav, pageSet, data });
  const model = {
    generated: new Date().toISOString(),
    files, pages, flows, components, nav, data_model: data, checks,
    summary: { pages: pages.length, components: Object.keys(components).length, forms: pages.reduce((n, p) => n + p.forms.length, 0), findings: checks.length },
  };
  return model;
}

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p, base)); else out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}

// ---- tiny tag scanner: enough for attributes + text, no DOM tree needed ----
const TAG = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
const ATTR = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
function attrs(s) {
  const o = {};
  for (const m of s.matchAll(ATTR)) o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return o;
}
function stripTags(s) { return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function textAfter(src, idx, tag) {
  const close = src.indexOf("</" + tag, idx);
  return close < 0 ? "" : stripTags(src.slice(idx, close)).slice(0, 80);
}

function parsePage(src, file, A) {
  const body = src.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const page = { file, title: (src.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim() || null, flow: null,
    components: [], forms: [], links: [], buttons: [], headings: [], images: [], requires: [], lang: (src.match(/<html[^>]*\blang=["']?([\w-]+)/i) || [])[1] || null,
    hidden_state_variants: 0, inline_scripts: (src.match(/<script(?![^>]*src=)[^>]*>/gi) || []).length };
  const formStack = []; // {form, depth}
  let depth = 0;
  for (const m of body.matchAll(TAG)) {
    const [, closing, rawTag, rawAttrs, selfClose] = m; const tag = rawTag.toLowerCase();
    if (closing) { depth--; if (formStack.length && formStack[formStack.length - 1].depth === depth) page.forms.push(formStack.pop().form); continue; }
    const a = attrs(rawAttrs);
    const idx = m.index + m[0].length;
    if (a[A.flow] && !page.flow) page.flow = a[A.flow];
    if (a[A.comp]) {
      page.components.push({ name: a[A.comp], tag, state: a[A.state] || "default", hidden: "hidden" in a, requires: a["data-requires"] || null, id: a.id || null });
      if ("hidden" in a) page.hidden_state_variants++;
    }
    if (a["data-requires"]) page.requires.push({ requires: a["data-requires"], on: a[A.comp] || tag });
    if (tag === "form") formStack.push({ depth, form: { id: a.id || null, name: a.name || null, action: a.action || null, method: (a.method || "get").toLowerCase(), component: a[A.comp] || null, fields: [], submit: null } });
    if (["input", "select", "textarea"].includes(tag)) {
      const f = { tag, type: tag === "input" ? (a.type || "text") : tag, name: a.name || a.id || null, required: "required" in a, maxlength: a.maxlength ? +a.maxlength : null, minlength: a.minlength ? +a.minlength : null, pattern: a.pattern || null, placeholder: a.placeholder || null, labelled: !!(a.id && new RegExp('for=["\']?' + escRe(a.id)).test(body)) || !!a["aria-label"] || !!a["aria-labelledby"], component: a[A.comp] || null };
      if (a.type === "submit") { if (formStack.length) formStack[formStack.length - 1].form.submit = a.value || "Submit"; }
      else if (formStack.length) formStack[formStack.length - 1].form.fields.push(f); else page.forms.push({ id: null, orphan: true, fields: [f], method: null, submit: null });
    }
    if (tag === "a" || a["data-nav"]) {
      let href = a["data-nav"] || a.href || "";
      if (a["data-nav"] && href !== "back" && !/\.html?$/.test(href)) href += ".html";
      const kind = a["data-nav"] ? "nav" : /^(https?:)?\/\//.test(href) ? "external" : href.startsWith("#") || href === "" ? "anchor" : href.startsWith("javascript") ? "js" : "page";
      page.links.push({ target: href, text: textAfter(body, idx, tag) || a["aria-label"] || null, kind, component: a[A.comp] || null });
    }
    if (tag === "button" || (tag === "input" && ["button", "submit"].includes(a.type))) {
      const text = tag === "button" ? textAfter(body, idx, "button") : a.value || "";
      page.buttons.push({ text: text || a["aria-label"] || null, type: a.type || (tag === "button" ? "button" : a.type), nav: a["data-nav"] || null, onclick: !!a.onclick, component: a[A.comp] || null, disabled: "disabled" in a });
      if (tag === "button" && (a.type || "submit") === "submit" && formStack.length) formStack[formStack.length - 1].form.submit = text;
    }
    if (/^h[1-6]$/.test(tag)) page.headings.push({ level: +tag[1], text: textAfter(body, idx, tag) });
    if (tag === "img") page.images.push({ src: a.src || null, alt: a.alt ?? null });
    if (!selfClose && !VOID.has(tag)) depth++;
  }
  while (formStack.length) page.forms.push(formStack.pop().form);
  return page;
}
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function mergeComponents(pages) {
  const c = {};
  for (const p of pages) for (const x of p.components) {
    const e = (c[x.name] = c[x.name] || { name: x.name, pages: [], states: [], requires: [], instances: 0 });
    e.instances++;
    if (!e.pages.includes(p.file)) e.pages.push(p.file);
    if (!e.states.includes(x.state)) e.states.push(x.state);
    if (x.requires && !e.requires.includes(x.requires)) e.requires.push(x.requires);
  }
  return c;
}

function readMockData(dir) {
  const f = path.join(dir, "mock-data.js");
  if (!fs.existsSync(f)) return { present: false, entities: {}, note: "mock-data.js not found" };
  const sandbox = { window: {}, console: { log() {} }, document: {} };
  try { vm.runInNewContext(fs.readFileSync(f, "utf8"), sandbox, { timeout: 500 }); } catch (e) { return { present: true, error: String(e.message), entities: {} }; }
  const MOCK = sandbox.window.MOCK || sandbox.MOCK || {};
  const entities = {};
  for (const [k, v] of Object.entries(MOCK)) entities[k] = shape(v);
  return { present: true, entities };
}
function shape(v, depth = 0) {
  if (Array.isArray(v)) return { type: "array", count: v.length, item: v.length ? shape(v[0], depth + 1) : "unknown" };
  if (v === null) return "null";
  if (typeof v === "object") { if (depth > 4) return "object"; const o = {}; for (const [k, x] of Object.entries(v)) o[k] = shape(x, depth + 1); return o; }
  if (typeof v === "string") { if (/^\d{4}-\d{2}-\d{2}/.test(v)) return "date"; if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(v)) return "email"; if (/^https?:\/\//.test(v)) return "url"; return "string"; }
  return typeof v;
}

// ---- mechanical checks: cheap, deterministic, always run. Agents add judgement on top. ----
function runChecks({ pages, components, nav, pageSet, data }) {
  const out = [];
  const add = (severity, check, page, component, detail) => out.push({ severity, check, page, component, detail });
  for (const c of Object.values(components)) {
    const has = (s) => c.states.includes(s);
    const interactive = c.pages.some((pf) => { const p = pages.find((x) => x.file === pf); return p.forms.some((f) => f.component === c.name || f.fields.some((x) => x.component === c.name)) || p.buttons.some((b) => b.component === c.name); });
    if (!has("empty") && /(List|Table|Grid|Feed|Results|History|Inbox|Items|Summary)$/.test(c.name)) add("medium", "missing-empty-state", null, c.name, "Looks like a collection but has no data-state=\"empty\" variant");
    if (!has("loading") && /(List|Table|Grid|Results|Feed|Summary|Profile|Dashboard)$/.test(c.name)) add("low", "missing-loading-state", null, c.name, "No data-state=\"loading\" variant");
    if (interactive && !has("error")) add("medium", "missing-error-state", null, c.name, "Interactive component with no data-state=\"error\" variant");
  }
  for (const p of pages) {
    if (!p.flow) add("low", "missing-flow", p.file, null, "No data-flow on this page; it won't be grouped into a journey in the PRD");
    if (!p.title) add("low", "missing-title", p.file, null, "No <title>");
    if (!p.headings.some((h) => h.level === 1)) add("low", "missing-h1", p.file, null, "No <h1>");
    for (const img of p.images) if (img.alt === null) add("low", "img-missing-alt", p.file, null, `<img src="${img.src}"> has no alt`);
    for (const f of p.forms) {
      if (f.orphan) continue;
      if (!f.submit && f.fields.length) add("medium", "form-no-submit", p.file, f.component, `Form ${f.id || ""} has ${f.fields.length} field(s) but no submit control`);
      for (const x of f.fields) {
        if (!x.labelled) add("medium", "field-unlabelled", p.file, f.component, `${x.type} field "${x.name || "(unnamed)"}" has no <label for>/aria-label`);
        if (!x.name) add("low", "field-unnamed", p.file, f.component, `${x.type} field has no name — data model can't be inferred`);
        if (["text", "textarea", "email", "search"].includes(x.type) && !x.maxlength) add("low", "field-no-maxlength", p.file, f.component, `"${x.name}" has no maxlength — long-input behaviour undefined`);
      }
    }
    for (const l of p.links) {
      if (l.kind === "page" || l.kind === "nav") {
        const t = l.target.split("#")[0].split("?")[0];
        if (t && t !== "back" && !pageSet.has(t)) add("high", "dead-link", p.file, l.component, `"${l.text || l.target}" points to ${t}, which doesn't exist`);
      }
      if (l.kind === "anchor" && (l.target === "#" || l.target === "")) add("medium", "placeholder-link", p.file, l.component, `"${l.text || "(no text)"}" is href="#" — destination undefined`);
    }
    for (const b of p.buttons) if (!b.nav && !b.onclick && b.type !== "submit") add("low", "inert-button", p.file, b.component, `Button "${b.text || "(no text)"}" has no data-nav, onclick or form — what happens on click?`);
    if (p.inline_scripts) add("low", "inline-script", p.file, null, `${p.inline_scripts} inline <script> block(s); logic should live in app.js / mock-data.js`);
  }
  // pages nothing links to (except index)
  const targets = new Set(nav.filter((n) => n.kind === "page" || n.kind === "nav").map((n) => n.to.split("#")[0]));
  for (const p of pages) if (p.file !== "index.html" && !targets.has(p.file)) add("medium", "orphan-page", p.file, null, "No other page links here — unreachable in the flow");
  if (!data.present) add("medium", "no-mock-data", null, null, "mock-data.js missing; data model can't be inferred for the solution architecture");
  return out;
}

module.exports = { extract };
