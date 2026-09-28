// dm viewer — builds .design-recall/viewer/index.html (single static file, data inlined).
// Usage from dm.js: require("./viewer").build({ ROOT, DM, SNAPSHOTS, decisions, findings, snapshot })
const fs = require("fs");
const path = require("path");

function build(ctx) {
  const { DM, SNAPSHOTS, decisions, findings, snapshot, principles = [] } = ctx;
  snapshot(); // refresh extracted versions
  const versions = decisions.filter((d) => d.commit).map((d) => {
    const dir = path.join(SNAPSHOTS, d.exploration, "v" + String(d.iteration).padStart(2, "0"));
    const pages = fs.existsSync(dir) ? walk(dir).filter((f) => f.endsWith(".html")).sort() : [];
    return { ...d, pages };
  });
  const data = { generated: new Date().toISOString(), versions, findings, principles, explorations: [...new Set(versions.map((v) => v.exploration))] };
  const out = path.join(DM, "viewer");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "index.html"), HTML.replace("/*__DATA__*/", "const DATA = " + JSON.stringify(data) + ";"));
  return path.join(out, "index.html");
}
function walk(dir, base = dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p, base)); else out.push(path.relative(base, p));
  }
  return out;
}

const HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>.design-recall viewer</title>
<style>
:root{--bg:#fff;--fg:#1a1a1a;--mut:#6b7280;--line:#e5e7eb;--acc:#2563eb;--warn:#d97706;--ok:#059669;--panel:#f9fafb;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:var(--fg)}
@media(prefers-color-scheme:dark){:root{--bg:#111;--fg:#eee;--mut:#9ca3af;--line:#2a2a2a;--panel:#181818;--acc:#60a5fa}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);height:100vh;display:grid;grid-template-rows:auto 1fr;grid-template-columns:300px 1fr 340px}
header{grid-column:1/-1;display:flex;gap:12px;align-items:center;padding:8px 14px;border-bottom:1px solid var(--line)}
header h1{font-size:15px;margin:0 8px 0 0}select,button,input{font:inherit;padding:4px 8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg)}
button.on{background:var(--acc);color:#fff;border-color:var(--acc)}
aside{overflow:auto;border-right:1px solid var(--line);padding:10px}aside.r{border-right:0;border-left:1px solid var(--line)}
main{display:flex;flex-direction:column;min-width:0}
.pages{display:flex;gap:6px;padding:6px 10px;border-bottom:1px solid var(--line);overflow:auto}
.pages button{white-space:nowrap}
.frames{flex:1;display:flex;gap:2px;background:var(--line)}
.frames iframe{flex:1;border:0;background:#fff;width:100%;height:100%}
.tree{position:relative}
.node{display:flex;gap:8px;align-items:flex-start;padding:6px 8px;border-radius:6px;cursor:pointer;margin-left:calc(var(--depth)*14px)}
.node:hover{background:var(--panel)}.node.sel{outline:2px solid var(--acc)}.node.cmp{outline:2px dashed var(--warn)}
.v{font-family:ui-monospace,monospace;font-size:12px;color:var(--mut);min-width:34px}
.t{font-size:13px}.t small{display:block;color:var(--mut)}
.badge{font-size:10px;padding:1px 5px;border-radius:4px;background:var(--panel);border:1px solid var(--line);color:var(--mut)}
.badge.inf{color:var(--warn);border-color:var(--warn)}.badge.conf{color:var(--ok);border-color:var(--ok)}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);margin:14px 0 6px}
dl{margin:0}dt{color:var(--mut);font-size:11px;margin-top:8px}dd{margin:2px 0 0}
.tag{display:inline-block;font-size:11px;padding:1px 6px;border-radius:10px;background:var(--panel);border:1px solid var(--line);margin:2px 2px 0 0;cursor:pointer}
.tag.on{background:var(--acc);color:#fff;border-color:var(--acc)}
pre{white-space:pre-wrap;background:var(--panel);padding:8px;border-radius:6px;font-size:12px}
.f{border-left:3px solid var(--line);padding:4px 8px;margin:6px 0;font-size:12px}.f.high{border-color:#dc2626}.f.medium{border-color:var(--warn)}.f.low{border-color:var(--mut)}
.mut{color:var(--mut)}
.p{padding:5px 8px;border-radius:6px;cursor:pointer;font-size:12px;border-left:3px solid var(--line);margin:3px 0}.p:hover{background:var(--panel)}.p.on{border-left-color:var(--acc);background:var(--panel)}
.p small{color:var(--mut);display:block}
</style></head><body>
<header><h1>.design-recall</h1>
<select id="expl"></select>
<button id="cmpBtn" title="Pick a second version to compare">Compare</button>
<label class="mut"><input type="checkbox" id="pendOnly"> pending only</label>
<span id="pendCount" class="mut"></span>
<span style="flex:1"></span><span class="mut" id="gen"></span></header>
<aside><div id="princ"></div><div id="tree" class="tree"></div></aside>
<main><div class="pages" id="pages"></div><div class="frames" id="frames"></div></main>
<aside class="r" id="ddr"></aside>
<script>
/*__DATA__*/
const $=s=>document.querySelector(s);const V=DATA.versions;
let expl=DATA.explorations[0],sel=null,cmp=null,picking=false,page=null,tagFilter=null,princ=null;
const vkey=v=>v.exploration+"/v"+String(v.iteration).padStart(2,"0");
const byExpl=e=>V.filter(v=>v.exploration===e).sort((a,b)=>a.iteration-b.iteration);
function init(){
  $("#gen").textContent="built "+new Date(DATA.generated).toLocaleString();
  const s=$("#expl");DATA.explorations.forEach(e=>{const o=document.createElement("option");o.value=o.textContent=e;s.append(o)});
  s.onchange=()=>{expl=s.value;sel=byExpl(expl).at(-1);cmp=null;page=null;render()};
  $("#cmpBtn").onclick=()=>{if(cmp){cmp=null;picking=false}else picking=!picking;render()};
  $("#pendOnly").onchange=render;
  sel=byExpl(expl).at(-1);render();
}
function tree(){
  const vs=byExpl(expl);const pend=$("#pendOnly").checked;
  const kids=n=>vs.filter(v=>v.parent===n);
  const rows=[];const walk=(v,d)=>{rows.push([v,d]);kids(v.iteration).forEach(c=>walk(c,d+1))};
  vs.filter(v=>!v.parent||!vs.find(p=>p.iteration===v.parent)).forEach(r=>walk(r,0));
  const t=$("#tree");t.innerHTML="";
  rows.forEach(([v,d])=>{
    if(pend&&v.confidence!=="inferred")return;
    if(tagFilter&&!(v.tacit_tags||[]).includes(tagFilter))return;
    if(princ&&!(princ.evidence.includes(v.id)||princ.exceptions.includes(v.id)))return;
    const n=document.createElement("div");n.className="node"+(sel===v?" sel":"")+(cmp===v?" cmp":"");n.style.setProperty("--depth",d);
    n.innerHTML='<span class="v">v'+String(v.iteration).padStart(2,"0")+'</span><span class="t">'+esc(v.change)+'<small>'+v.type+' · <span class="badge '+(v.confidence==="inferred"?"inf":"conf")+'">'+v.confidence+'</span> '+(v.trigger!=="designer"?'<span class="badge">'+v.trigger+'</span>':'')+'</small></span>';
    n.onclick=()=>{if(picking){cmp=v;picking=false}else{sel=v;if(cmp===v)cmp=null}render()};
    t.append(n);
  });
  const p=V.filter(v=>v.confidence==="inferred").length;$("#pendCount").textContent=p?p+" DDR"+(p>1?"s":"")+" awaiting rationale":"";
  $("#cmpBtn").className=picking||cmp?"on":"";$("#cmpBtn").textContent=picking?"pick a version…":cmp?"Compare: off":"Compare";
}
function pages(){
  const el=$("#pages");el.innerHTML="";if(!sel)return;
  const list=sel.pages.length?sel.pages:[];if(!page||!list.includes(page))page=list.includes("index.html")?"index.html":list[0];
  list.forEach(pg=>{const b=document.createElement("button");b.textContent=pg;if(pg===page)b.className="on";b.onclick=()=>{page=pg;frames()};el.append(b)});
  if(!list.length)el.innerHTML='<span class="mut">no html pages in snapshot — run dm viewer again</span>';
}
function src(v){return "../snapshots/"+v.exploration+"/v"+String(v.iteration).padStart(2,"0")+"/"+page}
function frames(){
  const f=$("#frames");f.innerHTML="";if(!sel||!page)return;
  const a=document.createElement("iframe");a.src=src(sel);f.append(a);
  if(cmp){const b=document.createElement("iframe");b.src=cmp.pages.includes(page)?src(cmp):"about:blank";f.append(b)}
}
function ddr(){
  const el=$("#ddr");if(!sel){el.innerHTML="";return}
  const v=sel;const fx=(DATA.findings||[]).filter(x=>x.exploration===v.exploration&&x.iteration===v.iteration);
  const rej=(v.rejected||[]).map(r=>"<li>"+esc(r.option)+(r.why?' <span class="mut">— '+esc(r.why)+"</span>":"")+"</li>").join("");
  el.innerHTML='<h2>'+vkey(v)+' · '+v.id+'</h2><dl>'
   +'<dt>Change</dt><dd>'+esc(v.change)+'</dd>'
   +'<dt>Rationale</dt><dd>'+(v.rationale?esc(v.rationale):'<span class="mut">none recorded — ask the designer</span>')+' <span class="badge '+(v.confidence==="inferred"?"inf":"conf")+'">'+v.confidence+'</span></dd>'
   +(rej?'<dt>Rejected</dt><dd><ul style="margin:0;padding-left:16px">'+rej+'</ul></dd>':'')
   +'<dt>Scope</dt><dd>'+(v.scope.page?esc(v.scope.page)+" · ":"")+(v.scope.components||[]).map(esc).join(", ")+'<br><span class="mut">'+(v.scope.files||[]).map(esc).join(", ")+'</span></dd>'
   +'<dt>Tags</dt><dd>'+(v.tacit_tags||[]).map(t=>'<span class="tag'+(tagFilter===t?" on":"")+'" data-t="'+esc(t)+'">'+esc(t)+'</span>').join("")+(tagFilter?' <span class="tag" data-t="">✕ clear</span>':'')+'</dd>'
   +'<dt>Parent · type · trigger · commit</dt><dd>'+(v.parent?"v"+String(v.parent).padStart(2,"0"):"—")+' · '+v.type+' · '+v.trigger+' · <code>'+v.commit+'</code></dd>'
   +(v.source_prompt?'<dt>Designer said</dt><dd><pre>'+esc(v.source_prompt)+'</pre></dd>':'')
   +'<dt>Recorded</dt><dd class="mut">'+new Date(v.ts).toLocaleString()+'</dd></dl>'
   +(fx.length?'<h2>Critique findings ('+fx.length+')</h2>'+fx.map(x=>'<div class="f '+x.severity+'"><b>'+esc(x.agent)+'</b> · '+esc(x.page||"")+' '+esc(x.component||"")+'<br>'+esc(x.finding)+(x.suggestion?'<br><span class="mut">→ '+esc(x.suggestion)+'</span>':'')+(x.status==="resolved"?' <span class="badge conf">resolved</span>':'')+'</div>').join(""):"")
   +(princ?'<h2>'+esc(princ.id)+' — '+esc(princ.title)+'</h2><p>'+esc(princ.statement)+'</p><p class="mut">evidence: '+princ.evidence.map(esc).join(", ")+(princ.exceptions.length?'<br>exceptions: '+princ.exceptions.map(esc).join(", "):'')+'</p>':'')
   +(cmp?'<h2>Comparing with '+vkey(cmp)+'</h2><p>'+esc(cmp.change)+'</p><p class="mut">'+(cmp.rationale?esc(cmp.rationale):"no rationale")+'</p>':'');
  el.querySelectorAll(".tag").forEach(t=>t.onclick=()=>{tagFilter=t.dataset.t||null;render()});
}
function princs(){
  const el=$("#princ");const ps=DATA.principles||[];if(!ps.length){el.innerHTML='<h2>Principles</h2><div class="mut" style="font-size:12px;padding:0 8px 8px">none yet — run <code>dm principles</code> via the design-principles skill</div>';return}
  el.innerHTML='<h2>Principles ('+ps.length+')'+(princ?' <span class="tag" id="pclr">✕ clear</span>':'')+'</h2>'+ps.map((p,i)=>'<div class="p'+(princ===p?" on":"")+(p.retired?' mut':'')+'" data-i="'+i+'"><b>'+esc(p.id)+'</b> '+esc(p.title)+(p.retired?' [retired]':'')+'<small>'+p.evidence.length+' decision'+(p.evidence.length===1?'':'s')+(p.exceptions.length?', '+p.exceptions.length+' exception'+(p.exceptions.length===1?'':'s'):'')+(p.kind?' · '+esc(p.kind):'')+'</small></div>').join("")+'<h2>Iterations</h2>';
  el.querySelectorAll(".p").forEach(d=>d.onclick=()=>{const p=ps[+d.dataset.i];princ=princ===p?null:p;render()});
  const c=$("#pclr");if(c)c.onclick=()=>{princ=null;render()};
}
function render(){princs();tree();pages();frames();ddr()}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
init();
</script></body></html>`;

module.exports = { build };
