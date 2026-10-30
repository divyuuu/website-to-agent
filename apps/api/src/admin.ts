import type { FastifyInstance } from "fastify";

const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>website-to-agent · Mission Control</title>
<style>
:root{
  --bg:#08080d; --bg2:#0e0e15;
  --card:rgba(255,255,255,.045); --card2:rgba(255,255,255,.07);
  --line:rgba(255,255,255,.09); --line2:rgba(255,255,255,.14);
  --txt:#f5f5f7; --mut:#a1a1aa; --dim:#63636b;
  --acc:#0a84ff; --acc2:#30d158; --warn:#ffd60a; --bad:#ff453a;
  --r:18px; --font:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;font-family:var(--font);background:var(--bg);color:var(--txt);
  background-image:radial-gradient(900px 480px at 12% -6%,rgba(10,132,255,.16),transparent 60%),
  radial-gradient(800px 420px at 88% -4%,rgba(48,209,88,.10),transparent 60%);min-height:100vh}
a{color:var(--acc)}
.nav{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:14px;padding:14px 28px;
  background:rgba(8,8,13,.72);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--line)}
.orb{width:34px;height:34px;border-radius:50%;flex:none;
  background:conic-gradient(from 200deg,#0a84ff,#bf5af2,#30d158,#0a84ff);
  box-shadow:0 0 24px rgba(10,132,255,.45)}
.brand h1{font-size:17px;margin:0;letter-spacing:-.02em;font-weight:700}
.brand p{margin:1px 0 0;font-size:12px;color:var(--mut);letter-spacing:.04em}
.pill{margin-left:auto;display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mut);
  border:1px solid var(--line);border-radius:999px;padding:7px 14px;background:var(--card)}
.dot{width:9px;height:9px;border-radius:50%;background:#555;flex:none}
.dot.ok{background:var(--acc2);box-shadow:0 0 10px var(--acc2)}
.dot.bad{background:var(--bad);box-shadow:0 0 10px var(--bad)}
.wrap{max-width:1180px;margin:0 auto;padding:26px 28px 60px}
.hero{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:6px 0 18px;flex-wrap:wrap}
.hero h2{margin:0;font-size:34px;letter-spacing:-.03em;font-weight:700}
.hero p{margin:6px 0 0;color:var(--mut);font-size:14px;max-width:640px;line-height:1.55}
.steps{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:0 0 18px}
.step{border:1px solid var(--line);background:var(--card);border-radius:14px;padding:11px 13px;font-size:12.5px;color:var(--mut)}
.step b{display:flex;align-items:center;gap:8px;color:var(--txt);font-size:13px;margin-bottom:3px}
.n{width:20px;height:20px;border-radius:50%;background:var(--card2);border:1px solid var(--line2);
  display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex:none}
.step.done .n{background:var(--acc2);border-color:var(--acc2);color:#04140a;font-weight:700}
.grid{display:grid;grid-template-columns:7fr 5fr;gap:16px;align-items:start}
@media(max-width:960px){.grid{grid-template-columns:1fr}.steps{grid-template-columns:repeat(2,1fr)}}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:20px;margin-bottom:16px;
  box-shadow:0 18px 50px rgba(0,0,0,.35)}
.card h3{margin:0 0 2px;font-size:16px;letter-spacing:-.01em}
.sub{margin:0 0 14px;color:var(--mut);font-size:13px;line-height:1.5}
label.f{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--mut);flex:1;min-width:150px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:12px}
input,select,textarea{background:rgba(0,0,0,.35);border:1px solid var(--line2);color:var(--txt);
  border-radius:12px;padding:10px 12px;font:inherit;font-size:13.5px;width:100%;outline:none}
input:focus,select:focus,textarea:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(10,132,255,.22)}
textarea{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;min-height:170px;resize:vertical}
button{font:inherit;font-size:13.5px;font-weight:600;border-radius:999px;padding:10px 18px;cursor:pointer;
  border:1px solid transparent;transition:transform .08s,opacity .15s}
