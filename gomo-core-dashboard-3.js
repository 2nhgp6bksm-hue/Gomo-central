const VERSION = "0.2.0-test";

export function handleThreeSourceDashboard() {
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#07131e">
  <title>GoMo Core</title>
  <style>
    *{box-sizing:border-box}html{background:#040b11}body{margin:0;padding:calc(env(safe-area-inset-top,0px) + 20px) 14px calc(env(safe-area-inset-bottom,0px) + 30px);background:radial-gradient(circle at top,#183a4e,#07131e 48%,#040b11);color:#f8f5ea;font:15px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}.wrap{max-width:1100px;margin:auto}.top{display:flex;align-items:center;justify-content:space-between;gap:12px}.back{color:#f4ca62;text-decoration:none;font-weight:800}.badge{padding:6px 10px;border:1px solid #8b6e31;border-radius:999px;color:#f4ca62;font-size:.75rem;font-weight:800}h1{margin:22px 0 4px;color:#ffe39a;font-size:clamp(2rem,10vw,3.3rem)}.sub{margin:0 0 18px;color:#acc0cc}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.card{padding:14px;border:1px solid rgba(244,202,98,.28);border-radius:18px;background:rgba(8,27,40,.88)}.card b{display:block;color:#ffe39a;font-size:1.35rem}.card small{color:#9db2bf}.sources{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.ok{color:#8de0a1}.err{color:#ffaaa2}.review{color:#ffc978}.info{color:#8ec9ff}.high{color:#92e6a4}.medium{color:#ffe08a}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.toolbar button{min-height:44px;padding:0 14px;border:1px solid #96752c;border-radius:999px;background:#102a39;color:#ffe39a;font:inherit;font-weight:800;cursor:pointer}.toolbar button:disabled{opacity:.55}.note{padding:12px 14px;border-radius:15px;background:#0d2230;color:#c7d6df}.detail{margin-top:8px;color:#9fb8c7;font-size:.84rem}.table{margin-top:14px;overflow:auto;-webkit-overflow-scrolling:touch;border:1px solid rgba(244,202,98,.22);border-radius:18px;background:#071725}table{width:100%;border-collapse:collapse;min-width:1050px}th,td{padding:10px 12px;border-bottom:1px solid #173344;text-align:left}th{position:sticky;top:0;background:#0d2433;color:#ffe39a;z-index:1}.pill{display:inline-block;padding:3px 8px;border-radius:999px;background:#102b3b;font-size:.78rem}@media(max-width:900px){.grid{grid-template-columns:repeat(3,1fr)}.sources{grid-template-columns:1fr}}@media(max-width:520px){.grid{grid-template-columns:repeat(2,1fr)}body{padding-left:10px;padding-right:10px}.card{padding:12px}.grid{gap:8px}}
  </style>
</head>
<body>
<main class="wrap">
  <div class="top"><a class="back" href="/">← GoMo Central</a><span class="badge">TEST · ${VERSION}</span></div>
  <h1>GoMo Core</h1>
  <p class="sub">Cœur commun de données GoMo · 3 sources · Serveur 1591</p>
  <div class="grid">
    <div class="card"><b id="members">—</b><small>Membres Core</small></div>
    <div class="card"><b id="lwrMatched">—</b><small>LastWarRank appariés</small></div>
    <div class="card"><b id="hq2">—</b><small>QG confirmés 2/3</small></div>
    <div class="card"><b id="hq3">—</b><small>QG confirmés 3/3</small></div>
    <div class="card"><b id="hqReview">—</b><small>QG à vérifier</small></div>
    <div class="card"><b id="rankReview">—</b><small>Rangs à vérifier</small></div>
  </div>
  <div class="sources">
    <div class="card"><strong>LastIntel</strong><p id="li">Chargement…</p></div>
    <div class="card"><strong>LastRank</strong><p id="lr">Chargement…</p></div>
    <div class="card"><strong>LastWarRank</strong><p id="lwr">Chargement…</p></div>
  </div>
  <div class="toolbar"><button id="reload" type="button">Actualiser les 3 sources</button></div>
  <div class="note">Mode test : QG par consensus 2/3, puissance et Hero Power par source la plus fraîche. Les valeurs originales de chaque source restent conservées lors des synchronisations D1.<div class="detail" id="diffs">Écarts : —</div><div class="detail" id="freshness">Fraîcheur : —</div></div>
  <div class="table"><table><thead><tr><th>Membre</th><th>QG</th><th>Consensus QG</th><th>Puissance</th><th>Source Power</th><th>Hero Power</th><th>Rang</th><th>Source QG</th><th>Confiance</th><th>État</th></tr></thead><tbody id="rows"><tr><td colspan="10">Chargement…</td></tr></tbody></table></div>
</main>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const nodes = {members:$('members'),lwrMatched:$('lwrMatched'),hq2:$('hq2'),hq3:$('hq3'),hqReview:$('hqReview'),rankReview:$('rankReview'),li:$('li'),lr:$('lr'),lwr:$('lwr'),reload:$('reload'),rows:$('rows'),diffs:$('diffs'),freshness:$('freshness')};
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (value) => Number.isFinite(Number(value)) ? new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:2}).format(Number(value)) : '—';
  const src = (value) => value ? String(value).replace('consensus:','').replaceAll('+',' + ') : '—';
  const date = (value) => value ? new Date(value).toLocaleString('fr-BE',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}) : '—';

  async function load(){
    nodes.reload.disabled=true;
    nodes.rows.innerHTML='<tr><td colspan="10">Synchronisation des 3 sources…</td></tr>';
    try{
      const response=await fetch('/api/core/live',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Erreur');
      const members=Array.isArray(data.members)?data.members:[];
      nodes.members.textContent=data.summary?.unionMembers??members.length;
      nodes.lwrMatched.textContent=data.summary?.matchedLastWarRank??0;
      nodes.hq2.textContent=data.summary?.hqConfirmed2of3??0;
      nodes.hq3.textContent=data.summary?.hqConfirmed3of3??0;
      nodes.hqReview.textContent=data.summary?.hqUnresolved??0;
      nodes.rankReview.textContent=data.summary?.rankConflicts??0;
      const sourceLine=(source)=>source?.ok?'<span class="ok">✓ opérationnel</span> · '+source.memberCount+' membres':'<span class="err">✗ '+esc(source?.error||'indisponible')+'</span>';
      nodes.li.innerHTML=sourceLine(data.sources?.lastIntel);
      nodes.lr.innerHTML=sourceLine(data.sources?.lastRank);
      nodes.lwr.innerHTML=sourceLine(data.sources?.lastWarRank);
      nodes.diffs.textContent='Écarts puissance : '+(data.summary?.powerDifferences??0)+' · Hero Power : '+(data.summary?.heroPowerDifferences??0);
      nodes.freshness.textContent='Fraîcheur — LastIntel '+date(data.sources?.lastIntel?.updatedAt)+' · LastRank '+date(data.sources?.lastRank?.updatedAt)+' · LastWarRank '+date(data.sources?.lastWarRank?.updatedAt);
      nodes.rows.innerHTML=members.map((member)=>{
        const vote=member.comparison?.hq;
        const qgConsensus=vote?.status==='agree_3_of_3'?'3/3':vote?.status==='agree_2_of_3'?'2/3':vote?.status==='agree_2_of_2'?'2 sources':vote?.status==='all_three_different'?'⚠ 3 valeurs':'—';
        const critical=(member.flags||[]).filter((flag)=>['hq_conflict','hq_conflict_3way','rank_conflict','ambiguous_name'].includes(flag));
        const informative=(member.flags||[]).some((flag)=>flag==='power_conflict'||flag==='hero_power_conflict');
        const stateClass=critical.length?'review':informative?'info':'high';
        const stateText=critical.length?'⚠ '+critical.length:informative?'≈':'✓';
        return '<tr><td>'+esc(member.name)+'</td><td>'+fmt(member.canonical?.hq)+'</td><td><span class="pill">'+esc(qgConsensus)+'</span></td><td>'+fmt(member.canonical?.power)+'</td><td>'+esc(src(member.fieldSources?.power))+'</td><td>'+fmt(member.canonical?.heroPower)+'</td><td>'+esc(member.canonical?.rank||'—')+'</td><td>'+esc(src(member.fieldSources?.hq))+'</td><td class="'+esc(member.confidence?.level||'review')+'">'+esc(member.confidence?.score??'—')+'%</td><td class="'+stateClass+'">'+stateText+'</td></tr>';
      }).join('')||'<tr><td colspan="10">Aucun membre détecté.</td></tr>';
    }catch(error){
      nodes.rows.innerHTML='<tr><td colspan="10" class="err">'+esc(error?.message||error)+'</td></tr>';
    }finally{nodes.reload.disabled=false;}
  }
  nodes.reload.addEventListener('click',load);
  load();
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
