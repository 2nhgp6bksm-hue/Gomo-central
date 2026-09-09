import fs from 'node:fs';
import coreWorker from '../gomo-core-worker.js';

const stored = JSON.parse(fs.readFileSync('tests/sync-results/latest.json','utf8'));
const norm = v => String(v ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const rankNum = v => { const n=Number.parseInt(String(v??'').replace(/^R/i,''),10); return n>=1&&n<=5?n:null; };
const pct = (a,b) => Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Number(a)!==0 ? ((Number(b)-Number(a))/Math.abs(Number(a)))*100 : null;
const median = xs => { const a=xs.filter(Number.isFinite).sort((x,y)=>x-y); if(!a.length)return null; const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; };
const meanAbs = xs => { const a=xs.filter(Number.isFinite).map(Math.abs); return a.length?a.reduce((s,x)=>s+x,0)/a.length:null; };
const sum = xs => xs.reduce((s,x)=>s+(Number(x)||0),0);
const isoAgeHours = (older,newer=new Date().toISOString()) => older ? (Date.parse(newer)-Date.parse(older))/3600000 : null;

const response = await coreWorker.fetch(new Request('https://report.invalid/api/core/live'), {}, {waitUntil(){}});
const live = await response.json();
if(!response.ok) throw new Error(`Live LastIntel/LastRank read failed: ${live?.error||response.status}`);

const storedLwt = (stored.members||[]).filter(x=>x.lastWarTools).map(x=>({
  name:x.name,
  uid:x.lastWarTools.uid??null,
  hq:x.lastWarTools.hq??null,
  power:x.lastWarTools.power??null,
  rank:rankNum(x.lastWarTools.rank),
  priorLiUid:x.lastIntel?.uid??null,
  priorLrUid:x.lastRank?.uid??null,
  priorLi:x.lastIntel||null,
  priorLr:x.lastRank||null,
}));
const liMembers=(live.members||[]).map(m=>m.sources?.lastIntel).filter(Boolean);
const lrMembers=(live.members||[]).map(m=>m.sources?.lastRank).filter(Boolean);

const entities=storedLwt.map(m=>({lwt:m,li:null,lr:null}));
const byName=new Map(); const byLiUid=new Map(); const byLrUid=new Map();
for(const e of entities){
  const k=norm(e.lwt.name); if(k){const a=byName.get(k)||[];a.push(e);byName.set(k,a);}
  if(e.lwt.priorLiUid!=null) byLiUid.set(String(e.lwt.priorLiUid),e);
  if(e.lwt.priorLrUid!=null) byLrUid.set(String(e.lwt.priorLrUid),e);
}
function attach(kind,m){
  const uid=m.sourceId!=null?String(m.sourceId):null;
  let e=uid ? (kind==='li'?byLiUid.get(uid):byLrUid.get(uid)) : null;
  if(!e){const matches=byName.get(norm(m.name))||[];if(matches.length===1)e=matches[0];}
  if(e&&!e[kind]){e[kind]=m;return;}
  entities.push({lwt:null,li:kind==='li'?m:null,lr:kind==='lr'?m:null});
}
for(const m of liMembers) attach('li',m);
for(const m of lrMembers) attach('lr',m);
const name=e=>e.lwt?.name||e.li?.name||e.lr?.name||'Unknown';
const present=(e,s)=>Boolean(e[s]);
const only=s=>entities.filter(e=>present(e,s)&&['lwt','li','lr'].filter(x=>x!==s).every(x=>!present(e,x))).map(name).sort();
const missingFrom=s=>entities.filter(e=>!present(e,s)&&['lwt','li','lr'].some(x=>x!==s&&present(e,x))).map(name).sort();

function val(src,m,field){
  if(!m)return null;
  if(field==='rank') return rankNum(m.rank);
  if(src==='lwt') return m[field]??null;
  return m[field]??null;
}
function pairStats(a,b,field){let comparable=0,mismatch=0;const differences=[];for(const e of entities){const A=e[a],B=e[b];if(!A||!B)continue;const x=val(a,A,field),y=val(b,B,field);if(x==null||y==null)continue;comparable++;if(x!==y){mismatch++;differences.push({name:name(e),[a]:x,[b]:y});}}return{comparable,mismatch,agree:comparable-mismatch,differences};}
function powerPair(a,b){const rel=[];const largest=[];let comparable=0;for(const e of entities){const A=e[a],B=e[b];if(!A||!B)continue;const d=pct(A.power,B.power);if(d==null)continue;comparable++;rel.push(d);largest.push({name:name(e),pct:d,[a]:A.power,[b]:B.power});}largest.sort((x,y)=>Math.abs(y.pct)-Math.abs(x.pct));return{comparable,medianPercentChange:median(rel),meanAbsolutePercentDifference:meanAbs(rel),largestDifferences:largest.slice(0,15)};}

const sameSourceRenames=[];
for(const e of entities){
  if(e.lwt?.priorLiUid!=null&&e.li?.sourceId!=null&&String(e.lwt.priorLiUid)===String(e.li.sourceId)&&norm(e.lwt.priorLi?.name)!==norm(e.li.name)) sameSourceRenames.push({source:'LastIntel',uid:String(e.li.sourceId),before:e.lwt.priorLi?.name||e.lwt.name,after:e.li.name});
  if(e.lwt?.priorLrUid!=null&&e.lr?.sourceId!=null&&String(e.lwt.priorLrUid)===String(e.lr.sourceId)&&norm(e.lwt.priorLr?.name)!==norm(e.lr.name)) sameSourceRenames.push({source:'LastRank',uid:String(e.lr.sourceId),before:e.lwt.priorLr?.name||e.lwt.name,after:e.lr.name});
}

function historyDelta(kind){
  const rows=[];
  for(const e of entities){if(!e.lwt||!e[kind])continue;const prior=kind==='li'?e.lwt.priorLi:e.lwt.priorLr;if(!prior)continue;const cur=e[kind];const p=pct(prior.power,cur.power);const beforeRank=rankNum(prior.rank),afterRank=rankNum(cur.rank);rows.push({name:name(e),powerBefore:prior.power??null,powerNow:cur.power??null,powerPct:p,hqBefore:prior.hq??null,hqNow:cur.hq??null,rankBefore:beforeRank,rankNow:afterRank});}
  return {comparable:rows.length,totalPowerBefore:sum(rows.map(x=>x.powerBefore)),totalPowerNow:sum(rows.map(x=>x.powerNow)),largestPowerChanges:rows.filter(x=>Number.isFinite(x.powerPct)).sort((a,b)=>Math.abs(b.powerPct)-Math.abs(a.powerPct)).slice(0,15),rankChanges:rows.filter(x=>x.rankBefore!=null&&x.rankNow!=null&&x.rankBefore!==x.rankNow),hqChanges:rows.filter(x=>x.hqBefore!=null&&x.hqNow!=null&&x.hqBefore!==x.hqNow)};
}

const liNonArmy=liMembers.filter(m=>Number.isFinite(Number(m.power))&&Number.isFinite(Number(m.armyPower))).map(m=>({name:m.name,total:Number(m.power),army:Number(m.armyPower),nonArmy:Number(m.power)-Number(m.armyPower)}));

const generatedAt=new Date().toISOString();
const report={
  generatedAt,
  lastWarTools:{capturedAt:stored.sources?.lastWarTools?.capturedAt??stored.generatedAt,memberCount:storedLwt.length,totalPowerSummed:sum(storedLwt.map(x=>x.power)),paidRequestsMadeNow:0,effectiveCostNow:0,ageHours:isoAgeHours(stored.sources?.lastWarTools?.capturedAt??stored.generatedAt,generatedAt)},
  lastIntel:{updatedAt:live.sources?.lastIntel?.updatedAt??null,memberCount:liMembers.length,totalPowerSummed:sum(liMembers.map(x=>x.power)),ok:live.sources?.lastIntel?.ok??false,ageHours:isoAgeHours(live.sources?.lastIntel?.updatedAt,generatedAt),nonArmy:{knownMembers:liNonArmy.length,total:sum(liNonArmy.map(x=>x.nonArmy)),army:sum(liNonArmy.map(x=>x.army)),totalPowerForKnown:sum(liNonArmy.map(x=>x.total))}},
  lastRank:{updatedAt:live.sources?.lastRank?.updatedAt??null,memberCount:lrMembers.length,totalPowerSummed:sum(lrMembers.map(x=>x.power)),ok:live.sources?.lastRank?.ok??false,ageHours:isoAgeHours(live.sources?.lastRank?.updatedAt,generatedAt)},
  membership:{union:entities.length,presentAll3:entities.filter(e=>e.lwt&&e.li&&e.lr).length,only:{lastWarTools:only('lwt'),lastIntel:only('li'),lastRank:only('lr')},missingFrom:{lastWarTools:missingFrom('lwt'),lastIntel:missingFrom('li'),lastRank:missingFrom('lr')}},
  hq:{lwt_li:pairStats('lwt','li','hq'),lwt_lr:pairStats('lwt','lr','hq'),li_lr:pairStats('li','lr','hq')},
  rank:{lwt_li:pairStats('lwt','li','rank'),lwt_lr:pairStats('lwt','lr','rank'),li_lr:pairStats('li','lr','rank')},
  power:{lwt_li:powerPair('lwt','li'),lwt_lr:powerPair('lwt','lr'),li_lr:powerPair('li','lr')},
  sameSourceRenames,
  historySinceStoredLwt:{storedGeneratedAt:stored.generatedAt,lastIntel:historyDelta('li'),lastRank:historyDelta('lr')},
  notes:['No new LastWar Tools API request was made.','LastWar Tools data is the latest stored snapshot and may be older than LastIntel/LastRank.','LastIntel nonArmy is calculated as total power minus armyPower when both fields are available.']
};
fs.writeFileSync('/tmp/gomo-source-live-report.json',JSON.stringify(report,null,2)+'\n');
console.log('=== GOMO_SOURCE_LIVE_STORED_LWT ===');
console.log(JSON.stringify(report,null,2));