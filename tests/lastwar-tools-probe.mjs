const API_BASE = process.env.LASTWAR_TOOLS_API_BASE || 'https://api.lastwar.tools';
const RAW_API_KEY = process.env.LASTWAR_TOOLS_API_KEY || '';
const API_KEY = RAW_API_KEY.trim();
const ALLIANCE_ID = process.env.LASTWAR_TOOLS_ALLIANCE_ID || '26227dc9fb2945edaee8c7675c8fed5d';
const MAX_COST = Number(process.env.LASTWAR_TOOLS_MAX_COST || 2);
const EXPECTED_COST = Number(process.env.LASTWAR_TOOLS_EXPECTED_COST || 2);

if (!API_KEY) {
  console.error('Missing LASTWAR_TOOLS_API_KEY. No request was sent.');
  process.exit(2);
}

if (/[\r\n]/.test(API_KEY)) {
  console.error('LASTWAR_TOOLS_API_KEY must contain exactly one line. No request was sent.');
  process.exit(2);
}

const headers = {
  Accept: 'application/json',
  'X-API-Key': API_KEY,
};

async function tryDiscoverCost() {
  for (const p of ['/openapi.json', '/docs/openapi.json']) {
    try {
      const r = await fetch(new URL(p, API_BASE), { headers: { Accept: 'application/json' } });
      if (!r.ok) continue;
      const doc = await r.json();
      const op = doc?.paths?.['/alliance/{alliance_id}/members']?.get;
      if (!op) continue;
      const candidates = [];
      const walk = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        for (const [k,v] of Object.entries(obj)) {
          if (/cost|token/i.test(k) && Number.isFinite(Number(v))) candidates.push(Number(v));
          if (v && typeof v === 'object') walk(v);
        }
      };
      walk(op);
      if (candidates.length) return { cost: Math.max(...candidates), source: p };
    } catch {}
  }
  return { cost: null, source: null };
}

// Free preflight: Last War Tools documents /auth/validate as not deducting tokens.
const validation = await fetch(new URL('/auth/validate', API_BASE), { headers });
if (!validation.ok) {
  const body = await validation.text();
  console.error(`API key validation failed: ${validation.status} ${validation.statusText}`);
  console.error(body.slice(0, 1000));
  console.error('Alliance Members request was NOT sent.');
  process.exit(1);
}

const discovered = await tryDiscoverCost();
const effectiveCost = discovered.cost ?? EXPECTED_COST;
if (!Number.isFinite(effectiveCost) || effectiveCost > MAX_COST) {
  console.error(`Alliance Members cost ${effectiveCost} exceeds maximum ${MAX_COST}. No paid request was sent.`);
  process.exit(3);
}
console.log(`API key validation succeeded. Cost gate passed (${effectiveCost} token(s), max ${MAX_COST}). Sending exactly one Alliance Members request.`);

const url = new URL(`/alliance/${ALLIANCE_ID}/members`, API_BASE);
url.searchParams.set('sort_by', 'power');
url.searchParams.set('descending', 'true');

const response = await fetch(url, { headers });
if (!response.ok) {
  const body = await response.text();
  console.error(`LastWar Tools request failed: ${response.status} ${response.statusText}`);
  console.error(body.slice(0, 1000));
  process.exit(1);
}

const data = await response.json();
const members = Array.isArray(data?.members) ? data.members : [];
const normalized = members.map((member) => ({
  uid: member.uid ?? null,
  name: member.name ?? null,
  hq_level: member.hq_level ?? null,
  power: member.power ?? null,
  rank: member.rank ?? null,
  server_id: member.server_id ?? null,
  current_server_id: member.current_server_id ?? null,
  online: member.online ?? null,
  join_time: member.join_time ?? null,
  offline_time: member.offline_time ?? null,
  army_kill: member.army_kill ?? null,
  career_type: member.career_type ?? null,
  career_level: member.career_level ?? null,
}));

const summary = {
  source: 'lastwar-tools',
  alliance_id: data?.alliance_id ?? ALLIANCE_ID,
  member_count_reported: data?.member_count ?? null,
  member_count_received: normalized.length,
  total_power: data?.total_power ?? null,
  members_with_positions: data?.members_with_positions ?? null,
  effective_cost: effectiveCost,
  cost_source: discovered.source || 'configured-known-cost',
};

console.log(JSON.stringify({ summary, members: normalized }, null, 2));
