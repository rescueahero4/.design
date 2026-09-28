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

// Typography: the viewer's own chrome is set in a serif face so it never reads as part of the mockup
// (mockups almost always use a sans). Labels, badges and controls stay in a small sans; ids in mono.
const HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>design-recall viewer</title>
<style>
:root{--bg:#fff;--fg:#1a1a1a;--mut:#6b7280;--line:#e5e7eb;--acc:#2563eb;--warn:#d97706;--ok:#059669;--panel:#f9fafb;
--serif:Charter,"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,"Times New Roman",serif;
--sans:system-ui,-apple-system,"Segoe UI",sans-serif;--mono:ui-monospace,"Cascadia Mono",Consolas,monospace;
font-family:var(--serif);font-size:14px;line-height:1.4;color:var(--fg)}
@media(prefers-color-scheme:dark){:root{--bg:#111;--fg:#eee;--mut:#9ca3af;--line:#2a2a2a;--panel:#181818;--acc:#60a5fa}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);height:100vh;display:grid;grid-template-rows:auto 1fr;grid-template-columns:300px 1fr 340px}
header{grid-column:1/-1;display:flex;gap:12px;align-items:center;padding:8px 14px;border-bottom:1px solid var(--line)}
header h1{font-size:17px;font-weight:600;font-style:italic;margin:0 8px 0 0;letter-spacing:-.01em}
select,button,input{font:inherit;font-family:var(--sans);font-size:12px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg)}
button.on{background:var(--acc);color:#fff;border-color:var(--acc)}
aside{overflow:auto;border-right:1px solid var(--line);padding:10px}aside.r{border-right:0;border-left:1px solid var(--line)}
main{display:flex;flex-direction:column;min-width:0}
.pages{display:flex;gap:6px;padding:6px 10px;border-bottom:1px solid var(--line);overflow:auto}
.pages button{white-space:nowrap;font-family:var(--mono)}
.frames{flex:1;display:flex;gap:2px;background:var(--line)}
.frames iframe{flex:1;border:0;background:#fff;width:100%;height:100%}
.tree{position:relative}
.tools{display:flex;gap:6px;align-items:center;justify-content:space-between;margin:0 0 4px}
.tools button{padding:2px 6px;font-size:11px}
.node{display:grid;grid-template-columns:34px 1fr 20px;column-gap:8px;align-items:start;padding:6px 8px;border-radius:6px;cursor:pointer;border:1px solid transparent}
.node:hover{background:var(--panel)}.node.sel{border-color:var(--acc);background:var(--panel)}.node.cmp{border-color:var(--warn);border-style:dashed}
.v{font-family:var(--mono);font-size:12px;color:var(--mut);padding-top:2px}
.t{min-width:0}.t .c{font-size:13.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.node.open .t .c{display:block}
.t small{display:block;color:var(--mut);font-family:var(--sans);font-size:11px;margin-top:3px}
.more{display:none;margin-top:6px;font-size:12.5px;color:var(--fg);border-top:1px dashed var(--line);padding-top:6px}
.more .mut{font-family:var(--sans);font-size:11px}
.node.open .more{display:block}
.x{font-family:var(--sans);font-size:11px;color:var(--mut);border:0;background:none;padding:2px 0;cursor:pointer;line-height:1;text-align:right}
.x:hover{color:var(--fg)}
.br{font-family:var(--sans);font-size:10px;color:var(--warn);margin-left:4px}
.badge{font-family:var(--sans);font-size:10px;padding:1px 5px;border-radius:4px;background:var(--panel);border:1px solid var(--line);color:var(--mut)}
.badge.inf{color:var(--warn);border-color:var(--warn)}.badge.conf{color:var(--ok);border-color:var(--ok)}
h2{font-family:var(--sans);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin:14px 0 6px}
dl{margin:0}dt{font-family:var(--sans);color:var(--mut);font-size:11px;margin-top:8px}dd{margin:2px 0 0}
.tag{display:inline-block;font-family:var(--sans);font-size:11px;padding:1px 6px;border-radius:10px;background:var(--panel);border:1px solid var(--line);margin:2px 2px 0 0;cursor:pointer}
.tag.on{background:var(--acc);color:#fff;border-color:var(--acc)}
pre{white-space:pre-wrap;background:var(--panel);padding:8px;border-radius:6px;font-size:12px;font-family:var(--mono)}
code{font-family:var(--mono);font-size:12px}
.f{border-left:3px solid var(--line);padding:4px 8px;margin:6px 0;font-size:12.5px}.f.high{border-color:#dc2626}.f.medium{border-color:var(--warn)}.f.low{border-color:var(--mut)}
.mut{color:var(--mut)}
.p{padding:5px 8px;border-radius:6px;cursor:pointer;font-size:12.5px;border-left:3px solid var(--line);margin:3px 0}.p:hover{background:var(--panel)}.p.on{border-left-color:var(--acc);background:var(--panel)}
.p small{color:var(--mut);display:block;font-family:var(--sans);font-size:11px}
#live{font-family:var(--sans);font-size:11px;color:var(--warn)}
</style></head><body>
<header><h1>design-recall</h1>
<select id="expl"></select>
<button id="cmpBtn" title="Pick a second version to compare">Compare</button>
<label class="mut" style="font-family:var(--sans);font-size:12px"><input type="checkbox" id="pendOnly"> pending only</label>
<span id="pendCount" class="mut" style="font-family:var(--sans);font-size:12px"></span>
<span style="flex:1"></span><span class="mut" id="live"></span><span class="mut" id="gen" style="font-family:var(--sans);font-size:11px"></span></header>
<aside><div id="princ"></div><div id="tree" class="tree"></div></aside>
<main><div class="pages" id="pages"></div><div class="frames" id="frames"></div></main>
<aside class="r" id="ddr"></aside>
<script>
/*__DATA__*/
const $=s=>document.querySelector(s);const V=DATA.versions;
let expl=DATA.explorations[0],sel=null,cmp=null,picking=false,page=null,tagFilter=null,princ=null;
const open=new Set(); // ids of expanded iteration cards
const vkey=v=>v.exploration+"/v"+String(v.iteration).padStart(2,"0");
const vn=n=>"v"+String(n).padStart(2,"0");
const byExpl=e=>V.filter(v=>v.exploration===e).sort((a,b)=>a.iteration-b.iteration);
function init(){
  $("#gen").textContent="built "+new Date(DATA.generated).toLocaleString();
  const s=$("#expl");DATA.explorations.forEach(e=>{const o=document.createElement("option");o.value=o.textContent=e;s.append(o)});
  const remembered=sessionStorage.getItem("dr.expl");if(remembered&&DATA.explorations.includes(remembered))expl=s.value=remembered;
  s.onchange=()=>{expl=s.value;sessionStorage.setItem("dr.expl",expl);sel=byExpl(expl).at(-1);cmp=null;page=null;render()};
  $("#cmpBtn").onclick=()=>{if(cmp){cmp=null;picking=false}else picking=!picking;render()};
  $("#pendOnly").onchange=render;
  const rs=sessionStorage.getItem("dr.sel");sel=byExpl(expl).find(v=>v.id===rs)||byExpl(expl).at(-1);
  render();watchForRebuild();
}
function tree(){
  const vs=byExpl(expl);const pend=$("#pendOnly").checked;
  // pre-order walk so forks sit under their parent, but rendered flat (no indent): a branch shows a "from vNN" mark instead
  const kids=n=>vs.filter(v=>v.parent===n);
  const rows=[];const walk=(v)=>{rows.push(v);kids(v.iteration).forEach(walk)};
  vs.filter(v=>!v.parent||!vs.find(p=>p.iteration===v.parent)).forEach(walk);
  const t=$("#tree");t.innerHTML="";
  const tools=document.createElement("div");tools.className="tools";
  tools.innerHTML='<span class="mut" style="font-family:var(--sans);font-size:11px">'+rows.length+' iteration'+(rows.length===1?'':'s')+'</span><span><button id="xall">expand all</button> <button id="call">collapse all</button></span>';
  t.append(tools);
  let prev=null;
  rows.forEach(v=>{
    const show=!(pend&&v.confidence!=="inferred")&&!(tagFilter&&!(v.tacit_tags||[]).includes(tagFilter))&&!(princ&&!(princ.evidence.includes(v.id)||princ.exceptions.includes(v.id)));
    if(!show){prev=v;return}
    const branch=v.parent&&prev&&v.parent!==prev.iteration;
    const n=document.createElement("div");n.className="node"+(sel===v?" sel":"")+(cmp===v?" cmp":"")+(open.has(v.id)?" open":"");
    n.innerHTML='<span class="v">'+vn(v.iteration)+'</span>'
      +'<span class="t"><span class="c">'+esc(v.change)+'</span>'
      +'<small>'+v.type+' · <span class="badge '+(v.confidence==="inferred"?"inf":"conf")+'">'+v.confidence+'</span> '+(v.trigger!=="designer"?'<span class="badge">'+v.trigger+'</span> ':'')+(branch?'<span class="br">↳ from '+vn(v.parent)+'</span>':'')+'</small>'
      +'<div class="more">'+(v.rationale?esc(v.rationale):'<span class="mut">no rationale recorded</span>')
      +((v.rejected||[]).length?'<div class="mut" style="margin-top:4px">rejected: '+v.rejected.map(r=>esc(r.option)).join(", ")+'</div>':'')
      +((v.tacit_tags||[]).length?'<div>'+v.tacit_tags.map(x=>'<span class="tag">'+esc(x)+'</span>').join("")+'</div>':'')
      +'<div class="mut" style="margin-top:4px"><code>'+esc(v.id)+'</code> · '+new Date(v.ts).toLocaleDateString()+'</div></div></span>'
      +'<button class="x" title="'+(open.has(v.id)?"collapse":"expand")+'">'+(open.has(v.id)?"▾":"▸")+'</button>';
    n.onclick=e=>{if(e.target.closest(".x")){open.has(v.id)?open.delete(v.id):open.add(v.id);render();return}if(picking){cmp=v;picking=false}else{sel=v;if(cmp===v)cmp=null}sessionStorage.setItem("dr.sel",sel?sel.id:"");render()};
    t.append(n);prev=v;
  });
  $("#xall").onclick=()=>{rows.forEach(v=>open.add(v.id));render()};$("#call").onclick=()=>{open.clear();render()};
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
   +'<dt>Parent · type · trigger · commit</dt><dd>'+(v.parent?vn(v.parent):"—")+' · '+v.type+' · '+v.trigger+' · <code>'+v.commit+'</code></dd>'
   +(v.source_prompt?'<dt>Designer said</dt><dd><pre>'+esc(v.source_prompt)+'</pre></dd>':'')
   +'<dt>Recorded</dt><dd class="mut">'+new Date(v.ts).toLocaleString()+'</dd></dl>'
   +(fx.length?'<h2>Critique findings ('+fx.length+')</h2>'+fx.map(x=>'<div class="f '+x.severity+'"><b>'+esc(x.agent)+'</b> · '+esc(x.page||"")+' '+esc(x.component||"")+'<br>'+esc(x.finding)+(x.suggestion?'<br><span class="mut">→ '+esc(x.suggestion)+'</span>':'')+(x.status==="resolved"?' <span class="badge conf">resolved</span>':'')+'</div>').join(""):"")
   +(princ?'<h2>'+esc(princ.id)+' — '+esc(princ.title)+'</h2><p>'+esc(princ.statement)+'</p><p class="mut">evidence: '+princ.evidence.map(esc).join(", ")+(princ.exceptions.length?'<br>exceptions: '+princ.exceptions.map(esc).join(", "):'')+'</p>':'')
   +(cmp?'<h2>Comparing with '+vkey(cmp)+'</h2><p>'+esc(cmp.change)+'</p><p class="mut">'+(cmp.rationale?esc(cmp.rationale):"no rationale")+'</p>':'');
  el.querySelectorAll(".tag").forEach(t=>t.onclick=()=>{tagFilter=t.dataset.t||null;render()});
}
function princs(){
  const el=$("#princ");const ps=DATA.principles||[];if(!ps.length){el.innerHTML='<h2>Principles</h2><div class="mut" style="font-size:12px;padding:0 8px 8px">none yet — run <code>dm principles</code> via the design-principles skill</div><h2>Iterations</h2>';return}
  el.innerHTML='<h2>Principles ('+ps.length+')'+(princ?' <span class="tag" id="pclr">✕ clear</span>':'')+'</h2>'+ps.map((p,i)=>'<div class="p'+(princ===p?" on":"")+(p.retired?' mut':'')+'" data-i="'+i+'"><b>'+esc(p.id)+'</b> '+esc(p.title)+(p.retired?' [retired]':'')+'<small>'+p.evidence.length+' decision'+(p.evidence.length===1?'':'s')+(p.exceptions.length?', '+p.exceptions.length+' exception'+(p.exceptions.length===1?'':'s'):'')+(p.kind?' · '+esc(p.kind):'')+'</small></div>').join("")+'<h2>Iterations</h2>';
  el.querySelectorAll(".p").forEach(d=>d.onclick=()=>{const p=ps[+d.dataset.i];princ=princ===p?null:p;render()});
  const c=$("#pclr");if(c)c.onclick=()=>{princ=null;render()};
}
// Freshness: no background polling. When served over http, check for a newer build only when the tab
// regains focus (one HEAD/GET, then idle); the ↻ button reloads on demand. Live Server-style tools
// already push reloads on file change; over file:// the button is the only option.
function watchForRebuild(){
  const el=$("#live");
  const btn=document.createElement("button");btn.textContent="↻";btn.title="Reload viewer (R)";btn.onclick=()=>location.reload();el.after(btn);
  document.addEventListener("keydown",e=>{if(e.key==="r"&&!e.metaKey&&!e.ctrlKey&&!/input|select|textarea/i.test(e.target.tagName))location.reload()});
  if(location.protocol==="file:"){el.textContent="static";return}
  el.textContent="";
  const check=async()=>{try{const r=await fetch(location.href,{cache:"no-store"});const m=(await r.text()).match(/"generated":"([^"]+)"/);if(m&&m[1]!==DATA.generated){el.textContent="newer build available";btn.className="on"}}catch(e){}};
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")check()});
  window.addEventListener("focus",check);
}
function render(){princs();tree();pages();frames();ddr()}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
init();
</script></body></html>`;

module.exports = { build };
