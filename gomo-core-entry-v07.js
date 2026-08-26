import coreV06 from "./gomo-core-entry-v06.js";
import {
  V as V06,
  CONFIRM,
  LEAVE,
  OBS_DAYS,
  SNAP_DAYS,
  RUN_DAYS,
  admin,
  schema,
  report,
} from "./gomo-core-v06-engine.js";
import { persist } from "./gomo-core-v06-storage.js";
import {
  enrichCoreMembersWithAvatars,
  handleCoreMemberAvatar,
  readAvatarCatalog,
} from "./gomo-core-avatars-v07.js";

const V = "0.7.0-test";
const DEFAULT_CACHE_SECONDS = 600;
const REPORT_RETENTION_DAYS = 7;
let schemaV07OK = false;

function cacheSeconds(env) {
  const value = Number(env.CORE_PUBLIC_CACHE_SECONDS || DEFAULT_CACHE_SECONDS);
  return Number.isFinite(value) ? Math.max(60, Math.min(3600, Math.round(value))) : DEFAULT_CACHE_SECONDS;
}

function publicHeaders(extra = {}, env = {}) {
  const ttl = cacheSeconds(env);
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": `public, max-age=60, s-maxage=${ttl}, stale-while-revalidate=3600`,
    "access-control-allow-origin": "*",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow",
    "x-gomo-core-version": V,
    "x-gomo-core-public-data": "d1-cache-only",
    ...extra,
  };
}

function json(data, status = 200, env = {}, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: publicHeaders(extraHeaders, env),
  });
}

function maybeNotModified(request, response) {
  const requested = request.headers.get("if-none-match");
  const etag = response.headers.get("etag");
  if (requested && etag && requested === etag) {
    const headers = new Headers(response.headers);
    return new Response(null, { status: 304, headers });
  }
  return response;
}

function headify(request, response) {
  if (request.method !== "HEAD") return response;
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function cacheKey(request) {
  const url = new URL(request.url);
  url.search = `?coreVersion=${encodeURIComponent(V)}`;
  return new Request(url.toString(), { method: "GET" });
}

async function cached(request, env, ctx, producer) {
  if (!["GET", "HEAD"].includes(request.method)) return json({ error: "Method Not Allowed" }, 405, env);
  const cache = caches.default;
  const key = cacheKey(request);
  const hit = await cache.match(key);
  if (hit) {
    const headers = new Headers(hit.headers);
    headers.set("x-gomo-core-cache", "HIT");
    return headify(request, maybeNotModified(request, new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers })));
  }

  const produced = await producer();
  const response = produced instanceof Response ? produced : json(produced, 200, env);
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set("x-gomo-core-cache", "MISS");
    const cacheable = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    ctx.waitUntil(cache.put(key, cacheable.clone()));
    return headify(request, maybeNotModified(request, cacheable));
  }
  return headify(request, response);
}

async function schemaV07(db) {
  await schema(db);
  if (schemaV07OK) return;
  const existing = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='core_public_reports'").first();
  if (!existing?.name) await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS core_public_reports(
      sync_id TEXT PRIMARY KEY,
      generated_at TEXT NOT NULL,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(sync_id) REFERENCES core_sync_runs(sync_id) ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_core_public_reports_generated_at ON core_public_reports(generated_at DESC)"),
  ]);
  schemaV07OK = true;
}

async function latestSuccessfulSync(db) {
  return db.prepare(`
    SELECT s.sync_id,s.started_at,s.completed_at,s.status,
           s.lastintel_status,s.lastrank_status,s.lastintel_members,s.lastrank_members,
           s.reconciled_members,s.error_json,
           x.lastwarrank_status,x.lastwarrank_members,x.metadata_json
    FROM core_sync_runs s
    LEFT JOIN core_sync_metadata x ON x.sync_id=s.sync_id
    WHERE s.status='ok'
    ORDER BY s.completed_at DESC
    LIMIT 1
  `).first();
}

async function latestRun(db) {
  return db.prepare(`
    SELECT s.sync_id,s.started_at,s.completed_at,s.status,
           s.lastintel_status,s.lastrank_status,s.lastintel_members,s.lastrank_members,
           s.reconciled_members,s.error_json,
           x.lastwarrank_status,x.lastwarrank_members,x.metadata_json
    FROM core_sync_runs s
    LEFT JOIN core_sync_metadata x ON x.sync_id=s.sync_id
    ORDER BY s.started_at DESC
    LIMIT 1
  `).first();
}

