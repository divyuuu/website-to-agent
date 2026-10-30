import type { FastifyInstance } from "fastify";

const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>w2a admin</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#f6f7f9;color:#111}
header{background:#111;color:#fff;padding:12px 16px;display:flex;gap:12px;align-items:center}
header .dot{width:10px;height:10px;border-radius:50%;background:#888;display:inline-block}
header .dot.ok{background:#22c55e}header .dot.bad{background:#ef4444}
main{max-width:960px;margin:0 auto;padding:16px}
.card{background:#fff;border:1px solid #e2e2e2;border-radius:8px;padding:12px;margin-bottom:12px}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
input,select,textarea{border:1px solid #ccc;border-radius:6px;padding:6px 8px;font:inherit}
button{border:1px solid #111;background:#111;color:#fff;border-radius:6px;padding:6px 10px;cursor:pointer}
button.ghost{background:#fff;color:#111}
table{width:100%;border-collapse:collapse;font-size:14px}
td,th{border-bottom:1px solid #eee;text-align:left;padding:6px}
pre{background:#0f172a;color:#e2e8f0;padding:8px;border-radius:6px;overflow:auto;max-height:240px;font-size:12px}
small{color:#666}
</style>
</head>
<body>
<header><span id="healthDot" class="dot"></span><strong>website-to-agent · admin</strong><small id="healthText" style="color:#ccc">checking…</small></header>
<main>
<div class="card"><div class="row">
<label>API <input id="baseUrl" size="26" value="http://localhost:3000" /></label>
<label>Tenant <input id="tenantId" size="14" value="default" /></label>
<label>MCP key <input id="mcpKey" size="22" placeholder="w2a_… (optional)" /></label>
<button id="saveAuth">Save</button>
<button id="refreshAll" class="ghost">Refresh</button>
</div><small>Uses <code>x-tenant-id</code> or <code>x-mcp-key</code> headers. Saved to localStorage.</small></div>

<div class="card"><h3>Workflows</h3>
<div class="row">
<input id="wfName" placeholder="stable_name" />
<input id="wfConn" placeholder="connectionId" size="28" />
<button id="wfCreate">Create</button>
<input id="wfId" placeholder="workflow id" size="28" />
<button id="wfGet" class="ghost">Detail</button>
</div><div class="row" style="margin-top:8px">
<input id="connUrl" placeholder="http://localhost:4100" size="26" />
<button id="connCreate" class="ghost">Add connection</button>
</div>
<table><thead><tr><th>stableName</th><th>id</th><th>status</th><th>actions</th></tr></thead><tbody id="wfRows"></tbody></table>
<pre id="wfDetail">select a workflow…</pre></div>

<div class="card"><h3>Run execution</h3>
<div class="row">
<input id="exWf" placeholder="workflowId" size="28" />
<input id="exInputs" placeholder='inputs JSON {"k":"v"}' size="28" value="{}" />
<button id="exRun">Run</button>
<input id="exId" placeholder="execution id" size="28" />
<button id="exGet" class="ghost">Lookup</button>
</div><pre id="exOut">no runs yet</pre></div>

<div class="card"><h3>Keys</h3>
<div class="row"><input id="keyName" placeholder="key name" /><select id="keyRole"><option>owner</option><option>operator</option><option>viewer</option></select><button id="keyCreate">Create</button><button id="keyList" class="ghost">List</button></div>
<table><thead><tr><th>name</th><th>role</th><th>revoked</th><th>id</th><th></th></tr></thead><tbody id="keyRows"></tbody></table></div>

<div class="card"><h3>Metrics / health</h3><div class="row"><button id="metLoad" class="ghost">Load metrics</button></div><pre id="metOut">—</pre></div>
</main>
<script>
const $=id=>document.getElementById(id);
const store={get:(k,d)=>localStorage.getItem(k)||d,set:(k,v)=>localStorage.setItem(k,v)};
$("baseUrl").value=store.get("w2a.base","http://localhost:3000");
$("tenantId").value=store.get("w2a.tenant","default");
$("mcpKey").value=store.get("w2a.key","");
function auth(){const t=$("tenantId").value.trim(),k=$("mcpKey").value.trim();const h={"content-type":"application/json"};if(k)h["x-mcp-key"]=k;else if(t)h["x-tenant-id"]=t;return h}
function base(){return $("baseUrl").value.replace(/\\/$/,"")}
async function api(path,opts={}){const r=await fetch(base()+path,{...opts,headers:{...auth(),...(opts.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error((j.error||r.status)+" "+path);return j}
async function health(){try{const r=await fetch(base()+"/health");const j=await r.json();$("healthDot").className="dot "+(j.ok?"ok":"bad");$("healthText").textContent=j.ok?"healthy "+base():"unhealthy"}catch(e){$("healthDot").className="dot bad";$("healthText").textContent="unreachable "+e.message}}
async function loadWf(){const j=await api("/workflows");$("wfRows").innerHTML=(j.workflows||[]).map(w=>"<tr><td>"+w.stableName+"</td><td><small>"+w.id+"</small></td><td>"+w.status+"</td><td><button data-act='approve' data-id='"+w.id+"'>approve</button> <button data-act='reject' data-id='"+w.id+"'>reject</button> <button data-act='disable' data-id='"+w.id+"'>disable</button> <button data-act='fill' data-id='"+w.id+"'>run▶</button></td></tr>").join("")||"<tr><td colspan=4>none</td></tr>"}
async function loadKeys(){try{const j=await api("/mcp-keys");$("keyRows").innerHTML=(j.keys||[]).map(k=>"<tr><td>"+k.name+"</td><td>"+k.role+"</td><td>"+k.revoked+"</td><td><small>"+k.id+"</small></td><td>"+(k.revoked?"":"<button data-revoke='"+k.id+"'>revoke</button>")+"</td></tr>").join("")}catch(e){$("keyRows").innerHTML="<tr><td colspan=5>"+e.message+" (owner only)</td></tr>"}}
async function loadMet(){const j=await api("/metrics");$("metOut").textContent=JSON.stringify(j,null,2)}
$("saveAuth").onclick=()=>{store.set("w2a.base",$("baseUrl").value);store.set("w2a.tenant",$("tenantId").value);store.set("w2a.key",$("mcpKey").value);health()};
$("refreshAll").onclick=async()=>{await health();await loadWf().catch(e=>$("wfDetail").textContent=e.message);await loadKeys().catch(()=>{});await loadMet().catch(e=>$("metOut").textContent=e.message)};
$("wfCreate").onclick=async()=>{const j=await api("/workflows",{method:"POST",body:JSON.stringify({stableName:$("wfName").value,connectionId:$("wfConn").value})});$("wfDetail").textContent=JSON.stringify(j,null,2);loadWf()};
$("connCreate").onclick=async()=>{const j=await api("/connections",{method:"POST",body:JSON.stringify({baseUrl:$("connUrl").value})});$("wfConn").value=j.id;$("wfDetail").textContent=JSON.stringify(j,null,2)};
$("wfGet").onclick=async()=>{const j=await api("/workflows/"+$("wfId").value);$("wfDetail").textContent=JSON.stringify(j,null,2)};
$("exRun").onclick=async()=>{let inputs={};try{inputs=JSON.parse($("exInputs").value||"{}")}catch{alert("bad inputs JSON");return}$("exOut").textContent="running…";try{const j=await api("/executions",{method:"POST",body:JSON.stringify({workflowId:$("exWf").value,inputs})});$("exOut").textContent=JSON.stringify(j,null,2);if(j.executionId)$("exId").value=j.executionId}catch(e){$("exOut").textContent=String(e.message)}};
$("exGet").onclick=async()=>{const j=await api("/executions/"+$("exId").value);$("exOut").textContent=JSON.stringify(j,null,2)};
$("keyCreate").onclick=async()=>{const j=await api("/mcp-keys",{method:"POST",body:JSON.stringify({name:$("keyName").value,role:$("keyRole").value})});alert("copy plaintext now: "+j.plaintext);loadKeys()};
$("keyList").onclick=loadKeys;$("metLoad").onclick=()=>loadMet().catch(e=>$("metOut").textContent=e.message);
document.addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.act){const id=b.dataset.id;try{if(b.dataset.act==="fill"){$("exWf").value=id;return}await api("/workflows/"+id+"/"+b.dataset.act,{method:"POST",body:"{}"});loadWf()}catch(err){alert(err.message)}}if(b.dataset.revoke){if(!confirm("revoke key?"))return;await api("/mcp-keys/"+b.dataset.revoke+"/revoke",{method:"POST"});loadKeys()}});
health();loadWf().catch(()=>{});loadMet().catch(()=>{});
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
