const VERSION = "0.3.0-test";
export const ASSISTANT_RETURN_FALLBACK = "https://gomo-assistant-v2.gjp86wh7p2.workers.dev/";

const ASSISTANT_PRODUCTION_HOST = "gomo-assistant-v2.gjp86wh7p2.workers.dev";
const ASSISTANT_PREVIEW_HOST =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-gomo-assistant-v2\.gjp86wh7p2\.workers\.dev$/;

export function resolveAssistantReturnUrl(value) {
  try {
    const candidate = new URL(value);
    const hostnameAllowed =
      candidate.hostname === ASSISTANT_PRODUCTION_HOST ||
      ASSISTANT_PREVIEW_HOST.test(candidate.hostname);

    if (
      candidate.protocol !== "https:" ||
      !hostnameAllowed ||
      candidate.username ||
      candidate.password ||
      candidate.port
    ) {
      return ASSISTANT_RETURN_FALLBACK;
    }

    return candidate.toString();
  } catch {
    return ASSISTANT_RETURN_FALLBACK;
  }
}

function escapeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function handlePrecisionDashboard(request) {
  const requestUrl = new URL(request.url);
  const assistantReturnUrl = escapeHtmlAttribute(
    resolveAssistantReturnUrl(requestUrl.searchParams.get("returnUrl")),
  );
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#07131e">
  <title>GoMo Core Precision</title>
  <style>
    *{box-sizing:border-box}html{background:#040b11}body{margin:0;padding:calc(env(safe-area-inset-top,0px) + 20px) 12px calc(env(safe-area-inset-bottom,0px) + 30px);background:radial-gradient(circle at top,#183a4e,#07131e 48%,#040b11);color:#f8f5ea;font:15px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}.wrap{max-width:1180px;margin:auto}.top{display:flex;align-items:center;justify-content:space-between;gap:12px}.back{min-height:44px;padding:0 12px;display:inline-flex;align-items:center;border:1px solid #8b6e31;border-radius:999px;color:#f4ca62;background:rgba(8,27,40,.85);text-decoration:none;font-weight:800}.badge{padding:6px 10px;border:1px solid #8b6e31;border-radius:999px;color:#f4ca62;font-size:.75rem;font-weight:800}h1{margin:22px 0 4px;color:#ffe39a;font-size:clamp(2rem,9vw,3.2rem)}.sub{margin:0 0 16px;color:#acc0cc}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px}.card{padding:13px;border:1px solid rgba(244,202,98,.28);border-radius:17px;background:rgba(8,27,40,.9)}.card b{display:block;color:#ffe39a;font-size:1.3rem}.card small{color:#9db2bf}.sources{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:10px}.ok{color:#8de0a1}.err{color:#ffaaa2}.review{color:#ffc978}.info{color:#8ec9ff}.high{color:#92e6a4}.medium{color:#ffe08a}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.toolbar button{min-height:44px;padding:0 14px;border:1px solid #96752c;border-radius:999px;background:#102a39;color:#ffe39a;font:inherit;font-weight:800;cursor:pointer}.toolbar button:disabled{opacity:.55}.note{padding:12px 14px;border-radius:15px;background:#0d2230;color:#c7d6df}.detail{margin-top:7px;color:#9fb8c7;font-size:.84rem}.table{margin-top:14px;overflow:auto;-webkit-overflow-scrolling:touch;border:1px solid rgba(244,202,98,.22);border-radius:18px;background:#071725}table{width:100%;border-collapse:collapse;min-width:1120px}th,td{padding:9px 10px;border-bottom:1px solid #173344;text-align:left;vertical-align:top}th{position:sticky;top:0;background:#0d2433;color:#ffe39a;z-index:1}.pill{display:inline-block;padding:3px 7px;border-radius:999px;background:#102b3b;font-size:.75rem}.score{font-weight:800}.reason{display:block;margin-top:3px;color:#8fa9b7;font-size:.72rem;max-width:210px}.anom{color:#ffc978;font-weight:800}@media(max-width:950px){.grid{grid-template-columns:repeat(3,1fr)}.sources{grid-template-columns:1fr}}@media(max-width:520px){.grid{grid-template-columns:repeat(2,1fr)}body{padding-left:9px;padding-right:9px}.card{padding:11px}.grid{gap:7px}}
  </style>
</head>
<body>
<main class="wrap">
  <div class="top"><a class="back" href="${assistantReturnUrl}">← GoMo Assistant</a><span class="badge">TEST · ${VERSION}</span></div>
  <h1>GoMo Core</h1>
  <p class="sub">Moteur de précision multi-source · Serveur 1591</p>
  <div class="grid">
    <div class="card"><b id="members">—</b><small>Membres Core</small></div>
    <div class="card"><b id="avg">—</b><small>Confiance moyenne</small></div>
    <div class="card"><b id="high">—</b><small>Membres ≥ 90 %</small></div>
    <div class="card"><b id="anomalies">—</b><small>Anomalies historiques</small></div>
    <div class="card"><b id="review">—</b><small>Membres à revoir</small></div>
    <div class="card"><b id="stale">—</b><small>Sources à surveiller</small></div>
  </div>
  <div class="sources">
    <div class="card"><strong>LastIntel</strong><p id="li">Chargement…</p><div class="detail" id="liHealth"></div></div>
    <div class="card"><strong>LastRank</strong><p id="lr">Chargement…</p><div class="detail" id="lrHealth"></div></div>
    <div class="card"><strong>LastWarRank</strong><p id="lwr">Chargement…</p><div class="detail" id="lwrHealth"></div></div>
  </div>
  <div class="toolbar"><button id="reload" type="button">Actualiser le moteur</button></div>
  <div class="note">GoMo Core ne copie plus simplement une source : il combine consensus, fraîcheur, cohérence inter-sources et historique D1. Les observations brutes restent conservées séparément.<div class="detail" id="fields">Confiance par champ : —</div><div class="detail" id="history">Historique : —</div></div>
  <div class="table"><table><thead><tr><th>Membre</th><th>QG</th><th>Conf. QG</th><th>Puissance</th><th>Conf. Power</th><th>Hero Power</th><th>Conf. Hero</th><th>Rang</th><th>Conf. Rang</th><th>État</th></tr></thead><tbody id="rows"><tr><td colspan="10">Chargement…</td></tr></tbody></table></div>
</main>
<script>
(() => {
  const $=(id)=>document.getElementById(id);
  const n={members:$('members'),avg:$('avg'),high:$('high'),anomalies:$('anomalies'),review:$('review'),stale:$('stale'),li:$('li'),lr:$('lr'),lwr:$('lwr'),liHealth:$('liHealth'),lrHealth:$('lrHealth'),lwrHealth:$('lwrHealth'),reload:$('reload'),rows:$('rows'),fields:$('fields'),history:$('history')};
  const esc=(value)=>String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(value)=>Number.isFinite(Number(value))?new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:2}).format(Number(value)):'—';
  const classFor=(score)=>Number(score)>=90?'high':Number(score)>=70?'medium':'review';
  const scoreCell=(field)=>{if(!field)return '—';const reasons=(field.reasons||[]).slice(0,2).join(' · ');return '<span class="score '+classFor(field.score)+'">'+esc(field.score)+'%</span><span class="reason">'+esc(field.decision||'')+(reasons?' — '+esc(reasons):'')+'</span>';};
  const health=(source)=>source?.ok?'<span class="ok">✓ opérationnel</span> · '+esc(source.memberCount)+' membres':'<span class="err">✗ '+esc(source?.error||'indisponible')+'</span>';
  const healthDetail=(item)=>item?'Santé '+item.score+'% · couverture '+item.coveragePercent+'% · '+(item.ageMinutes==null?'âge inconnu':item.ageMinutes+' min')+(item.hqAgreement?.supportPercent!=null?' · QG '+item.hqAgreement.supportPercent+'% confirmés':''):'';

  async function load(){
    n.reload.disabled=true;n.rows.innerHTML='<tr><td colspan="10">Analyse des 3 sources et de l’historique…</td></tr>';
    try{
      const response=await fetch('/api/core/precision',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Erreur');
      const members=Array.isArray(data.members)?data.members:[];const p=data.precision||{};const s=data.summary||{};
      n.members.textContent=s.unionMembers??members.length;n.avg.textContent=(s.precisionAverage??'—')+'%';n.high.textContent=s.highConfidenceMembers??0;n.anomalies.textContent=s.anomalyMembers??0;n.review.textContent=s.reviewMembers??0;n.stale.textContent=s.staleSources??0;
      n.li.innerHTML=health(data.sources?.lastIntel);n.lr.innerHTML=health(data.sources?.lastRank);n.lwr.innerHTML=health(data.sources?.lastWarRank);
      n.liHealth.textContent=healthDetail(p.sourceHealth?.lastIntel);n.lrHealth.textContent=healthDetail(p.sourceHealth?.lastRank);n.lwrHealth.textContent=healthDetail(p.sourceHealth?.lastWarRank);
      const f=p.fieldAverageConfidence||{};n.fields.textContent='Confiance moyenne — QG '+(f.hq??'—')+'% · Power '+(f.power??'—')+'% · Hero '+(f.heroPower??'—')+'% · Rang '+(f.rank??'—')+'%';
      n.history.textContent=p.historyAvailable?'Historique D1 actif · '+(p.historyRowsRead??0)+' lignes analysées sur '+(p.historyWindowHours??24)+' h':'Historique D1 indisponible'+(p.historyError?' · '+p.historyError:'');
      n.rows.innerHTML=members.map((m)=>{const fc=m.fieldConfidence||{};const anomalies=Array.isArray(m.anomalies)?m.anomalies:[];const state=anomalies.length?'<span class="anom">⚠ '+anomalies.length+'</span>':Number(m.confidence?.score)>=90?'<span class="high">✓ '+esc(m.confidence.score)+'%</span>':'<span class="'+classFor(m.confidence?.score)+'">'+esc(m.confidence?.score??'—')+'%</span>';return '<tr><td>'+esc(m.name)+'</td><td>'+fmt(m.canonical?.hq)+'</td><td>'+scoreCell(fc.hq)+'</td><td>'+fmt(m.canonical?.power)+'</td><td>'+scoreCell(fc.power)+'</td><td>'+fmt(m.canonical?.heroPower)+'</td><td>'+scoreCell(fc.heroPower)+'</td><td>'+esc(m.canonical?.rank||'—')+'</td><td>'+scoreCell(fc.rank)+'</td><td>'+state+(anomalies[0]?'<span class="reason">'+esc(anomalies[0].message)+'</span>':'')+'</td></tr>';}).join('')||'<tr><td colspan="10">Aucun membre détecté.</td></tr>';
    }catch(error){n.rows.innerHTML='<tr><td colspan="10" class="err">'+esc(error?.message||error)+'</td></tr>';}finally{n.reload.disabled=false;}
  }
  n.reload.addEventListener('click',load);load();
})();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; base-uri 'self'; frame-ancestors 'none'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "x-robots-tag": "noindex, nofollow",
      "x-gomo-core-version": VERSION,
    },
  });
}
