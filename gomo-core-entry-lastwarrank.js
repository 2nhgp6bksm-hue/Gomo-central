import baseEntry from "./gomo-core-entry.js";
import { handleLastWarRankTest } from "./lastwarrank-test.js";
import { handleThreeSourceDashboard } from "./gomo-core-dashboard-3.js";

const WRAPPER_VERSION = "0.2.0-test";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
      "x-gomo-core-wrapper-version": WRAPPER_VERSION,
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

function validIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function hqVote(lastIntel, lastRank, lastWarRank) {
  const values = [
    ["lastIntel", lastIntel],
    ["lastRank", lastRank],
    ["lastWarRank", lastWarRank],
  ].filter(([, value]) => value != null && value !== "" && Number.isInteger(Number(value)));

  if (values.length < 2) {
    return { comparable: false, availableSources: values.length, consensus: null, supporters: [], status: "insufficient_data" };
  }

  const groups = new Map();
  for (const [source, raw] of values) {
    const value = Number(raw);
    const group = groups.get(value) || [];
    group.push(source);
    groups.set(value, group);
  }

  const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);
  const [bestValue, supporters] = ranked[0];

  if (supporters.length >= 2) {
    const status = supporters.length === 3
      ? "agree_3_of_3"
      : values.length === 3
        ? "agree_2_of_3"
        : "agree_2_of_2";
    return {
      comparable: true,
      availableSources: values.length,
      consensus: bestValue,
      supporters,
      status,
    };
  }

  return {
    comparable: true,
    availableSources: values.length,
    consensus: null,
    supporters: [],
    status: values.length === 3 ? "all_three_different" : "disagree_2_sources",
  };
}

function freshnessChoice(baseValue, baseSource, candidates) {
  const usable = candidates
    .filter((item) => item?.value != null && Number.isFinite(Number(item.value)))
    .map((item) => ({ ...item, iso: validIso(item.observedAt) }));

  const dated = usable.filter((item) => item.iso);
  if (dated.length) {
    dated.sort((a, b) => Date.parse(b.iso) - Date.parse(a.iso));
    const best = dated[0];
    return { value: Number(best.value), source: best.source, observedAt: best.iso };
  }

  return {
    value: baseValue ?? usable[0]?.value ?? null,
    source: baseSource ?? usable[0]?.source ?? null,
    observedAt: null,
  };
}

function addOrRemoveFlag(flags, flag, enabled) {
  const next = new Set(Array.isArray(flags) ? flags : []);
  if (enabled) next.add(flag); else next.delete(flag);
  return [...next];
}