function parsed(value, fallback = null) {
  try { return JSON.parse(value || ""); } catch { return fallback; }
}

async function membersPayload(env, origin, options = {}) {
  await schemaV07(env.CORE_DB);
  const sync = await latestSuccessfulSync(env.CORE_DB);
  if (!sync) return { error: "No successful Core sync available", status: 503 };

  const result = await env.CORE_DB.prepare(`
    SELECT c.gomo_id,c.name,c.rank,c.hq,c.power,c.hero_power,c.kills,c.avatar_url,
           c.confidence,c.confidence_level,c.flags_json,c.field_sources_json,c.observed_at,
           m.active,COALESCE(ms.status,'confirmed') membership_status
    FROM core_canonical_snapshots c
    JOIN core_members m ON m.gomo_id=c.gomo_id
    LEFT JOIN core_member_membership ms ON ms.gomo_id=c.gomo_id
    WHERE c.sync_id=?
    ORDER BY c.power DESC,c.name COLLATE NOCASE
  `).bind(sync.sync_id).all();

  const members = (result.results || []).map((row) => ({
    gomoId: row.gomo_id,
    name: row.name,
    rank: row.rank,
    hq: row.hq,
    power: row.power,
    heroPower: row.hero_power,
    kills: row.kills,
    avatarUrl: row.avatar_url,
    confidence: { score: row.confidence, level: row.confidence_level },
    flags: parsed(row.flags_json, []),
    fieldSources: parsed(row.field_sources_json, {}),
    observedAt: row.observed_at,
    active: Boolean(row.active),
    membershipStatus: row.membership_status,
  }));
  let avatarCatalog = null;
  if (options.includeAvatars !== false) {
    try {
      avatarCatalog = await readAvatarCatalog(env);
    } catch (error) {
      console.warn(JSON.stringify({
        event: "gomo_core_avatar_catalog_unavailable",
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }
  const enrichedMembers = options.includeAvatars === false
    ? members
    : await enrichCoreMembersWithAvatars(members, env, origin, avatarCatalog);

  return {
    ok: true,
    coreVersion: V,
    source: "gomo-core-d1-last-successful-sync",
    cachePolicy: "shared-edge-cache",
    syncId: sync.sync_id,
    generatedAt: sync.completed_at || sync.started_at,
    fresh: sync.completed_at ? Date.now() - Date.parse(sync.completed_at) <= 2 * 3600000 : false,
    memberCount: enrichedMembers.length,
    metadata: parsed(sync.metadata_json, null),
    avatarRevision: avatarCatalog?.generated_at || null,
    members: enrichedMembers,
  };
}

async function powerPayload(env, origin) {
  const data = await membersPayload(env, origin, { includeAvatars: false });
  if (data.error) return data;
  return {
    ok: true,
    coreVersion: V,
    source: data.source,
    syncId: data.syncId,
    generatedAt: data.generatedAt,
    fresh: data.fresh,
    memberCount: data.memberCount,
    members: data.members.map((m) => ({
      gomoId: m.gomoId,
      name: m.name,
      rank: m.rank,
      hq: m.hq,
      power: m.power,
      heroPower: m.heroPower,
      confidence: m.confidence,
      observedAt: m.observedAt,
      active: m.active,
      membershipStatus: m.membershipStatus,
    })),
  };
}

async function statusPayload(env) {
  await schemaV07(env.CORE_DB);
  const [last, success] = await Promise.all([latestRun(env.CORE_DB), latestSuccessfulSync(env.CORE_DB)]);
  const now = Date.now();
  const completed = success?.completed_at ? Date.parse(success.completed_at) : NaN;
  const ageMinutes = Number.isFinite(completed) ? Math.max(0, Math.round((now - completed) / 60000)) : null;

  return {
    ok: Boolean(success),
    coreVersion: V,
    previousHardeningVersion: V06,
    mode: "shared-data-test",
    dataPath: "external sources -> hourly Core sync -> D1 -> edge cache -> GoMo sites",
    upstreamOnPublicRead: false,
    cacheSeconds: cacheSeconds(env),
    schedule: "15 * * * *",
    lastSuccessfulSync: success ? {
      syncId: success.sync_id,
      completedAt: success.completed_at,
      ageMinutes,
      fresh: ageMinutes != null && ageMinutes <= 120,
      members: success.reconciled_members,
      sources: {
        lastIntel: { status: success.lastintel_status, members: success.lastintel_members },
        lastRank: { status: success.lastrank_status, members: success.lastrank_members },
        lastWarRank: { status: success.lastwarrank_status, members: success.lastwarrank_members },
      },
      metadata: parsed(success.metadata_json, null),
    } : null,
    lastRun: last ? {
      syncId: last.sync_id,
      startedAt: last.started_at,
      completedAt: last.completed_at,
      status: last.status,
      error: parsed(last.error_json, null),
    } : null,
    safety: {
      productionUntouched: true,
      publicPrecisionUsesStoredReport: true,
      publicMembersUseD1: true,
      publicPowerUsesD1: true,
      manualRefreshRequiresAdminKey: true,
      liveUpstreamEndpointRequiresAdminKey: true,
      hqNeverDecrease: true,
      newMemberConfirmSyncs: CONFIRM,
      departureMissingSyncs: LEAVE,
    },
  };
}

async function storedPrecisionPayload(env) {
  await schemaV07(env.CORE_DB);
  const row = await env.CORE_DB.prepare("SELECT sync_id,generated_at,report_json FROM core_public_reports ORDER BY generated_at DESC LIMIT 1").first();
  if (!row) return { error: "No stored precision report available yet", status: 503 };
  const data = parsed(row.report_json, null);
  if (!data) return { error: "Stored precision report is invalid", status: 503 };
  return {
    ...data,
    coreVersion: V,
    mode: "shared-data-test",
    storedReport: true,
    syncId: row.sync_id,
  };
}

async function savePublicReport(db, syncId, rep) {
  const generatedAt = rep.generatedAt || new Date().toISOString();
  await db.prepare(`
    INSERT INTO core_public_reports(sync_id,generated_at,report_json,created_at)
    VALUES(?,?,?,?)
    ON CONFLICT(sync_id) DO UPDATE SET
      generated_at=excluded.generated_at,
      report_json=excluded.report_json,
      created_at=excluded.created_at
  `).bind(syncId, generatedAt, JSON.stringify(rep), new Date().toISOString()).run();
}

async function maintenance(db, syncId) {
  const now = Date.now();
  const roll = new Date(now - OBS_DAYS * 86400000).toISOString();
  const snap = new Date(now - SNAP_DAYS * 86400000).toISOString();
  const run = new Date(now - RUN_DAYS * 86400000).toISOString();
  const reports = new Date(now - REPORT_RETENTION_DAYS * 86400000).toISOString();

  await db.batch([
    db.prepare(`INSERT INTO core_daily_member_rollups(day,gomo_id,name,hq,power,hero_power,rank,confidence,observed_at)
      SELECT substr(c.observed_at,1,10),c.gomo_id,c.name,c.hq,c.power,c.hero_power,c.rank,c.confidence,c.observed_at
      FROM core_canonical_snapshots c
      JOIN(SELECT gomo_id,substr(observed_at,1,10) day,MAX(observed_at) observed_at
           FROM core_canonical_snapshots WHERE observed_at<? GROUP BY gomo_id,substr(observed_at,1,10))x
      ON x.gomo_id=c.gomo_id AND x.observed_at=c.observed_at
      ON CONFLICT(day,gomo_id) DO UPDATE SET
        name=excluded.name,hq=excluded.hq,power=excluded.power,hero_power=excluded.hero_power,
        rank=excluded.rank,confidence=excluded.confidence,observed_at=excluded.observed_at
      WHERE excluded.observed_at>core_daily_member_rollups.observed_at`).bind(roll),
    db.prepare("DELETE FROM core_source_observations WHERE fetched_at<?").bind(roll),
    db.prepare("DELETE FROM core_canonical_snapshots WHERE observed_at<?").bind(snap),
    db.prepare("DELETE FROM core_public_reports WHERE generated_at<?").bind(reports),
    db.prepare("DELETE FROM core_audit_log WHERE created_at<?").bind(run),
    db.prepare("DELETE FROM core_sync_runs WHERE started_at<?").bind(run),
  ]);

  await db.prepare("INSERT INTO core_audit_log(event_type,details_json,created_at) VALUES('maintenance_v07',?,?)")
    .bind(JSON.stringify({ syncId, version: V }), new Date().toISOString()).run();
}

async function runSync(request, env, ctx) {
  await schemaV07(env.CORE_DB);
  const rep = await report(request, env, ctx);
  const saved = await persist(env.CORE_DB, rep);
  await savePublicReport(env.CORE_DB, saved.syncId, rep);
  return { rep, saved };
}

async function refresh(request, env, ctx) {
  if (request.method !== "POST") return json({ error: "Method Not Allowed" }, 405, env);
  if (!admin(request, env)) return json({ error: "Unauthorized" }, 401, env, { "cache-control": "no-store" });
  try {
    const { saved } = await runSync(request, env, ctx);
    return json({ ok: true, coreVersion: V, ...saved }, 200, env, { "cache-control": "no-store" });
  } catch (error) {
    return json({ error: error?.message || String(error), coreVersion: V }, 503, env, { "cache-control": "no-store" });
  }
}

async function live(request, env, ctx) {
  if (!["GET", "HEAD"].includes(request.method)) return json({ error: "Method Not Allowed" }, 405, env);
  if (!admin(request, env)) return json({ error: "Unauthorized" }, 401, env, { "cache-control": "no-store" });
  try {
    return headify(request, json(await report(request, env, ctx), 200, env, { "cache-control": "no-store" }));
  } catch (error) {
    return json({ error: error?.message || String(error), coreVersion: V }, 503, env, { "cache-control": "no-store" });
  }
}

async function adminPassthrough(request, env, ctx) {
  if (!admin(request, env)) return json({ error: "Unauthorized" }, 401, env, { "cache-control": "no-store" });
  const response = await coreV06.fetch(request, env, ctx);
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-gomo-core-version", V);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function payloadResponse(payload, env, extraHeaders = {}) {
  if (payload?.error) return json({ error: payload.error, coreVersion: V }, payload.status || 503, env, { "cache-control": "no-store" });
  const avatarRevision = String(payload.avatarRevision || "").replace(/[^0-9A-Za-z_.:-]/g, "");
  const etag = payload.syncId
    ? `W/\"${payload.syncId}:${payload.coreVersion || V}${avatarRevision ? `:${avatarRevision}` : ""}\"`
    : null;
  return json(payload, 200, env, { ...extraHeaders, ...(etag ? { etag } : {}) });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const avatarMatch = path.match(/^\/api\/core\/members\/(gomo_[0-9a-f-]+)\/avatar$/i);
    if (avatarMatch) return handleCoreMemberAvatar(request, env, url, avatarMatch[1]);

    if (path === "/api/core/refresh") return refresh(request, env, ctx);
    if (path === "/api/core/live") return live(request, env, ctx);
    if (path === "/api/core/lastwarrank-test" || path === "/api/core/compare-3") {
      return adminPassthrough(request, env, ctx);
    }

    if (path === "/api/core/precision") {
      return cached(request, env, ctx, async () => payloadResponse(await storedPrecisionPayload(env), env));
    }
    if (path === "/api/core/members") {
      return cached(request, env, ctx, async () => payloadResponse(
        await membersPayload(env, url.origin),
        env,
        { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" },
      ));
    }
    if (path === "/api/core/power") {
      return cached(request, env, ctx, async () => payloadResponse(await powerPayload(env, url.origin), env));
    }
    if (path === "/api/core/status") {
      return cached(request, env, ctx, async () => payloadResponse(await statusPayload(env), env));
    }

    const response = await coreV06.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set("x-gomo-core-version", V);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const request = new Request("https://gomo-core-test.invalid/api/core/live", { method: "GET" });
        const { saved } = await runSync(request, env, ctx);
        const hour = new Date(Number(event?.scheduledTime || Date.now())).getUTCHours();
        if (hour === 3) await maintenance(env.CORE_DB, saved.syncId);
      } catch (error) {
        console.error("GoMo Core v0.7 scheduled sync", error?.message || String(error));
      }
    })());
  },
};
