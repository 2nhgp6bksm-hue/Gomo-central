import coreV03 from "./gomo-core-entry-v03.js";

const STORAGE_VERSION = "0.4.0-test";
const STABLE_HEARTBEAT_HOURS = 24;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
      "x-gomo-core-storage-version": STORAGE_VERSION,
    },
  });
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function readJson(response) {
  try { return await response.json(); } catch { return null; }
}

function adminAuthorized(request, env) {
  const expected = String(env.GOMO_CORE_ADMIN_KEY || "");
  if (!expected) return false;
  return (request.headers.get("authorization") || "") === `Bearer ${expected}`;
}

async function schemaReady(db) {
  if (!db) return false;
  try {
    const row = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='core_sync_runs'").first();
    return Boolean(row?.name);
  } catch {
    return false;
  }
}

async function buildPrecisionReport(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = "/api/core/precision";
  url.search = "";
  const internal = new Request(url.toString(), { method: "GET", headers: request.headers });
  const response = await coreV03.fetch(internal, env, ctx);
  const data = await readJson(response);
  if (!response.ok || !data?.members) {
    throw new Error(data?.error || `GoMo Core precision HTTP ${response.status}`);
  }
  return data;
}

async function resolveGomoId(db, member) {
  const sourcePairs = [
    ["lastintel", member?.sources?.lastIntel?.sourceId],
    ["lastrank", member?.sources?.lastRank?.sourceId],
    ["lastwarrank", member?.sources?.lastWarRank?.sourceId],
  ];

  for (const [source, sourceId] of sourcePairs) {
    if (!sourceId) continue;
    const linked = await db
      .prepare("SELECT gomo_id FROM core_source_links WHERE source=? AND source_member_id=?")
      .bind(source, String(sourceId))
      .first();
    if (linked?.gomo_id) return linked.gomo_id;
  }

  const normalized = normalizeName(member?.name);
  if (normalized) {
    const aliases = await db
      .prepare("SELECT DISTINCT gomo_id FROM core_member_aliases WHERE normalized_alias=? LIMIT 2")
      .bind(normalized)
      .all();
    if ((aliases.results || []).length === 1) return aliases.results[0].gomo_id;
  }

  return `gomo_${crypto.randomUUID()}`;
}

function changesOf(result) {
  return Number(result?.meta?.changes || 0);
}

