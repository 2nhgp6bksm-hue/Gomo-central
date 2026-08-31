import fs from 'node:fs';
import coreWorker from '../gomo-core-worker.js';

const logPath = process.argv[2];
if (!logPath) throw new Error('Missing prior LastWar Tools log path');

const norm = (v) => String(v ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const rankNum = (v) => { const n = Number.parseInt(String(v ?? '').replace(/^R/i,''),10); return n>=1&&n<=5?n:null; };
const pct = (a,b) => Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Number(a)!==0 ? ((Number(b)-Number(a))/Math.abs(Number(a)))*100 : null;
const median = (xs) => { const a=xs.filter(Number.isFinite).sort((x,y)=>x-y); if(!a.length)return null; const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; };
const meanAbs = (xs) => { const a=xs.filter(Number.isFinite).map(Math.abs); return a.length?a.reduce((s,x)=>s+x,0)/a.length:null; };

function stripLogPrefix(text) {
  return text.split(/\r?\n/).map(line => {
    const m = line.match(/(?:^|\t)(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s(.*)$/);
    if (m) return m[2];
    const m2 = line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\s(.*)$/);
    return m2 ? m2[1] : line;
  }).join('\n');
}

function extractLastWarJson(raw) {
  const text = stripLogPrefix(raw);
  const marker = 'API key validation succeeded. Sending exactly one Alliance Members request.';
  const startSearch = text.indexOf(marker);
  if (startSearch < 0) throw new Error('Successful LastWar Tools marker not found in prior log');
  const start = text.indexOf('{', startSearch + marker.length);
  if (start < 0) throw new Error('LastWar Tools JSON start not found');
  let depth=0, inStr=false, esc=false;
  for(let i=start;i<text.length;i++){
    const c=text[i];
    if(inStr){ if(esc)esc=false; else if(c==='\\')esc=true; else if(c==='"')inStr=false; continue; }
    if(c==='"'){inStr=true;continue;}
    if(c==='{')depth++;
    else if(c==='}' && --depth===0){ return JSON.parse(text.slice(start,i+1)); }
  }
  throw new Error('LastWar Tools JSON end not found');
}

const priorRaw = fs.readFileSync(logPath, 'utf8');
const lwt = extractLastWarJson(priorRaw);
const response = await coreWorker.fetch(new Request('https://report.invalid/api/core/live'), {}, { waitUntil(){} });
const live = await response.json();
if (!response.ok) throw new Error(`Live LastIntel/LastRank read failed: ${live?.error || response.status}`);

const lwtMembers = Array.isArray(lwt?.members) ? lwt.members : [];
const liMembers = (live.members || []).map(m=>m.sources?.lastIntel).filter(Boolean);
const lrMembers = (live.members || []).map(m=>m.sources?.lastRank).filter(Boolean);

const entities=[];
const byUid=new Map(), byName=new Map();
function addIndex(e,name,uid){
  if(uid) byUid.set(String(uid),e);
  const k=norm(name); if(k){ const a=byName.get(k)||[]; if(!a.includes(e))a.push(e); byName.set(k,a); }
}
for(const m of lwtMembers){ const e={lwt:m,li:null,lr:null}; entities.push(e); addIndex(e,m.name,m.uid); }
function attach(source,m){
  const uid = m.sourceId ? String(m.sourceId) : null;
  let e = uid ? byUid.get(uid) : null;
  if(!e){ const matches=byName.get(norm(m.name))||[]; if(matches.length===1)e=matches[0]; }
  if(e && !e[source]){ e[source]=m; addIndex(e,m.name,uid); return; }
  const ne={lwt:null,li:null,lr:null,[source]:m}; entities.push(ne); addIndex(ne,m.name,uid);
}
for(const m of liMembers) attach('li',m);
for(const m of lrMembers) attach('lr',m);

const name = e => e.lwt?.name || e.li?.name || e.lr?.name || 'Unknown';
const presence = (e,s) => Boolean(e[s]);
const only = (s) => entities.filter(e=>presence(e,s) && ['lwt','li','lr'].filter(x=>x!==s).every(x=>!presence(e,x))).map(name).sort();
const missingFrom = (s) => entities.filter(e=>!presence(e,s) && ['lwt','li','lr'].some(x=>x!==s && presence(e,x))).map(name).sort();

function pairStats(a,b,field,transform=x=>x){
  let comparable=0,mismatch=0; const diffs=[];
  for(const e of entities){ const A=e[a],B=e[b]; if(!A||!B)continue; const x=transform(A[field]),y=transform(B[field]); if(x==null||y==null)continue; comparable++; if(x!==y){mismatch++; diffs.push({name:name(e),[a]:x,[b]:y});} }
  return {comparable,mismatch,agree:comparable-mismatch,differences:diffs};
}
const hqLwtLi=pairStats('lwt','li','hq');
const hqLwtLr=pairStats('lwt','lr','hq');
const hqLiLr=pairStats('li','lr','hq');
const rankLwtLi=pairStats('lwt','li','rank',rankNum);
const rankLwtLr=pairStats('lwt','lr','rank',rankNum);
const rankLiLr=pairStats('li','lr','rank',rankNum);

let all3Hq=0,all3AgreeHq=0,lwtLiVsLr=0,lwtLrVsLi=0,liLrVsLwt=0,all3DiffHq=0;
let all3Rank=0,all3AgreeRank=0,lwtLiVsLrRank=0,lwtLrVsLiRank=0,liLrVsLwtRank=0,all3DiffRank=0;
for(const e of entities){
  if(e.lwt&&e.li&&e.lr){
    const a=Number(e.lwt.hq),b=Number(e.li.hq),c=Number(e.lr.hq);
    if([a,b,c].every(Number.isFinite)){all3Hq++; if(a===b&&b===c)all3AgreeHq++; else if(a===b&&b!==c)lwtLiVsLr++; else if(a===c&&a!==b)lwtLrVsLi++; else if(b===c&&b!==a)liLrVsLwt++; else all3DiffHq++;}
    const ra=rankNum(e.lwt.rank),rb=rankNum(e.li.rank),rc=rankNum(e.lr.rank);
    if([ra,rb,rc].every(Number.isFinite)){all3Rank++; if(ra===rb&&rb===rc)all3AgreeRank++; else if(ra===rb&&rb!==rc)lwtLiVsLrRank++; else if(ra===rc&&ra!==rb)lwtLrVsLiRank++; else if(rb===rc&&rb!==ra)liLrVsLwtRank++; else all3DiffRank++;}
  }
}

const renameByUid=[];
for(const e of entities){
  const pairs=[['LastWar Tools','LastIntel',e.lwt,e.li],['LastWar Tools','LastRank',e.lwt,e.lr],['LastIntel','LastRank',e.li,e.lr]];
  for(const [a,b,A,B] of pairs){
    if(!A||!B||!A.sourceId&&!A.uid||!B.sourceId&&!B.uid)continue;
    const ua=String(A.uid??A.sourceId), ub=String(B.uid??B.sourceId);
    if(ua===ub && norm(A.name)!==norm(B.name)) renameByUid.push({uid:ua,sourceA:a,nameA:A.name,sourceB:b,nameB:B.name});
  }
}

function powerPair(a,b){
  const rel=[]; let comparable=0; const largest=[];
  for(const e of entities){ const A=e[a],B=e[b]; if(!A||!B)continue; const d=pct(A.power,B.power); if(d==null)continue; comparable++; rel.push(d); largest.push({name:name(e),from:a,to:b,pct:d,[a]:A.power,[b]:B.power}); }
  largest.sort((x,y)=>Math.abs(y.pct)-Math.abs(x.pct));
  return {comparable,medianPercentChange:median(rel),meanAbsolutePercentDifference:meanAbs(rel),largestDifferences:largest.slice(0,10)};
}

const sourceSums={
  lastWarTools:lwtMembers.reduce((s,m)=>s+(Number(m.power)||0),0),
  lastIntel:liMembers.reduce((s,m)=>s+(Number(m.power)||0),0),
  lastRank:lrMembers.reduce((s,m)=>s+(Number(m.power)||0),0),
};

const report={
  generatedAt:new Date().toISOString(),
  lastWarTools:{capturedAt:'2026-08-31T00:15:40Z',memberCount:lwtMembers.length,totalPowerReported:lwt?.summary?.total_power??null,totalPowerSummed:sourceSums.lastWarTools,paidRequestsMadeNow:0},
  lastIntel:{updatedAt:live.sources?.lastIntel?.updatedAt??null,memberCount:liMembers.length,totalPowerSummed:sourceSums.lastIntel,ok:live.sources?.lastIntel?.ok??false},
  lastRank:{updatedAt:live.sources?.lastRank?.updatedAt??null,memberCount:lrMembers.length,totalPowerSummed:sourceSums.lastRank,ok:live.sources?.lastRank?.ok??false},
  membership:{union:entities.length,presentAll3:entities.filter(e=>e.lwt&&e.li&&e.lr).length,only:{lastWarTools:only('lwt'),lastIntel:only('li'),lastRank:only('lr')},missingFrom:{lastWarTools:missingFrom('lwt'),lastIntel:missingFrom('li'),lastRank:missingFrom('lr')}},
  hq:{pairwise:{lastWarTools_vs_lastIntel:hqLwtLi,lastWarTools_vs_lastRank:hqLwtLr,lastIntel_vs_lastRank:hqLiLr},threeWay:{comparable:all3Hq,allAgree:all3AgreeHq,lastWarTools_plus_lastIntel_against_lastRank:lwtLiVsLr,lastWarTools_plus_lastRank_against_lastIntel:lwtLrVsLi,lastIntel_plus_lastRank_against_lastWarTools:liLrVsLwt,allDifferent:all3DiffHq}},
  rank:{pairwise:{lastWarTools_vs_lastIntel:rankLwtLi,lastWarTools_vs_lastRank:rankLwtLr,lastIntel_vs_lastRank:rankLiLr},threeWay:{comparable:all3Rank,allAgree:all3AgreeRank,lastWarTools_plus_lastIntel_against_lastRank:lwtLiVsLrRank,lastWarTools_plus_lastRank_against_lastIntel:lwtLrVsLiRank,lastIntel_plus_lastRank_against_lastWarTools:liLrVsLwtRank,allDifferent:all3DiffRank}},
  power:{timestamps:{lastWarTools:'2026-08-31T00:15:40Z',lastIntel:live.sources?.lastIntel?.updatedAt??null,lastRank:live.sources?.lastRank?.updatedAt??null},pairwise:{lastWarTools_vs_lastIntel:powerPair('lwt','li'),lastWarTools_vs_lastRank:powerPair('lwt','lr'),lastIntel_vs_lastRank:powerPair('li','lr')}},
  uidRenames:[...new Map(renameByUid.map(x=>[`${x.uid}|${x.sourceA}|${x.sourceB}`,x])).values()],
  notes:['No new LastWar Tools API request was made.','LastWar Tools online/offline fields are excluded from reliability scoring.']
};
console.log('=== GOMO_SOURCE_COMPARISON_JSON ===');
console.log(JSON.stringify(report,null,2));
