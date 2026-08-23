import coreV05 from "./gomo-core-entry-v05.js";

const V="0.6.0-test", HEARTBEAT=24, CONFIRM=2, LEAVE=3, OBS_DAYS=7, SNAP_DAYS=30, RUN_DAYS=90;
let schemaOK=false;
const iso=(x)=>{const d=new Date(x||0);return Number.isNaN(d.getTime())?null:d.toISOString()};
const norm=(x)=>String(x||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const ch=(r)=>Number(r?.meta?.changes||0);
const level=(n)=>n>=90?"high":n>=70?"medium":"review";
const out=(x,s=200)=>new Response(JSON.stringify(x,null,2),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*","x-robots-tag":"noindex, nofollow","x-gomo-core-hardening-version":V}});
async function body(r){try{return await r.json()}catch{return null}}
function admin(req,env){const k=String(env.GOMO_CORE_ADMIN_KEY||"");return !!k&&(req.headers.get("authorization")||"")===`Bearer ${k}`}

async function schema(db){
  if(!db) throw new Error("CORE_DB binding is missing");
  if(schemaOK) return;
  const m=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='core_sync_metadata'").first();
  if(!m?.name){
    const base=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='core_sync_runs'").first();
    if(!base?.name) throw new Error("GoMo Core schema is not installed");
    await db.batch([
      db.prepare("CREATE TABLE IF NOT EXISTS core_sync_metadata(sync_id TEXT PRIMARY KEY,lastwarrank_status TEXT,lastwarrank_members INTEGER NOT NULL DEFAULT 0,metadata_json TEXT NOT NULL DEFAULT '{}',FOREIGN KEY(sync_id) REFERENCES core_sync_runs(sync_id) ON DELETE CASCADE)"),
      db.prepare("CREATE TABLE IF NOT EXISTS core_member_membership(gomo_id TEXT PRIMARY KEY,status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('pending','confirmed','departure_candidate','departed')),confirmation_syncs INTEGER NOT NULL DEFAULT 0,missing_syncs INTEGER NOT NULL DEFAULT 0,first_seen_at TEXT NOT NULL,status_updated_at TEXT NOT NULL,FOREIGN KEY(gomo_id) REFERENCES core_members(gomo_id) ON DELETE CASCADE)"),
      db.prepare("CREATE TABLE IF NOT EXISTS core_daily_member_rollups(day TEXT NOT NULL,gomo_id TEXT NOT NULL,name TEXT NOT NULL,hq INTEGER,power INTEGER,hero_power INTEGER,rank TEXT,confidence INTEGER,observed_at TEXT NOT NULL,PRIMARY KEY(day,gomo_id),FOREIGN KEY(gomo_id) REFERENCES core_members(gomo_id) ON DELETE CASCADE)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_core_canonical_observed_at ON core_canonical_snapshots(observed_at DESC)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_core_observations_fetched_at ON core_source_observations(fetched_at DESC)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_core_membership_status ON core_member_membership(status,missing_syncs)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_core_rollups_member_day ON core_daily_member_rollups(gomo_id,day DESC)")
    ]);
    await db.prepare("INSERT OR IGNORE INTO core_member_membership(gomo_id,status,confirmation_syncs,missing_syncs,first_seen_at,status_updated_at) SELECT gomo_id,CASE WHEN active=1 THEN 'confirmed' ELSE 'departed' END,2,0,created_at,updated_at FROM core_members").run();
  }
  schemaOK=true;
}

function historyDb(db){
  if(!db) return db;
  const cutoff=new Date(Date.now()-24*3600000).toISOString();
  return {prepare(sql){const s=String(sql);if(s.includes("WHERE julianday(c.observed_at) >= julianday('now', '-24 hours')")) return db.prepare(s.replace("WHERE julianday(c.observed_at) >= julianday('now', '-24 hours')","WHERE c.observed_at >= ?")).bind(cutoff);return db.prepare(s)},batch:x=>db.batch(x),exec:x=>db.exec(x)};
}
async function hqFloors(db,names){
  const p=JSON.stringify([...new Set(names.map(norm).filter(Boolean))]); if(p==="[]") return new Map();
  const q=`WITH w(name) AS(SELECT value FROM json_each(?)),i(name,gomo_id) AS(SELECT w.name,m.gomo_id FROM w JOIN core_members m ON m.normalized_name=w.name UNION SELECT w.name,a.gomo_id FROM w JOIN core_member_aliases a ON a.normalized_alias=w.name),h AS(SELECT i.name,c.hq FROM i JOIN core_canonical_snapshots c ON c.gomo_id=i.gomo_id WHERE c.hq IS NOT NULL UNION ALL SELECT i.name,r.hq FROM i JOIN core_daily_member_rollups r ON r.gomo_id=i.gomo_id WHERE r.hq IS NOT NULL) SELECT name,MAX(hq) max_hq FROM h GROUP BY name`;
  const r=await db.prepare(q).bind(p).all(), m=new Map(); for(const x of r.results||[]) if(Number.isFinite(Number(x.max_hq))) m.set(String(x.name),Number(x.max_hq)); return m;
}
function protect(report,floors){
  let n=0; const members=(report.members||[]).map(x=>{const f=floors.get(norm(x.name)),cur=x.canonical?.hq==null?null:Number(x.canonical.hq);if(!Number.isFinite(f)||Number.isFinite(cur)&&cur>=f) return x;n++;const fc={...(x.fieldConfidence||{}),hq:{...(x.fieldConfidence?.hq||{}),score:Math.max(95,Number(x.fieldConfidence?.hq?.score||0)),level:"high",decision:"QG protégé par historique",reasons:[...(x.fieldConfidence?.hq?.reasons||[]),`Maximum historique validé QG ${f}`]}};const score=Math.max(0,Math.min(100,Math.round(Number(fc.hq?.score||0)*.30+Number(fc.power?.score||0)*.30+Number(fc.heroPower?.score||0)*.25+Number(fc.rank?.score||0)*.15)));return {...x,canonical:{...(x.canonical||{}),hq:f},fieldSources:{...(x.fieldSources||{}),hq:"history:max_validated"},flags:[...new Set([...(x.flags||[]),"hq_historical_floor"])],anomalies:[...(x.anomalies||[]),{field:"hq",severity:"warning",code:"hq_decrease_blocked",message:`Baisse QG bloquée : ${f} conservé`}],fieldConfidence:fc,confidence:{score,level:level(score)}}});
  return {...report,coreVersion:V,mode:"core_hardening_test",hardening:{version:V,hqNeverDecrease:true,newMemberConfirmSyncs:CONFIRM,departureMissingSyncs:LEAVE,retention:{sourceObservationsDays:OBS_DAYS,canonicalSnapshotsDays:SNAP_DAYS,dailyRollups:true}},summary:{...(report.summary||{}),protectedHqMembers:n},members};
}
async function report(req,env,ctx){
  await schema(env.CORE_DB); const u=new URL(req.url);u.pathname="/api/core/precision";u.search="";
  const r=await coreV05.fetch(new Request(u,{method:"GET",headers:req.headers}),{...env,CORE_DB:historyDb(env.CORE_DB)},ctx), d=await body(r);if(!r.ok||!d?.members) throw new Error(d?.error||`GoMo Core precision HTTP ${r.status}`);return protect(d,await hqFloors(env.CORE_DB,d.members.map(x=>x.name)));
}


export { V, HEARTBEAT, CONFIRM, LEAVE, OBS_DAYS, SNAP_DAYS, RUN_DAYS, iso, norm, ch, level, out, body, admin, schema, report };
