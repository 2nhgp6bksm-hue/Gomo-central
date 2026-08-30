const API_BASE = process.env.LASTWAR_TOOLS_API_BASE || 'https://api.lastwar.tools';
const API_KEY = process.env.LASTWAR_TOOLS_API_KEY;
const ALLIANCE_ID = process.env.LASTWAR_TOOLS_ALLIANCE_ID || '26227dc9fb2945edaee8c7675c8fed5d';

if (!API_KEY) {
  console.error('Missing LASTWAR_TOOLS_API_KEY. No request was sent.');
  process.exit(2);
}

const url = new URL(`/alliance/${ALLIANCE_ID}/members`, API_BASE);
url.searchParams.set('sort_by', 'power');
url.searchParams.set('descending', 'true');

const response = await fetch(url, {
  headers: {
    'Accept': 'application/json',
    'X-API-Key': API_KEY,
  },
});

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
  fields_checked: [
    'uid',
    'name',
    'hq_level',
    'power',
    'rank',
    'server_id',
    'current_server_id',
    'online',
    'join_time',
    'offline_time',
    'army_kill',
    'career_type',
    'career_level',
  ],
};

console.log(JSON.stringify({ summary, members: normalized }, null, 2));
