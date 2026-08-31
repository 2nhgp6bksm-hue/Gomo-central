import fs from 'node:fs';
import path from 'node:path';
import coreWorker from '../gomo-core-worker.js';

const API_BASE = process.env.LASTWAR_TOOLS_API_BASE || 'https://api.lastwar.tools';
const API_KEY = (process.env.LASTWAR_TOOLS_API_KEY || '').trim();
const ALLIANCE_ID = process.env.LASTWAR_TOOLS_ALLIANCE_ID || '26227dc9fb2945edaee8c7675c8fed5d';
const MAX_COST = Number(process.env.LASTWAR_TOOLS_MAX_COST || 2);
const EXPECTED_COST = Number(process.env.LASTWAR_TOOLS_EXPECTED_COST || 2);

if (!API_KEY || /[\r\n]/.test(API_KEY)) {
  throw new Error('Invalid LASTWAR_TOOLS_API_KEY format; no paid request sent.');
}

const norm = (v) => String(v ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const rankNum = (v) => { const n = Number.parseInt(String(v ?? '').replace(/^R/i,''),10); return n>=1&&n<=5?n:null; };
const pct = (a,b) => Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Number(a)!==0 ? ((Number(b)-Number(a))/Math.abs(Number(a)))*100 : null;
const median = (xs) => { const a=xs.filter(Number.isFinite).sort((x,y)=>x-y); if(!a.length)return null; const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; };
const meanAbs = (xs) => { const a=xs.filter(Number.isFinite).map(Math.abs); return a.length?a.reduce((s,x)=>s+x,0)/a.length:null; };
const fieldValue = (source, member, field) => source==='lwt' && field==='hq' ? member?.hq_level : member?.[field];

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

// Fresh read of LastIntel + LastRank only. GET /api/core/live does not write D1.
const liveResponse = await coreWorker.fetch(new Request('https://sync.invalid/api/core/live'), {}, { waitUntil(){} });
const live = await liveResponse.json();
if (!liveResponse.ok) throw new Error(`Live LastIntel/LastRank read failed: ${live?.error || liveResponse.status}`);

const headers = { Accept: 'application/json', 'X-API-Key': API_KEY };
const validation = await fetch(new URL('/auth/validate', API_BASE), { headers });
if (!validation.ok) {
  const body = await validation.text();
  throw new Error(`API key validation failed ${validation.status}; paid request NOT sent. ${body.slice(0,300)}`);
}

const discovered = await tryDiscoverCost();
const effectiveCost = discovered.cost ?? EXPECTED_COST;
if (!Number.isFinite(effectiveCost) || effectiveCost > MAX_COST) {
  throw new Error(`Alliance Members cost ${effectiveCost} exceeds maximum ${MAX_COST}; paid request NOT sent.`);
}

console.log(`LastWar Tools key valid. Cost gate passed (${effectiveCost} token(s), max ${MAX_COST}). Sending one Alliance Members request.`);
const lwtUrl = new URL(`/alliance/${ALLIANCE_ID}/members`, API_BASE);
lwtUrl.searchParams.set('sort_by', 'power');
lwtUrl.searchParams.set('descending', 'true');
const lwtResponse = await fetch(lwtUrl, { headers });
if (!lwtResponse.ok) {
  const body = await lwtResponse.text();
  throw new Error(`LastWar Tools request failed ${lwtResponse.status}: ${body.slice(0,500)}`);
}
const lwtRaw = await lwtResponse.json();
const lwtCapturedAt = new Date().toISOString();
const lwtMembers = (Array.isArray(lwtRaw?.members) ? lwtRaw.members : []).map(m => ({
  uid:m.uid??null,name:m.name??null,hq_level:m.hq_level??null,power:m.power??null,rank:m.rank??null,
  server_id:m.server_id??null,current_server_id:m.current_server_id??null
}));
const liMembers = (live.members || []).map(m=>m.sources?.lastIntel).filter(Boolean);
const lrMembers = (live.members || []).map(m=>m.sources?.lastRank).filter(Boolean);

const entities=[];
const byUid=new Map(), byName=new Map();
function addIndex(e,name,uid){ if(uid) byUid.set(String(uid),e); const k=norm(name); if(k){const a=byName.get(k)||[]; if(!a.includes(e))a.push(e); byName.set(k,a);} }
for(const m of lwtMembers){ const e={lwt:m,li:null,lr:null}; entities.push(e); addIndex(e,m.name,m.uid); }
function attach(source,m){ const uid=m.sourceId?String(m.sourceId):null; let e=uid?byUid.get(uid):null; if(!e){const matches=byName.get(norm(m.name))||[]; if(matches.length===1)e=matches[0];} if(e&&!e[source]){e[source]=m;addIndex(e,m.name,uid);return;} const ne={lwt:null,li:null,lr:null,[source]:m};entities.push(ne);addIndex(ne,m.name,uid); }
for(const m of liMembers) attach('li',m);
for(const m of lrMembers) attach('lr',m);

const name=e=>e.lwt?.name||e.li?.name||e.lr?.name||'Unknown';
const present=(e,s)=>Boolean(e[s]);
const only=s=>entities.filter(e=>present(e,s)&&['lwt','li','lr'].filter(x=>x!==s).every(x=>!present(e,x))).map(name).sort();
const missingFrom=s=>entities.filter(e=>!present(e,s)&&['lwt','li','lr'].some(x=>x!==s&&present(e,x))).map(name).sort();

function pairStats(a,b,field,transform=x=>x){let comparable=0,mismatch=0;const differences=[];for(const e of entities){const A=e[a],B=e[b];if(!A||!B)continue;const x=transform(fieldValue(a,A,field)),y=transform(fieldValue(b,B,field));if(x==null||y==null)continue;comparable++;if(x!==y){mismatch++;differences.push({name:name(e),[a]:x,[b]:y});}}return{comparable,mismatch,agree:comparable-mismatch,differences};}
function powerPair(a,b){const rel=[];let comparable=0;const largest=[];for(const e of entities){const A=e[a],B=e[b];if(!A||!B)continue;const d=pct(A.power,B.power);if(d==null)continue;comparable++;rel.push(d);largest.push({name:name(e),pct:d,[a]:A.power,[b]:B.power});}largest.sort((x,y)=>Math.abs(y.pct)-Math.abs(x.pct));return{comparable,medianPercentChange:median(rel),meanAbsolutePercentDifference:meanAbs(rel),largestDifferences:largest.slice(0,15)};}

const hqLwtLi=pairStats('lwt','li','hq'); const hqLwtLr=pairStats('lwt','lr','hq'); const hqLiLr=pairStats('li','lr','hq');
const rankLwtLi=pairStats('lwt','li','rank',rankNum); const rankLwtLr=pairStats('lwt','lr','rank',rankNum); const rankLiLr=pairStats('li','lr','rank',rankNum);

const uidRenames=[];
for(const e of entities){for(const [a,b,A,B] of [['LastWar Tools','LastIntel',e.lwt,e.li],['LastWar Tools','LastRank',e.lwt,e.lr],['LastIntel','LastRank',e.li,e.lr]]){if(!A||!B)continue;const ua=A.uid??A.sourceId,ub=B.uid??B.sourceId;if(ua!=null&&ub!=null&&String(ua)===String(ub)&&norm(A.name)!==norm(B.name))uidRenames.push({uid:String(ua),sourceA:a,nameA:A.name,sourceB:b,nameB:B.name});}}

const allMembers = entities.map(e=>({
  name:name(e),
  lastWarTools:e.lwt?{uid:e.lwt.uid,hq:e.lwt.hq_level,power:e.lwt.power,rank:rankNum(e.lwt.rank)}:null,
  lastIntel:e.li?{uid:e.li.sourceId??null,hq:e.li.hq??null,power:e.li.power??null,rank:rankNum(e.li.rank)}:null,
  lastRank:e.lr?{uid:e.lr.sourceId??null,hq:e.lr.hq??null,power:e.lr.power??null,rank:rankNum(e.lr.rank)}:null,
}));

const anomalies=[];
for(const e of entities){
  if(e.lwt&&e.li&&e.lr){const a=Number(e.lwt.hq_level),b=Number(e.li.hq),c=Number(e.lr.hq);if(Number.isFinite(a)&&Number.isFinite(b)&&Number.isFinite(c)&&a===b&&c!==a) anomalies.push({type:'hq_lastRank_outlier',name:name(e),lastWarTools:a,lastIntel:b,lastRank:c});}
  if(e.lwt&&e.lr){const d=pct(e.lwt.power,e.lr.power);if(Number.isFinite(d)&&Math.abs(d)>=15) anomalies.push({type:'power_gap_lwt_lastRank',name:name(e),percent:d,lastWarTools:e.lwt.power,lastRank:e.lr.power});}
}
for(const n of only('lr')) anomalies.push({type:'member_only_lastRank',name:n});
for(const r of uidRenames) anomalies.push({type:'uid_name_change',...r});

const sums={
  lastWarTools:lwtMembers.reduce((s,m)=>s+(Number(m.power)||0),0),
  lastIntel:liMembers.reduce((s,m)=>s+(Number(m.power)||0),0),
  lastRank:lrMembers.reduce((s,m)=>s+(Number(m.power)||0),0),
};

const report={
  generatedAt:new Date().toISOString(),environment:'test-only',branch:'test/lastwar-tools-comparison',
  safeguards:{mainTouched:false,productionTouched:false,productionD1Touched:false,lastWarToolsValidationFree:true,lastWarToolsPaidRequests:1,maxAllowedCost:MAX_COST,effectiveCost,costSource:discovered.source||'configured-known-cost'},
  sources:{
    lastWarTools:{capturedAt:lwtCapturedAt,memberCount:lwtMembers.length,reportedCount:lwtRaw?.member_count??null,totalPowerReported:lwtRaw?.total_power??null,totalPowerSummed:sums.lastWarTools},
    lastIntel:{updatedAt:live.sources?.lastIntel?.updatedAt??null,memberCount:liMembers.length,totalPowerSummed:sums.lastIntel,ok:live.sources?.lastIntel?.ok??false},
    lastRank:{updatedAt:live.sources?.lastRank?.updatedAt??null,memberCount:lrMembers.length,totalPowerSummed:sums.lastRank,ok:live.sources?.lastRank?.ok??false}
  },
  membership:{union:entities.length,presentAll3:entities.filter(e=>e.lwt&&e.li&&e.lr).length,only:{lastWarTools:only('lwt'),lastIntel:only('li'),lastRank:only('lr')},missingFrom:{lastWarTools:missingFrom('lwt'),lastIntel:missingFrom('li'),lastRank:missingFrom('lr')}},
  hq:{lastWarTools_vs_lastIntel:hqLwtLi,lastWarTools_vs_lastRank:hqLwtLr,lastIntel_vs_lastRank:hqLiLr},
  rank:{lastWarTools_vs_lastIntel:rankLwtLi,lastWarTools_vs_lastRank:rankLwtLr,lastIntel_vs_lastRank:rankLiLr},
  power:{lastWarTools_vs_lastIntel:powerPair('lwt','li'),lastWarTools_vs_lastRank:powerPair('lwt','lr'),lastIntel_vs_lastRank:powerPair('li','lr')},
  uidRenames:[...new Map(uidRenames.map(x=>[`${x.uid}|${x.sourceA}|${x.sourceB}`,x])).values()],
  anomalies, members:allMembers
};

const latestPath='tests/sync-results/latest.json';
const stamp=report.generatedAt.replace(/[:.]/g,'-');
const historyPath=`tests/sync-results/history/source-sync-${stamp}.json`;
fs.mkdirSync(path.dirname(latestPath),{recursive:true});
fs.mkdirSync(path.dirname(historyPath),{recursive:true});
const text=JSON.stringify(report,null,2)+'\n';
fs.writeFileSync(latestPath,text); fs.writeFileSync(historyPath,text);
console.log('=== GOMO_SOURCE_SYNC_SUMMARY ===');
console.log(JSON.stringify({generatedAt:report.generatedAt,safeguards:report.safeguards,sources:report.sources,membership:report.membership,hq:{lwt_li:{comparable:hqLwtLi.comparable,mismatch:hqLwtLi.mismatch},lwt_lr:{comparable:hqLwtLr.comparable,mismatch:hqLwtLr.mismatch},li_lr:{comparable:hqLiLr.comparable,mismatch:hqLiLr.mismatch}},rank:{lwt_li:{comparable:rankLwtLi.comparable,mismatch:rankLwtLi.mismatch},lwt_lr:{comparable:rankLwtLr.comparable,mismatch:rankLwtLr.mismatch},li_lr:{comparable:rankLiLr.comparable,mismatch:rankLiLr.mismatch}},power:report.power,uidRenames:report.uidRenames,anomalyCount:anomalies.length,historyPath},null,2));
