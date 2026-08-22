import baseEntry from "./gomo-core-entry.js";
import { handleLastWarRankTest } from "./lastwarrank-test.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
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

function hqVote(lastIntel, lastRank, lastWarRank) {
  const values = [
    ["lastIntel", lastIntel],
    ["lastRank", lastRank],
    ["lastWarRank", lastWarRank],
  ].filter(([, value]) => value != null && value !== "" && Number.isInteger(Number(value)));

  if (values.length < 2) {
    return { comparable: false, consensus: null, supporters: [], status: "insufficient_data" };
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
    return {
      comparable: true,
      consensus: bestValue,
      supporters,
      status: supporters.length === 3 ? "agree_3_of_3" : "agree_2_of_3",
    };
  }

  return {
    comparable: true,
    consensus: null,
    supporters: [],
    status: values.length === 3 ? "all_three_different" : "disagree_1_of_1",
  };
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function compareThreeSources(request, env, ctx) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  const baseUrl = new URL(request.url);
  const liveUrl = new URL(baseUrl);
  liveUrl.pathname = "/api/core/live";
  liveUrl.search = "";

  const probeUrl = new URL(baseUrl);
  probeUrl.pathname = "/api/core/lastwarrank-test";
  probeUrl.search = "";

  const liveRequest = new Request(liveUrl.toString(), { method: "GET", headers: request.headers });
  const probeRequest = new Request(probeUrl.toString(), { method: "GET", headers: request.headers });

  const [coreResponse, lastWarRankResponse] = await Promise.all([
    baseEntry.fetch(liveRequest, env, ctx),
    handleLastWarRankTest(probeRequest, env),
  ]);

  const [core, lastWarRank] = await Promise.all([
    readJsonResponse(coreResponse),
    readJsonResponse(lastWarRankResponse),
  ]);

  if (!coreResponse.ok || !core?.members) {
    return json({
      ok: false,
      error: "GoMo Core live comparison is unavailable",
      coreStatus: coreResponse.status,
      core,
    }, 503);
  }

  if (!lastWarRankResponse.ok || !lastWarRank?.ok) {
    return json({
      ok: false,
      error: "LastWarRank comparison source is unavailable",
      lastWarRankStatus: lastWarRankResponse.status,
      lastWarRank,
      coreSummary: core.summary || null,
    }, 503);
  }

  const lwrMembers = Array.isArray(lastWarRank?.roster?.members) ? lastWarRank.roster.members : [];
  const lwrByName = new Map();
  for (const member of lwrMembers) {
    const key = normalizeName(member?.name);
    if (!key) continue;
    const list = lwrByName.get(key) || [];
    list.push(member);
    lwrByName.set(key, list);
  }

  let matchedLastWarRank = 0;
  let ambiguousLastWarRank = 0;
  let hqComparable3 = 0;
  let hqAgree3 = 0;
  let hqAgree2 = 0;
  let hqAllDifferent = 0;
  let hqSupportsLastIntel = 0;
  let hqSupportsLastRank = 0;

  const members = core.members.map((member) => {
    const key = normalizeName(member?.name);
    const candidates = lwrByName.get(key) || [];
    const lwr = candidates.length === 1 ? candidates[0] : null;
    if (candidates.length > 1) ambiguousLastWarRank += 1;
    if (lwr) matchedLastWarRank += 1;

    const liHq = member?.sources?.lastIntel?.hq ?? null;
    const lrHq = member?.sources?.lastRank?.hq ?? null;
    const lwrHq = lwr?.hq ?? null;
    const vote = hqVote(liHq, lrHq, lwrHq);

    if (liHq != null && lrHq != null && lwrHq != null) {
      hqComparable3 += 1;
      if (vote.status === "agree_3_of_3") hqAgree3 += 1;
      if (vote.status === "agree_2_of_3") {
        hqAgree2 += 1;
        if (vote.supporters.includes("lastIntel")) hqSupportsLastIntel += 1;
        if (vote.supporters.includes("lastRank")) hqSupportsLastRank += 1;
      }
      if (vote.status === "all_three_different") hqAllDifferent += 1;
    }

    return {
      name: member.name,
      canonical: member.canonical,
      confidence: member.confidence,
      flags: member.flags,
      fieldSources: member.fieldSources,
      sources: {
        lastIntel: member?.sources?.lastIntel || null,
        lastRank: member?.sources?.lastRank || null,
        lastWarRank: lwr ? {
          name: lwr.name,
          hq: lwr.hq ?? null,
          power: lwr.power ?? null,
          heroPower: lwr.heroPower ?? null,
          observedAt: lastWarRank?.page?.observedAt || null,
        } : null,
      },
      comparison: {
        lastWarRankMatch: lwr ? "exact_normalized_name" : candidates.length > 1 ? "ambiguous_name" : "not_available",
        hq: vote,
      },
    };
  });

  const matchedNames = new Set(members.filter((member) => member.sources.lastWarRank).map((member) => normalizeName(member.name)));
  const lastWarRankOnly = lwrMembers
    .filter((member) => !matchedNames.has(normalizeName(member.name)))
    .map((member) => member.name);

  return json({
    ok: true,
    mode: "three_source_read_only_comparison",
    generatedAt: new Date().toISOString(),
    safety: {
      writesToD1: false,
      writesToOtherSites: false,
      changesCanonicalData: false,
      changesMainBranch: false,
    },
    sources: {
      lastIntel: core.sources?.lastIntel || null,
      lastRank: core.sources?.lastRank || null,
      lastWarRank: {
        ok: true,
        memberCount: lwrMembers.length,
        observedAt: lastWarRank?.page?.observedAt || null,
        totalPower: lastWarRank?.alliance?.totalPower ?? null,
        armyKills: lastWarRank?.alliance?.armyKills ?? null,
      },
    },
    summary: {
      coreMembers: Array.isArray(core.members) ? core.members.length : 0,
      lastWarRankMembers: lwrMembers.length,
      matchedLastWarRank,
      ambiguousLastWarRank,
      lastWarRankOnly: lastWarRankOnly.length,
      hqComparable3,
      hqAgree3,
      hqAgree2,
      hqAllDifferent,
      hqSupportsLastIntel,
      hqSupportsLastRank,
    },
    lastWarRankOnly,
    members,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/core/lastwarrank-test") {
      return handleLastWarRankTest(request, env);
    }
    if (url.pathname === "/api/core/compare-3") {
      return compareThreeSources(request, env, ctx);
    }
    return baseEntry.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    if (typeof baseEntry.scheduled === "function") {
      return baseEntry.scheduled(event, env, ctx);
    }
  },
};
