import coreWorker from "./gomo-core-worker.js";

const VERSION = "0.1.1-test";

function dashboard() {
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#07131e">
  <title>GoMo Core</title>
  <style>
    *{box-sizing:border-box}html{background:#040b11}body{margin:0;padding:calc(env(safe-area-inset-top,0px) + 20px) 14px calc(env(safe-area-inset-bottom,0px) + 30px);background:radial-gradient(circle at top,#183a4e,#07131e 48%,#040b11);color:#f8f5ea;font:15px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}.wrap{max-width:980px;margin:auto}.top{display:flex;align-items:center;justify-content:space-between;gap:12px}.back{color:#f4ca62;text-decoration:none;font-weight:800}.badge{padding:6px 10px;border:1px solid #8b6e31;border-radius:999px;color:#f4ca62;font-size:.75rem;font-weight:800}h1{margin:22px 0 4px;color:#ffe39a;font-size:clamp(2rem,10vw,3.3rem)}.sub{margin:0 0 18px;color:#acc0cc}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.card{padding:14px;border:1px solid rgba(244,202,98,.28);border-radius:18px;background:rgba(8,27,40,.88)}.card b{display:block;color:#ffe39a;font-size:1.35rem}.card small{color:#9db2bf}.sources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.ok{color:#8de0a1}.err{color:#ffaaa2}.review{color:#ffc978}.high{color:#92e6a4}.medium{color:#ffe08a}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.toolbar button{min-height:44px;padding:0 14px;border:1px solid #96752c;border-radius:999px;background:#102a39;color:#ffe39a;font:inherit;font-weight:800;cursor:pointer}.toolbar button:disabled{opacity:.55}.note{padding:12px 14px;border-radius:15px;background:#0d2230;color:#c7d6df}.table{margin-top:14px;overflow:auto;-webkit-overflow-scrolling:touch;border:1px solid rgba(244,202,98,.22);border-radius:18px;background:#071725}table{width:100%;border-collapse:collapse;min-width:680px}th,td{padding:10px 12px;border-bottom:1px solid #173344;text-align:left}th{position:sticky;top:0;background:#0d2433;color:#ffe39a;z-index:1}@media(max-width:720px){.grid{grid-template-columns:repeat(2,1fr)}.sources{grid-template-columns:1fr}}@media(max-width:390px){body{padding-left:10px;padding-right:10px}.card{padding:12px}.grid{gap:8px}}
  </style>
</head>
<body>
<main class="wrap">
  <div class="top"><a class="back" href="/">← GoMo Central</a><span class="badge">TEST · ${VERSION}</span></div>
  <h1>GoMo Core</h1>
  <p class="sub">Cœur commun de données GoMo · Serveur 1591</p>
  <div class="grid">
    <div class="card"><b id="members">—</b><small>Membres détectés</small></div>
    <div class="card"><b id="matched">—</b><small>Présents dans les 2 sources</small></div>
    <div class="card"><b id="conflicts">—</b><small>À vérifier</small></div>
    <div class="card"><b id="storage">—</b><small>Stockage Core</small></div>
  </div>
  <div class="sources">
    <div class="card"><strong>LastIntel</strong><p id="li">Chargement…</p></div>
    <div class="card"><strong>LastRank</strong><p id="lr">Chargement…</p></div>
  </div>
  <div class="toolbar"><button id="reload" type="button">Actualiser les sources</button></div>
  <p class="note">Mode test : aucune donnée des autres sites n’est modifiée et aucun membre n’est supprimé automatiquement.</p>
  <div class="table"><table><thead><tr><th>Membre</th><th>QG</th><th>Puissance</th><th>Rang</th><th>Source QG</th><th>Confiance</th><th>État</th></tr></thead><tbody id="rows"><tr><td colspan="7">Chargement…</td></tr></tbody></table></div>
</main>
<script>
(() => {
  const nodes = {
    members: document.getElementById('members'),
    matched: document.getElementById('matched'),
    conflicts: document.getElementById('conflicts'),
    storage: document.getElementById('storage'),
    li: document.getElementById('li'),
    lr: document.getElementById('lr'),
    reload: document.getElementById('reload'),
    rows: document.getElementById('rows')
  };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (value) => Number.isFinite(Number(value)) ? new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:1}).format(Number(value)) : '—';

  async function loadStatus() {
    try {
      const response = await fetch('/api/core/status', { cache:'no-store' });
      const data = await response.json();
      nodes.storage.textContent = data.storage?.schemaReady ? 'D1 prêt' : data.storage?.configured ? 'D1 à initialiser' : 'Lecture seule';
    } catch {
      nodes.storage.textContent = 'Erreur';
    }
  }

  async function loadSources() {
    nodes.reload.disabled = true;
    nodes.rows.innerHTML = '<tr><td colspan="7">Synchronisation des sources…</td></tr>';
    try {
      const response = await fetch('/api/core/live', { cache:'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      nodes.members.textContent = data.summary?.unionMembers ?? '—';
      nodes.matched.textContent = data.summary?.matchedBothSources ?? '—';
      nodes.conflicts.textContent = data.summary?.conflicts ?? '—';
      nodes.li.innerHTML = data.sources?.lastIntel?.ok
        ? '<span class="ok">✓ opérationnel</span> · ' + data.sources.lastIntel.memberCount + ' membres'
        : '<span class="err">✗ ' + esc(data.sources?.lastIntel?.error || 'indisponible') + '</span>';
      nodes.lr.innerHTML = data.sources?.lastRank?.ok
        ? '<span class="ok">✓ opérationnel</span> · ' + data.sources.lastRank.memberCount + ' membres'
        : '<span class="err">✗ ' + esc(data.sources?.lastRank?.error || 'indisponible') + '</span>';
      const members = Array.isArray(data.members) ? data.members : [];
      nodes.rows.innerHTML = members.map((member) => {
        const issues = (member.flags || []).filter((flag) => flag.includes('conflict') || flag === 'ambiguous_name');
        return '<tr>' +
          '<td>' + esc(member.name) + '</td>' +
          '<td>' + fmt(member.canonical?.hq) + '</td>' +
          '<td>' + fmt(member.canonical?.power) + '</td>' +
          '<td>' + esc(member.canonical?.rank || '—') + '</td>' +
          '<td>' + esc(member.fieldSources?.hq || '—') + '</td>' +
          '<td class="' + esc(member.confidence?.level || 'review') + '">' + esc(member.confidence?.score ?? '—') + '%</td>' +
          '<td class="' + (issues.length ? 'review' : 'high') + '">' + (issues.length ? '⚠ ' + issues.length : '✓') + '</td>' +
          '</tr>';
      }).join('') || '<tr><td colspan="7">Aucun membre détecté.</td></tr>';
    } catch (error) {
      nodes.rows.innerHTML = '<tr><td colspan="7" class="err">' + esc(error?.message || error) + '</td></tr>';
    } finally {
      nodes.reload.disabled = false;
    }
  }

  nodes.reload.addEventListener('click', loadSources);
  loadStatus();
  loadSources();
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
      "x-gomo-core-version": VERSION
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/core") {
      url.pathname = "/core/";
      return Response.redirect(url.toString(), 308);
    }
    if (url.pathname === "/core/") return dashboard();
    return coreWorker.fetch(request, env, ctx);
  },
  async scheduled(event, env, ctx) {
    if (typeof coreWorker.scheduled === "function") return coreWorker.scheduled(event, env, ctx);
  }
};