button:active{transform:scale(.97)}
.btn{background:#f5f5f7;color:#0a0a0c}
.btn:hover{opacity:.88}
.btn.acc{background:var(--acc);color:#fff}
.btn.go{background:var(--acc2);color:#04140a}
.btn.ghost{background:transparent;color:var(--txt);border-color:var(--line2)}
.btn.danger{background:transparent;color:var(--bad);border-color:rgba(255,69,58,.4)}
.btn.sm{padding:7px 13px;font-size:12.5px}
.btn[disabled]{opacity:.45;cursor:wait}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);text-align:left;
  padding:10px 8px;border-bottom:1px solid var(--line)}
td{padding:11px 8px;border-bottom:1px solid var(--line);vertical-align:middle}
tr:last-child td{border-bottom:none}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--mut)}
.st{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:4px 11px;letter-spacing:.02em}
.st.draft{background:rgba(161,161,170,.16);color:#d4d4d8}
.st.proposed{background:rgba(255,214,10,.14);color:var(--warn)}
.st.approved,.st.succeeded{background:rgba(48,209,88,.14);color:var(--acc2)}
.st.rejected,.st.failed{background:rgba(255,69,58,.14);color:var(--bad)}
.st.disabled,.st.running{background:rgba(10,132,255,.16);color:#64b5ff}
.out{background:rgba(0,0,0,.55);border:1px solid var(--line);border-radius:14px;padding:13px 15px;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.6;
  white-space:pre-wrap;word-break:break-word;max-height:300px;overflow:auto;color:#d7d7de;margin:4px 0 0}
.acts{display:flex;gap:6px;flex-wrap:wrap}
.empty{color:var(--dim);font-size:13px;padding:14px 4px}
#toasts{position:fixed;top:70px;right:22px;display:flex;flex-direction:column;gap:10px;z-index:50;max-width:min(360px,90vw)}
.toast{background:rgba(20,20,28,.92);border:1px solid var(--line2);border-radius:14px;padding:12px 16px;
  font-size:13px;box-shadow:0 12px 40px rgba(0,0,0,.5);backdrop-filter:blur(12px)}
.toast.err{border-color:rgba(255,69,58,.5)}
.toast.okk{border-color:rgba(48,209,88,.45)}
.foot{color:var(--dim);font-size:12px;text-align:center;margin-top:8px}
.copy{cursor:pointer;border:1px solid var(--line2);background:transparent;color:var(--mut);
  border-radius:8px;padding:3px 8px;font-size:11px;font-weight:600}
.copy:hover{color:var(--txt);border-color:var(--acc)}
</style>
</head>
<body>
<div class="nav">
  <div class="orb"></div>
  <div class="brand"><h1>website-to-agent</h1><p>MISSION CONTROL · ADMIN</p></div>
  <div class="pill"><span id="healthDot" class="dot"></span><span id="healthText">checking…</span></div>
</div>
<div class="wrap">
  <div class="hero">
    <div><h2>Automate any page.</h2>
    <p>Connect a site, shape a workflow, approve it once, then run it on demand.
    Every step below lights up as you complete it.</p></div>
    <button id="refreshAll" class="btn ghost">Refresh everything</button>
  </div>
  <div class="steps">
    <div class="step" id="s1"><b><span class="n">1</span>Connect</b>Add your website URL</div>
    <div class="step" id="s2"><b><span class="n">2</span>Create</b>Name a workflow</div>
    <div class="step" id="s3"><b><span class="n">3</span>Propose</b>Attach the definition</div>
    <div class="step" id="s4"><b><span class="n">4</span>Approve</b>Owner signs off</div>
    <div class="step" id="s5"><b><span class="n">5</span>Run</b>Execute &amp; inspect</div>
  </div>
  <div class="card">
    <h3>Workspace</h3><p class="sub">Who you are acting as. Saved in this browser.</p>
    <div class="row">
      <label class="f">API base URL<input id="baseUrl" value="http://localhost:3000" /></label>
      <label class="f">Tenant<input id="tenantId" value="default" /></label>
      <label class="f">MCP key (optional, overrides tenant)<input id="mcpKey" placeholder="w2a_…" /></label>
      <button id="saveAuth" class="btn">Save</button>
    </div>
  </div>
  <div class="grid">
    <div>
      <div class="card">
        <h3>1 · Connect a website</h3>
        <p class="sub">Local <span class="mono">http://localhost…</span> or <span class="mono">http://127.0.0.1…</span> URLs only. Try the demo school site on port 4100.</p>
        <div class="row">
          <label class="f">Website URL<input id="connUrl" value="http://127.0.0.1:4100" /></label>
          <button id="connCreate" class="btn acc">Add connection</button>
        </div>
        <div id="connOut" class="out" style="display:none"></div>
      </div>
      <div class="card">
        <h3>2 · Create a workflow</h3>
        <p class="sub">Lowercase letters, digits and underscores, e.g. <span class="mono">search_students</span>.</p>
        <div class="row">
          <label class="f">Stable name<input id="wfName" placeholder="search_students" /></label>
          <label class="f">Connection ID<input id="wfConn" placeholder="paste or add above" /></label>
          <button id="wfCreate" class="btn acc">Create</button>
        </div>
      </div>
      <div class="card">
        <h3>3 · Propose a definition</h3>
        <p class="sub">Pick a workflow, review the template, then propose. The name and version must match.</p>
        <div class="row">
          <label class="f">Workflow ID<input id="propWf" placeholder="workflow id" /></label>
          <button id="propFill" class="btn ghost sm">Fill template</button>
          <button id="propSend" class="btn acc sm">Propose v1</button>
        </div>
        <textarea id="propJson" spellcheck="false"></textarea>
        <div id="propOut" class="out" style="display:none"></div>
      </div>
      <div class="card">
        <h3>Workflows</h3>
        <p class="sub">Approve once, then run as often as you like.</p>
        <table><thead><tr><th>Name</th><th>ID</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="wfRows"><tr><td colspan="4" class="empty">Loading…</td></tr></tbody></table>
        <div id="wfDetail" class="out" style="display:none"></div>
      </div>
    </div>
    <div>
      <div class="card">
        <h3>5 · Run it</h3>
        <p class="sub">Only <b>approved</b> workflows run.</p>
        <div class="row">
          <label class="f">Workflow ID<input id="exWf" placeholder="workflow id" /></label>
        </div>
        <div class="row">
          <label class="f">Inputs (JSON)<input id="exInputs" value='{"student_id": "STU-001"}' /></label>
          <button id="exRun" class="btn go">Run</button>
        </div>
        <div class="row">
          <label class="f">Execution ID<input id="exId" placeholder="execution id" /></label>
          <button id="exGet" class="btn ghost sm">Lookup</button>
        </div>
        <div id="exOut" class="out">No runs yet — your result will appear here.</div>
      </div>
      <div class="card">
        <h3>API keys</h3>
        <p class="sub">Owner only. The secret is shown <b>once</b> — copy it immediately.</p>
        <div class="row">
          <label class="f">Key name<input id="keyName" placeholder="e.g. prod-agent" /></label>
          <label class="f" style="max-width:130px">Role<select id="keyRole"><option>owner</option><option>operator</option><option>viewer</option></select></label>
          <button id="keyCreate" class="btn sm">Create</button>
          <button id="keyList" class="btn ghost sm">List</button>
        </div>
        <table><thead><tr><th>Name</th><th>Role</th><th>State</th><th></th></tr></thead>
        <tbody id="keyRows"><tr><td colspan="4" class="empty">Not loaded.</td></tr></tbody></table>
      </div>
      <div class="card">
        <h3>System pulse</h3>
        <p class="sub">Executions, failures and rate limits.</p>
        <button id="metLoad" class="btn ghost sm" style="margin-bottom:10px">Load metrics</button>
        <div id="metOut" class="out">Press “Load metrics”.</div>
      </div>
    </div>
  </div>
  <p class="foot">website-to-agent · local-first automation · <a href="/health">health</a> · <a href="/ready">ready</a></p>
</div>
<div id="toasts"></div>
<script>
var $ = function(id){ return document.getElementById(id); };
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function toast(msg, kind){
  var t = document.createElement("div");
  t.className = "toast" + (kind === "err" ? " err" : kind === "ok" ? " okk" : "");
  t.textContent = msg; $("toasts").appendChild(t);
  setTimeout(function(){ t.style.opacity = "0"; setTimeout(function(){ t.remove(); }, 300); }, 3600);
}
function show(id, obj){ var el = $(id); el.style.display = "block";
  el.textContent = (typeof obj === "string") ? obj : JSON.stringify(obj, null, 2); }
function busy(btn, on){ if(!btn) return; if(on){ btn.dataset.label = btn.textContent; btn.textContent = "Working…"; btn.setAttribute("disabled",""); }
  else { btn.textContent = btn.dataset.label || btn.textContent; btn.removeAttribute("disabled"); } }
function template(name){
  return JSON.stringify({ definition: {
    name: name || "search_students", version: 1, risk: "read_only",
    inputs: { student_id: { type: "string", required: true, maxLength: 40 } },
    preconditions: ["authenticated_session"],
    steps: [
      { navigate: "/students" },
      { fill: { locator: { role: "textbox", name: "Student ID" }, valueFrom: "inputs.student_id" } },
      { click: { locator: { role: "button", name: "Search" } } },
      { assert: { locator: { role: "heading", name: "Student Results" } } },
      { extract: { fields: ["subject", "score", "test_date"] } }
    ],
    output: { type: "object", fields: ["student_id", "results"] }
  } }, null, 2);
}
try {
  $("baseUrl").value = localStorage.getItem("w2a.base") || "http://localhost:3000";
  $("tenantId").value = localStorage.getItem("w2a.tenant") || "default";
  $("mcpKey").value = localStorage.getItem("w2a.key") || "";
} catch(e) {}
$("propJson").value = template("search_students");
function base(){ return $("baseUrl").value.replace(/\\/$/, ""); }
function auth(){
  var t = $("tenantId").value.trim(), k = $("mcpKey").value.trim();
  var h = { "content-type": "application/json" };
  if (k) h["x-mcp-key"] = k; else if (t) h["x-tenant-id"] = t;
  return h;
}
function api(path, opts){
  opts = opts || {};
  var headers = auth();
  for (var k in (opts.headers || {})) headers[k] = opts.headers[k];
  return fetch(base() + path, { method: opts.method || "GET", headers: headers, body: opts.body })
    .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { s: r.status, j: j }; }); })
    .then(function(x){ if (x.s < 200 || x.s >= 300) throw new Error((x.j && x.j.error) || ("HTTP " + x.s) + " " + path); return x.j; });
}
function mark(step, on){ var el = $("s" + step); if (el) el.classList.toggle("done", !!on); }
function health(){
  return fetch(base() + "/health").then(function(r){ return r.json(); }).then(function(j){
    var ok = !!(j && j.ok);
    $("healthDot").className = "dot " + (ok ? "ok" : "bad");
    $("healthText").textContent = ok ? ("healthy · " + base()) : "unhealthy";
    return ok;
  }).catch(function(e){
    $("healthDot").className = "dot bad";
    $("healthText").textContent = "unreachable · " + base();
    return false;
  });
}
function loadWf(){
  return api("/workflows").then(function(j){
    var rows = (j.workflows || []).map(function(w){
      return "<tr><td><b>" + esc(w.stableName) + "</b></td>" +
        "<td><span class='mono'>" + esc(w.id).slice(0, 8) + "…</span> " +
        "<button class='copy' data-copy='" + esc(w.id) + "'>copy</button></td>" +
        "<td><span class='st " + esc(w.status) + "'>" + esc(w.status) + "</span></td>" +
        "<td><div class='acts'>" +
        "<button class='btn ghost sm' data-act='propose' data-id='" + esc(w.id) + "'>propose</button>" +
        "<button class='btn go sm' data-act='approve' data-id='" + esc(w.id) + "'>approve</button>" +
        "<button class='btn ghost sm' data-act='reject' data-id='" + esc(w.id) + "'>reject</button>" +
        "<button class='btn danger sm' data-act='disable' data-id='" + esc(w.id) + "'>disable</button>" +
        "<button class='btn sm' data-act='fill' data-id='" + esc(w.id) + "'>run</button>" +
        "</div></td></tr>";
    }).join("");
    $("wfRows").innerHTML = rows || "<tr><td colspan='4' class='empty'>No workflows yet — create one above.</td></tr>";
    var sts = (j.workflows || []).map(function(w){ return w.status; });
    mark(2, (j.workflows || []).length > 0);
    mark(3, sts.indexOf("proposed") >= 0 || sts.indexOf("approved") >= 0);
    mark(4, sts.indexOf("approved") >= 0);
  });
}
function loadKeys(){
  return api("/mcp-keys").then(function(j){
    $("keyRows").innerHTML = ((j.keys || []).map(function(k){
      return "<tr><td><b>" + esc(k.name) + "</b><br/><span class='mono'>" + esc(k.id).slice(0, 8) + "…</span></td>" +
        "<td>" + esc(k.role) + "</td><td>" + (k.revoked ? "<span class='st rejected'>revoked</span>" : "<span class='st approved'>active</span>") + "</td>" +
        "<td>" + (k.revoked ? "" : "<button class='btn danger sm' data-revoke='" + esc(k.id) + "'>revoke</button>") + "</td></tr>";
    }).join("")) || "<tr><td colspan='4' class='empty'>No keys yet.</td></tr>";
  }).catch(function(e){
    $("keyRows").innerHTML = "<tr><td colspan='4' class='empty'>" + esc(e.message) + " (owner only)</td></tr>";
  });
}
function loadMet(){ return api("/metrics").then(function(j){ show("metOut", j); }); }
function refreshAll(){
  return health().then(function(){
    return loadWf().catch(function(e){ show("wfDetail", String(e.message || e)); });
  }).then(function(){ return loadKeys(); })
    .then(function(){ return loadMet().catch(function(e){ show("metOut", String(e.message || e)); }); });
}
$("saveAuth").onclick = function(){
  try {
    localStorage.setItem("w2a.base", $("baseUrl").value);
    localStorage.setItem("w2a.tenant", $("tenantId").value);
    localStorage.setItem("w2a.key", $("mcpKey").value);
  } catch(e) {}
  health(); toast("Workspace saved.", "ok");
};
$("refreshAll").onclick = function(){ var b = $("refreshAll"); busy(b, true);
  refreshAll().then(function(){ busy(b, false); }).catch(function(e){ busy(b, false); toast(String(e.message || e), "err"); }); };