function confidenceAfterResolvedHq(confidence, wasConflict, resolved) {
  const oldScore = Number(confidence?.score);
  if (!Number.isFinite(oldScore)) return confidence || { score: 0, level: "review" };
  const score = Math.max(0, Math.min(100, oldScore + (wasConflict && resolved ? 8 : 0)));
  return {
    score,
    level: score >= 90 ? "high" : score >= 70 ? "medium" : "review",
  };
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchBaseCore(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = "/api/core/live";
  url.search = "";
  const internal = new Request(url.toString(), { method: "GET", headers: request.headers });
  const response = await baseEntry.fetch(internal, env, ctx);
  return { response, data: await readJsonResponse(response) };
}

async function fetchLastWarRankProbe(request, env) {
  const url = new URL(request.url);
  url.pathname = "/api/core/lastwarrank-test";
  url.search = "";
  const internal = new Request(url.toString(), { method: "GET", headers: request.headers });
  const response = await handleLastWarRankTest(internal, env);
  return { response, data: await readJsonResponse(response) };
}

function sourceObservedAt(sourceSummary, fallback) {
  return validIso(sourceSummary?.updatedAt) || validIso(fallback) || null;
}

function reconcileWithLastWarRank(core, lastWarRank) {
  const lwrAvailable = Boolean(lastWarRank?.ok);
  const lwrMembers = lwrAvailable && Array.isArray(lastWarRank?.roster?.members)
    ? lastWarRank.roster.members
    : [];

  const lwrByName = new Map();
  for (const member of lwrMembers) {
    const key = normalizeName(member?.name);
    if (!key) continue;
    const list = lwrByName.get(key) || [];
    list.push(member);
    lwrByName.set(key, list);
  }

  const liTime = sourceObservedAt(core?.sources?.lastIntel, core?.freshness?.lastIntel);
  const lrTime = sourceObservedAt(core?.sources?.lastRank, core?.freshness?.lastRank);
  const lwrTime = validIso(lastWarRank?.page?.observedAt);

  let matchedLastWarRank = 0;
  let ambiguousLastWarRank = 0;
  let hqComparable3 = 0;
  let hqAgree3 = 0;
  let hqAgree2 = 0;
  let hqAllDifferent = 0;
  let hqAgree2of2 = 0;
  let hqSupportsLastIntel = 0;
  let hqSupportsLastRank = 0;
  let hqSupportsLastWarRank = 0;
  let hqUnresolved = 0;
  let rankConflicts = 0;
  let powerDifferences = 0;
  let heroPowerDifferences = 0;

  const members = (Array.isArray(core?.members) ? core.members : []).map((member) => {
    const key = normalizeName(member?.name);
    const candidates = lwrByName.get(key) || [];
    const lwr = candidates.length === 1 ? candidates[0] : null;
    if (candidates.length > 1) ambiguousLastWarRank += 1;
    if (lwr) matchedLastWarRank += 1;

    const li = member?.sources?.lastIntel || null;
    const lr = member?.sources?.lastRank || null;
    const liHq = li?.hq ?? null;
    const lrHq = lr?.hq ?? null;
    const lwrHq = lwr?.hq ?? null;
    const vote = hqVote(liHq, lrHq, lwrHq);
    const wasHqConflict = (member?.flags || []).includes("hq_conflict");
    const hqResolved = vote.consensus != null;

    if (vote.status === "agree_2_of_2") hqAgree2of2 += 1;

    if (liHq != null && lrHq != null && lwrHq != null) {
      hqComparable3 += 1;
      if (vote.status === "agree_3_of_3") hqAgree3 += 1;
      if (vote.status === "agree_2_of_3") {
        hqAgree2 += 1;
        if (vote.supporters.includes("lastIntel")) hqSupportsLastIntel += 1;
        if (vote.supporters.includes("lastRank")) hqSupportsLastRank += 1;
        if (vote.supporters.includes("lastWarRank")) hqSupportsLastWarRank += 1;
      }
      if (vote.status === "all_three_different") hqAllDifferent += 1;
    }

    let flags = Array.isArray(member?.flags) ? [...member.flags] : [];
    flags = addOrRemoveFlag(flags, "hq_conflict", wasHqConflict && !hqResolved);
    flags = addOrRemoveFlag(flags, "hq_confirmed_2of3", vote.status === "agree_2_of_3");
    flags = addOrRemoveFlag(flags, "hq_confirmed_2of2", vote.status === "agree_2_of_2");
    flags = addOrRemoveFlag(flags, "hq_confirmed_3of3", vote.status === "agree_3_of_3");
    flags = addOrRemoveFlag(flags, "hq_conflict_3way", vote.status === "all_three_different");

    if (flags.includes("hq_conflict") || flags.includes("hq_conflict_3way")) hqUnresolved += 1;
    if (flags.includes("rank_conflict")) rankConflicts += 1;

    const powerValues = [li?.power, lr?.power, lwr?.power].filter((value) => value != null).map(Number);
    const uniquePower = new Set(powerValues.filter(Number.isFinite));
    flags = addOrRemoveFlag(flags, "power_conflict", uniquePower.size > 1);
    if (uniquePower.size > 1) powerDifferences += 1;

    const heroValues = [li?.heroPower, lr?.heroPower, lwr?.heroPower].filter((value) => value != null).map(Number);
    const uniqueHero = new Set(heroValues.filter(Number.isFinite));
    flags = addOrRemoveFlag(flags, "hero_power_conflict", uniqueHero.size > 1);
    if (uniqueHero.size > 1) heroPowerDifferences += 1;

    const power = freshnessChoice(member?.canonical?.power, member?.fieldSources?.power, [
      { source: "lastIntel", value: li?.power, observedAt: li?.observedAt || liTime },
      { source: "lastRank", value: lr?.power, observedAt: lr?.observedAt || lrTime },
      { source: "lastWarRank", value: lwr?.power, observedAt: lwrTime },
    ]);

    const heroPower = freshnessChoice(member?.canonical?.heroPower, member?.fieldSources?.heroPower, [
      { source: "lastIntel", value: li?.heroPower, observedAt: li?.observedAt || liTime },
      { source: "lastRank", value: lr?.heroPower, observedAt: lr?.observedAt || lrTime },
      { source: "lastWarRank", value: lwr?.heroPower, observedAt: lwrTime },
    ]);

    const canonical = {
      ...member.canonical,
      hq: hqResolved ? vote.consensus : member?.canonical?.hq ?? null,
      power: power.value,
      heroPower: heroPower.value,
    };

    const fieldSources = {
      ...(member?.fieldSources || {}),
      hq: hqResolved ? `consensus:${vote.supporters.join("+")}` : member?.fieldSources?.hq || null,
      power: power.source,
      heroPower: heroPower.source,
    };

    return {
      ...member,
      canonical,
      confidence: confidenceAfterResolvedHq(member?.confidence, wasHqConflict, hqResolved),
      flags,
      fieldSources,
      sources: {
        lastIntel: li,
        lastRank: lr,
        lastWarRank: lwr ? {
          sourceId: lwr.sourceId || normalizeName(lwr.name),
          name: lwr.name,
          rank: null,
          hq: lwr.hq ?? null,
          power: lwr.power ?? null,
          heroPower: lwr.heroPower ?? null,
          kills: null,
          avatarUrl: null,
          observedAt: lwrTime,
        } : null,
      },
      comparison: {
        ...(member?.comparison || {}),
        lastWarRankMatch: lwr ? "exact_normalized_name" : candidates.length > 1 ? "ambiguous_name" : "not_available",
        hq: vote,
        freshestPowerSource: power.source,
        freshestHeroPowerSource: heroPower.source,
      },
    };
  });

  const matchedNames = new Set(members.filter((member) => member.sources.lastWarRank).map((member) => normalizeName(member.name)));
  const lastWarRankOnly = lwrMembers
    .filter((member) => !matchedNames.has(normalizeName(member.name)))
    .map((member) => member.name);

  const criticalConflicts = members.filter((member) =>
    (member.flags || []).some((flag) => ["hq_conflict", "hq_conflict_3way", "rank_conflict", "ambiguous_name"].includes(flag))
  ).length;

  return {
    ...core,
    coreVersion: `${core?.coreVersion || "0.1.0-test"}+3src`,
    wrapperVersion: WRAPPER_VERSION,
    generatedAt: new Date().toISOString(),
    mode: "three_source_test",
    policy: {
      ...(core?.policy || {}),
      hq: "consensus 2/3 ou 3/3; LastIntel prioritaire si consensus impossible",
      power: "valeur de la source horodatée la plus fraîche; toutes les valeurs restent visibles",
      heroPower: "valeur de la source horodatée la plus fraîche; toutes les valeurs restent visibles",
      rank: "LastIntel + LastRank; conflit visible",
      lastWarRank: "source complémentaire; une panne ne bloque pas LastIntel/LastRank",
    },
    freshness: {
      ...(core?.freshness || {}),
      lastWarRank: lwrTime,
    },
    sources: {
      ...(core?.sources || {}),
      lastWarRank: lwrAvailable ? {
        ok: true,
        memberCount: lwrMembers.length,
        updatedAt: lwrTime,
        totalPower: lastWarRank?.alliance?.totalPower ?? null,
        armyKills: lastWarRank?.alliance?.armyKills ?? null,
        error: null,
      } : {
        ok: false,
        memberCount: 0,
        updatedAt: null,
        totalPower: null,
        armyKills: null,
        error: lastWarRank?.error || "LastWarRank indisponible",
      },
    },
    summary: {
      ...(core?.summary || {}),
      unionMembers: members.length,
      lastWarRankMembers: lwrMembers.length,
      matchedLastWarRank,
      ambiguousLastWarRank,
      lastWarRankOnly: lastWarRankOnly.length,
      hqComparable3,
      hqConfirmed3of3: hqAgree3,
      hqConfirmed2of3: hqAgree2,
      hqConfirmed2of2: hqAgree2of2,
      hqUnresolved,
      hqAllDifferent,
      hqSupportsLastIntel,
      hqSupportsLastRank,
      hqSupportsLastWarRank,
      rankConflicts,
      powerDifferences,
      heroPowerDifferences,
      conflicts: criticalConflicts,
      reviewRequired: criticalConflicts,
    },
    lastWarRankOnly,
    members,
  };
}

async function buildThreeSourceReport(request, env, ctx) {
  const [coreResult, lwrResult] = await Promise.all([
    fetchBaseCore(request, env, ctx),
    fetchLastWarRankProbe(request, env),
  ]);

  if (!coreResult.response.ok || !coreResult.data?.members) {
    const error = coreResult.data?.error || `GoMo Core live HTTP ${coreResult.response.status}`;
    throw new Error(error);
  }

  const lastWarRank = lwrResult.response.ok && lwrResult.data?.ok
    ? lwrResult.data
    : { ok: false, error: lwrResult.data?.error || `LastWarRank HTTP ${lwrResult.response.status}` };

  return reconcileWithLastWarRank(coreResult.data, lastWarRank);
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

async function persistThreeSourceReport(db, report) {
  if (!db) throw new Error("CORE_DB binding is missing");
  if (!(await schemaReady(db))) throw new Error("GoMo Core schema is not installed");

  const syncId = `sync3_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const startedAt = new Date().toISOString();
  const lwr = report.sources?.lastWarRank || {};
  const metadata = {
    wrapperVersion: WRAPPER_VERSION,
    lastWarRankStatus: lwr.ok ? "ok" : "error",
    lastWarRankMembers: lwr.memberCount || 0,
    lastWarRankUpdatedAt: lwr.updatedAt || null,
    policy: "three_source_consensus_v0.2",
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
    const now = report.generatedAt;
    const normalized = normalizeName(member.name);

    await db.batch([
      db.prepare(
        "INSERT INTO core_members(gomo_id,current_name,normalized_name,active,created_at,updated_at) VALUES(?,?,?,1,?,?) ON CONFLICT(gomo_id) DO UPDATE SET current_name=excluded.current_name, normalized_name=excluded.normalized_name, updated_at=excluded.updated_at"
      ).bind(gomoId, member.name, normalized, now, now),
      db.prepare(
        "INSERT INTO core_member_aliases(gomo_id,alias,normalized_alias,source,first_seen,last_seen) VALUES(?,?,?,?,?,?) ON CONFLICT(gomo_id,normalized_alias) DO UPDATE SET alias=excluded.alias,last_seen=excluded.last_seen"
      ).bind(gomoId, member.name, normalized, "core", now, now),
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

    for (const [source, observation] of [
      ["lastintel", member.sources?.lastIntel],
      ["lastrank", member.sources?.lastRank],
      ["lastwarrank", member.sources?.lastWarRank],
    ]) {
      if (!observation) continue;
      const sourceId = String(observation.sourceId || normalized);
      await db.batch([
        db.prepare(
          "INSERT INTO core_source_links(source,source_member_id,gomo_id,first_seen,last_seen) VALUES(?,?,?,?,?) ON CONFLICT(source,source_member_id) DO UPDATE SET gomo_id=excluded.gomo_id,last_seen=excluded.last_seen"
        ).bind(source, sourceId, gomoId, now, now),
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
    }
  }

  await db.prepare("UPDATE core_sync_runs SET completed_at=?,status='ok',reconciled_members=?,error_json=? WHERE sync_id=?")
    .bind(new Date().toISOString(), report.members.length, JSON.stringify(metadata), syncId)
    .run();

  await db.prepare("INSERT INTO core_audit_log(event_type,details_json,created_at) VALUES('sync_completed_3_source',?,?)")
    .bind(JSON.stringify({ syncId, sources: report.sources, summary: report.summary, metadata }), new Date().toISOString())
    .run();

  return { syncId, members: report.members.length, summary: report.summary };
}

async function compareThreeSources(request, env, ctx) {
  if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method Not Allowed" }, 405);
  try {
    const report = await buildThreeSourceReport(request, env, ctx);
    return json({
      ok: true,
      mode: "three_source_read_only_comparison",
      generatedAt: report.generatedAt,
      safety: {
        writesToD1: false,
        writesToOtherSites: false,
        changesMainBranch: false,
      },
      sources: report.sources,
      summary: report.summary,
      lastWarRankOnly: report.lastWarRankOnly,
      members: report.members,
    });
  } catch (error) {
    return json({ ok: false, error: error?.message || String(error) }, 503);
  }
}

async function liveThreeSources(request, env, ctx) {
  if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method Not Allowed" }, 405);
  try {
    return json(await buildThreeSourceReport(request, env, ctx));
  } catch (error) {
    return json({ error: error?.message || String(error) }, 503);
  }
}

async function refreshThreeSources(request, env, ctx) {
  if (request.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  if (!env.CORE_DB) return json({ error: "CORE_DB is not configured" }, 503);
  if (!adminAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);

  try {
    const report = await buildThreeSourceReport(request, env, ctx);
    const saved = await persistThreeSourceReport(env.CORE_DB, report);
    return json({ ok: true, ...saved });
  } catch (error) {
    return json({ error: error?.message || String(error) }, 503);
  }
}

async function runScheduledThreeSource(env, ctx) {
  if (!env.CORE_DB || !(await schemaReady(env.CORE_DB))) return;
  const request = new Request("https://gomo-core-test.invalid/api/core/live", { method: "GET" });
  const report = await buildThreeSourceReport(request, env, ctx);
  await persistThreeSourceReport(env.CORE_DB, report);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/core") {
      url.pathname = "/core/";
      return Response.redirect(url.toString(), 308);
    }
    if (url.pathname === "/core/") {
      return handleThreeSourceDashboard();
    }
    if (url.pathname === "/api/core/lastwarrank-test") {
      return handleLastWarRankTest(request, env);
    }
    if (url.pathname === "/api/core/compare-3") {
      return compareThreeSources(request, env, ctx);
    }
    if (url.pathname === "/api/core/live") {
      return liveThreeSources(request, env, ctx);
    }
    if (url.pathname === "/api/core/refresh") {
      return refreshThreeSources(request, env, ctx);
    }

    return baseEntry.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        await runScheduledThreeSource(env, ctx);
      } catch (error) {
        console.error("GoMo Core 3-source scheduled sync", error?.message || String(error));
      }
    })());
  },
};
