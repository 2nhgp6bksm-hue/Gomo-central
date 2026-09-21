import coreV07 from "./gomo-core-entry-v07.js";

const POLICY_VERSION = "0.7.1-rank-policy-test";
const OPERATIONAL_RANK_SCORE = 85;

function level(score) {
  return score >= 90 ? "high" : score >= 70 ? "medium" : "review";
}

function asJson(response) {
  return response.clone().json().catch(() => null);
}

function withJson(response, data) {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-gomo-core-rank-policy", POLICY_VERSION);
  return new Response(JSON.stringify(data, null, 2), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isOperationalR2Variance(member) {
  const li = member?.sources?.lastIntel?.rank ?? null;
  const lr = member?.sources?.lastRank?.rank ?? null;
  if (!li || !lr || li === lr) return false;
  const ranks = new Set([String(li), String(lr)]);
  if (!ranks.has("R2")) return false;
  if (![...ranks].some((rank) => ["R3", "R4", "R5"].includes(rank))) return false;
  const flags = new Set(member?.flags || []);
  if (flags.has("ambiguous_name") || flags.has("hq_conflict") || flags.has("hq_conflict_3way")) return false;
  return Boolean(member?.sources?.lastIntel && member?.sources?.lastRank);
}

function adjustPrecisionMember(member) {
  if (!isOperationalR2Variance(member)) return member;

  const oldRank = member?.fieldConfidence?.rank || {};
  const rankScore = Math.max(OPERATIONAL_RANK_SCORE, Number(oldRank.score || 0));
  const rankConfidence = {
    ...oldRank,
    score: rankScore,
    level: level(rankScore),
    decision: "Écart de rang opérationnel — R2 temporaire possible",
    reasons: [
      ...(Array.isArray(oldRank.reasons) ? oldRank.reasons : []),
      "R2 peut être utilisé temporairement pour un membre en congé ou peu actif",
      "L'identité et le QG restent confirmés : cet écart de rang n'est pas une anomalie critique",
    ],
    operationalVariance: true,
  };

  const fieldConfidence = {
    ...(member.fieldConfidence || {}),
    rank: rankConfidence,
  };
  const weighted =
    Number(fieldConfidence.hq?.score || 0) * 0.30 +
    Number(fieldConfidence.power?.score || 0) * 0.30 +
    Number(fieldConfidence.heroPower?.score || 0) * 0.25 +
    Number(fieldConfidence.rank?.score || 0) * 0.15;
  const score = Math.max(0, Math.min(100, Math.round(weighted)));
  const flags = (member.flags || []).filter((flag) => flag !== "rank_conflict");
  if (!flags.includes("rank_operational_variance")) flags.push("rank_operational_variance");

  return {
    ...member,
    flags,
    fieldConfidence,
    confidence: { score, level: level(score) },
    rankPolicy: {
      version: POLICY_VERSION,
      classification: "operational_variance",
      reason: "R2 temporaire possible pour congé / faible activité",
    },
  };
}

function adjustPrecisionPayload(data) {
  const members = Array.isArray(data?.members) ? data.members.map(adjustPrecisionMember) : [];
  const operationalRankVariances = members.filter((member) => (member.flags || []).includes("rank_operational_variance")).length;
  const criticalFlags = new Set(["hq_conflict", "hq_conflict_3way", "rank_conflict", "ambiguous_name"]);
  const criticalMembers = members.filter((member) => (member.flags || []).some((flag) => criticalFlags.has(flag))).length;

  return {
    ...data,
    rankPolicy: {
      version: POLICY_VERSION,
      r2TemporaryLeaveAware: true,
      rankIsOperationalField: true,
      operationalRankScoreFloor: OPERATIONAL_RANK_SCORE,
    },
    summary: {
      ...(data?.summary || {}),
      conflicts: criticalMembers,
      reviewRequired: criticalMembers,
      operationalRankVariances,
    },
    members,
  };
}

function adjustStatusPayload(data) {
  return {
    ...data,
    rankPolicy: {
      version: POLICY_VERSION,
      active: true,
      rule: "Un écart R2 ↔ R3/R4/R5 n'est pas critique si identité et QG sont confirmés",
      note: "R2 peut être temporaire pendant un congé ou une faible activité",
    },
  };
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    const response = await coreV07.fetch(request, env, ctx);

    if (!response.ok || request.method === "HEAD") return response;
    if (path !== "/api/core/precision" && path !== "/api/core/status") return response;

    const data = await asJson(response);
    if (!data) return response;
    if (path === "/api/core/precision") return withJson(response, adjustPrecisionPayload(data));
    return withJson(response, adjustStatusPayload(data));
  },

  async scheduled(event, env, ctx) {
    return coreV07.scheduled(event, env, ctx);
  },
};