async function persistOptimizedReport(db, report) {
  if (!db) throw new Error("CORE_DB binding is missing");
  if (!(await schemaReady(db))) throw new Error("GoMo Core schema is not installed");

  const syncId = `sync4_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const startedAt = new Date().toISOString();
  const now = report.generatedAt || startedAt;
  const lwr = report.sources?.lastWarRank || {};
  let stableWritesApplied = 0;
  let canonicalRowsInserted = 0;
  let sourceObservationRowsInserted = 0;

  const metadata = {
    storageVersion: STORAGE_VERSION,
    precisionVersion: report.precision?.version || report.coreVersion || null,
    lastWarRankStatus: lwr.ok ? "ok" : "error",
    lastWarRankMembers: lwr.memberCount || 0,
    lastWarRankUpdatedAt: lwr.updatedAt || null,
    storagePolicy: "hourly_power_history_stable_metadata_on_change",
    stableHeartbeatHours: STABLE_HEARTBEAT_HOURS,
  };

  await db.prepare(
    "INSERT INTO core_sync_runs(sync_id,started_at,status,lastintel_status,lastrank_status,lastintel_members,lastrank_members,reconciled_members,error_json) VALUES(?,?,?,?,?,?,?,?,?)"
  ).bind(
    syncId,
    startedAt,
    "running",
    report.sources?.lastIntel?.ok ? "ok" : "error",
    report.sources?.lastRank?.ok ? "ok" : "error",
    report.sources?.lastIntel?.memberCount || 0,
    report.sources?.lastRank?.memberCount || 0,
    report.members.length,
    JSON.stringify(metadata),
  ).run();

  for (const member of report.members) {
    const gomoId = await resolveGomoId(db, member);
    const normalized = normalizeName(member.name);

    const identityResults = await db.batch([
      db.prepare(`
        INSERT INTO core_members(gomo_id,current_name,normalized_name,active,created_at,updated_at)
        VALUES(?,?,?,1,?,?)
        ON CONFLICT(gomo_id) DO UPDATE SET
          current_name=excluded.current_name,
          normalized_name=excluded.normalized_name,
          updated_at=excluded.updated_at
        WHERE core_members.current_name IS NOT excluded.current_name
           OR core_members.normalized_name IS NOT excluded.normalized_name
           OR julianday(core_members.updated_at) <= julianday(excluded.updated_at, '-${STABLE_HEARTBEAT_HOURS} hours')
      `).bind(gomoId, member.name, normalized, now, now),
      db.prepare(`
        INSERT INTO core_member_aliases(gomo_id,alias,normalized_alias,source,first_seen,last_seen)
        VALUES(?,?,?,?,?,?)
        ON CONFLICT(gomo_id,normalized_alias) DO UPDATE SET
          alias=excluded.alias,
          last_seen=excluded.last_seen
        WHERE core_member_aliases.alias IS NOT excluded.alias
           OR julianday(core_member_aliases.last_seen) <= julianday(excluded.last_seen, '-${STABLE_HEARTBEAT_HOURS} hours')
      `).bind(gomoId, member.name, normalized, "core", now, now),
      db.prepare(
        "INSERT INTO core_canonical_snapshots(sync_id,gomo_id,name,rank,hq,power,hero_power,kills,avatar_url,confidence,confidence_level,flags_json,field_sources_json,observed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        syncId,
        gomoId,
        member.name,
        member.canonical?.rank ?? null,
        member.canonical?.hq ?? null,
        member.canonical?.power ?? null,
        member.canonical?.heroPower ?? null,
        member.canonical?.kills ?? null,
        member.canonical?.avatarUrl ?? null,
        member.confidence?.score ?? 0,
        member.confidence?.level || "review",
        JSON.stringify(member.flags || []),
        JSON.stringify(member.fieldSources || {}),
        now,
      ),
    ]);

    stableWritesApplied += changesOf(identityResults[0]) + changesOf(identityResults[1]);
    canonicalRowsInserted += changesOf(identityResults[2]);

    for (const [source, observation] of [
      ["lastintel", member.sources?.lastIntel],
      ["lastrank", member.sources?.lastRank],
      ["lastwarrank", member.sources?.lastWarRank],
    ]) {
      if (!observation) continue;
      const sourceId = String(observation.sourceId || normalized);

      const sourceResults = await db.batch([
        db.prepare(`
          INSERT INTO core_source_links(source,source_member_id,gomo_id,first_seen,last_seen)
          VALUES(?,?,?,?,?)
          ON CONFLICT(source,source_member_id) DO UPDATE SET
            gomo_id=excluded.gomo_id,
            last_seen=excluded.last_seen
          WHERE core_source_links.gomo_id IS NOT excluded.gomo_id
             OR julianday(core_source_links.last_seen) <= julianday(excluded.last_seen, '-${STABLE_HEARTBEAT_HOURS} hours')
        `).bind(source, sourceId, gomoId, now, now),
        db.prepare(
          "INSERT INTO core_source_observations(sync_id,gomo_id,source,source_member_id,name,rank,hq,power,hero_power,kills,avatar_url,observed_at,fetched_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)"
        ).bind(
          syncId,
          gomoId,
          source,
          sourceId,
          observation.name || member.name,
          observation.rank ?? null,
          observation.hq ?? null,
          observation.power ?? null,
          observation.heroPower ?? null,
          observation.kills ?? null,
          observation.avatarUrl ?? null,
          observation.observedAt ?? null,
          now,
        ),
      ]);

      stableWritesApplied += changesOf(sourceResults[0]);
      sourceObservationRowsInserted += changesOf(sourceResults[1]);
    }
  }

  const completedMetadata = {
    ...metadata,
    stableWritesApplied,
    canonicalRowsInserted,
    sourceObservationRowsInserted,
  };

  await db.prepare("UPDATE core_sync_runs SET completed_at=?,status='ok',reconciled_members=?,error_json=? WHERE sync_id=?")
    .bind(new Date().toISOString(), report.members.length, JSON.stringify(completedMetadata), syncId)
    .run();

  await db.prepare("INSERT INTO core_audit_log(event_type,details_json,created_at) VALUES('sync_completed_3_source',?,?)")
    .bind(JSON.stringify({ syncId, sources: report.sources, summary: report.summary, metadata: completedMetadata }), new Date().toISOString())
    .run();

  return {
    syncId,
    members: report.members.length,
    summary: report.summary,
    storage: completedMetadata,
  };
}

async function optimizedRefresh(request, env, ctx) {
  if (request.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  if (!env.CORE_DB) return json({ error: "CORE_DB is not configured" }, 503);
  if (!adminAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);

  try {
    const report = await buildPrecisionReport(request, env, ctx);
    const saved = await persistOptimizedReport(env.CORE_DB, report);
    return json({ ok: true, ...saved });
  } catch (error) {
    return json({ error: error?.message || String(error) }, 503);
  }
}

async function optimizedStatus(request, env, ctx) {
  const response = await coreV03.fetch(request, env, ctx);
  const data = await readJson(response);
  if (!response.ok) return json(data || { error: `HTTP ${response.status}` }, response.status);
  return json({
    ...data,
    storageOptimization: {
      version: STORAGE_VERSION,
      active: true,
      policy: "Power/Hero Power historisés chaque heure; identité, pseudo, rang/QG liés aux snapshots et métadonnées stables réécrites seulement sur changement ou heartbeat quotidien",
      stableHeartbeatHours: STABLE_HEARTBEAT_HOURS,
    },
  });
}

async function runOptimizedScheduled(env, ctx) {
  if (!env.CORE_DB || !(await schemaReady(env.CORE_DB))) return;
  const request = new Request("https://gomo-core-test.invalid/api/core/precision", { method: "GET" });
  const report = await buildPrecisionReport(request, env, ctx);
  await persistOptimizedReport(env.CORE_DB, report);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/core/refresh") return optimizedRefresh(request, env, ctx);
    if (url.pathname === "/api/core/status") return optimizedStatus(request, env, ctx);
    return coreV03.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        await runOptimizedScheduled(env, ctx);
      } catch (error) {
        console.error("GoMo Core optimized scheduled sync", error?.message || String(error));
      }
    })());
  },
};