$("connCreate").onclick = function(){
  var b = $("connCreate"); busy(b, true);
  api("/connections", { method: "POST", body: JSON.stringify({ baseUrl: $("connUrl").value.trim() }) })
    .then(function(j){ $("wfConn").value = j.id; show("connOut", j); mark(1, true);
      toast("Connected. ID copied into the workflow form.", "ok"); loadWf(); busy(b, false); })
    .catch(function(e){ busy(b, false); toast(String(e.message || e), "err"); });
};
$("wfCreate").onclick = function(){
  var b = $("wfCreate"); busy(b, true);
  api("/workflows", { method: "POST", body: JSON.stringify({ stableName: $("wfName").value.trim(), connectionId: $("wfConn").value.trim() }) })
    .then(function(j){ $("propWf").value = j.id; $("exWf").value = j.id; show("wfDetail", j);
      try { var t = JSON.parse($("propJson").value); t.definition.name = $("wfName").value.trim() || t.definition.name; $("propJson").value = JSON.stringify(t, null, 2); } catch(e) {}
      toast("Workflow created — now propose a definition.", "ok"); loadWf(); busy(b, false); })
    .catch(function(e){ busy(b, false); toast(String(e.message || e), "err"); });
};
$("propFill").onclick = function(){
  var id = $("propWf").value.trim();
  var row = null;
  try {
    var cells = document.querySelectorAll("#wfRows tr td:first-child b");
    for (var i = 0; i < cells.length; i++) row = cells[i].textContent;
  } catch(e) {}
  var name = ($("wfName").value.trim() || row || "search_students");
  $("propJson").value = template(name);
  toast("Template ready — check the name, then Propose.", "ok");
  if (id) { api("/workflows/" + id).then(function(j){ show("propOut", j); }).catch(function(){}); }
};
$("propSend").onclick = function(){
  var b = $("propSend"); busy(b, true);
  var id = $("propWf").value.trim(), payload;
  try { payload = JSON.parse($("propJson").value); }
  catch(e){ busy(b, false); toast("Definition is not valid JSON.", "err"); return; }
  api("/workflows/" + id + "/propose", { method: "POST", body: JSON.stringify(payload) })
    .then(function(j){ show("propOut", j); toast("Proposed v" + j.version + " — approve it below.", "ok"); loadWf(); busy(b, false); })
    .catch(function(e){ busy(b, false); show("propOut", String(e.message || e)); toast(String(e.message || e), "err"); });
};
$("exRun").onclick = function(){
  var inputs = {};
  try { inputs = JSON.parse($("exInputs").value || "{}"); }
  catch(e){ toast("Inputs are not valid JSON.", "err"); return; }
  var b = $("exRun"); busy(b, true); show("exOut", "Running…");
  api("/executions", { method: "POST", body: JSON.stringify({ workflowId: $("exWf").value.trim(), inputs: inputs }) })
    .then(function(j){ if (j.executionId) $("exId").value = j.executionId;
      show("exOut", j); mark(5, j.status === "succeeded" || !!j.ok);
      toast(j.ok ? "Execution succeeded." : ("Finished: " + (j.status || "done")), j.ok ? "ok" : undefined);
      loadMet().catch(function(){}); busy(b, false); })
    .catch(function(e){ busy(b, false); show("exOut", String(e.message || e)); toast(String(e.message || e), "err"); });
};
$("exGet").onclick = function(){
  api("/executions/" + $("exId").value.trim()).then(function(j){ show("exOut", j); })
    .catch(function(e){ show("exOut", String(e.message || e)); });
};
$("keyCreate").onclick = function(){
  api("/mcp-keys", { method: "POST", body: JSON.stringify({ name: $("keyName").value.trim(), role: $("keyRole").value }) })
    .then(function(j){ show("metOut", "New key secret (copy now, shown once): " + j.plaintext);
      toast("Key created — secret copied to System pulse. Save it now.", "ok"); loadKeys(); })
    .catch(function(e){ toast(String(e.message || e), "err"); });
};
$("keyList").onclick = function(){ loadKeys(); };
$("metLoad").onclick = function(){ loadMet().catch(function(e){ show("metOut", String(e.message || e)); }); };
document.addEventListener("click", function(e){
  var t = e.target && e.target.closest ? e.target.closest("button") : null;
  if (!t) return;
  if (t.dataset && t.dataset.copy) {
    var v = t.dataset.copy;
    if (navigator.clipboard) navigator.clipboard.writeText(v).then(function(){ toast("Copied.", "ok"); });
    return;
  }
  var id = t.dataset ? (t.dataset.id || "") : "";
  if (t.dataset && t.dataset.act) {
    var act = t.dataset.act;
    if (act === "fill") { $("exWf").value = id;
      document.querySelector(".grid").scrollIntoView({ behavior: "smooth" }); return; }
    if (act === "propose") { $("propWf").value = id;
      api("/workflows/" + id).then(function(j){ show("propOut", j); }).catch(function(e){ show("propOut", String(e.message || e)); });
      toast("Loaded below in step 3 — review and Propose.", "ok"); return; }
    busy(t, true);
    api("/workflows/" + id + "/" + act, { method: "POST", body: "{}" })
      .then(function(j){ busy(t, false); show("wfDetail", j);
        toast("Workflow " + act + "d.", "ok"); loadWf(); })
      .catch(function(err){ busy(t, false); toast(String(err.message || err), "err"); });
  }
  if (t.dataset && t.dataset.revoke) {
    if (!confirm("Revoke this key? This cannot be undone.")) return;
    api("/mcp-keys/" + t.dataset.revoke + "/revoke", { method: "POST" })
      .then(function(){ toast("Key revoked.", "ok"); loadKeys(); })
      .catch(function(err){ toast(String(err.message || err), "err"); });
  }
});
health();
loadWf().catch(function(){ $("wfRows").innerHTML = "<tr><td colspan='4' class='empty'>Could not load — check Workspace and press Refresh.</td></tr>"; });
loadMet().catch(function(){});
</script>
</body>
</html>`;

export function registerAdminRoutes(app: FastifyInstance): void {
  app.get("/admin", async (_req, reply) => {
    reply.type("text/html").send(ADMIN_HTML);
  });
  app.get("/", async (_req, reply) => {
    reply.redirect("/admin");
  });
}
