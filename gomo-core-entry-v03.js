import coreV02 from "./gomo-core-entry-lastwarrank.js";
import { handlePrecisionDashboard } from "./gomo-core-dashboard-v03.js";

const PRECISION_VERSION = "0.3.0-test";
const HISTORY_HOURS = 24;
const HISTORY_LIMIT = 5000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
      "x-gomo-core-precision-version": PRECISION_VERSION,
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

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function level(score) {
  return score >= 90 ? "high" : score >= 70 ? "medium" : "review";
}

function quality(score, decision, reasons = [], extra = {}) {
  const normalizedScore = clamp(score);
  return {
    score: normalizedScore,
    level: level(normalizedScore),
    decision,
    reasons,
    ...extra,
  };
}

function ageMinutes(value, now = Date.now()) {
  const iso = validIso(value);
  if (!iso) return null;
  return Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
}

function freshnessPoints(minutes) {
  if (minutes == null) return 45;
  if (minutes <= 90) return 98;
  if (minutes <= 180) return 95;
  if (minutes <= 360) return 90;
  if (minutes <= 720) return 82;
  if (minutes <= 1440) return 70;
  return 50;
}

function sourceObservation(member, sourceName, field) {
  const source = member?.sources?.[sourceName];
  if (!source || source[field] == null) return null;
  return {
    source: sourceName,
    value: Number(source[field]),
    observedAt: validIso(source.observedAt),
  };
}

function selectedObservation(member, field) {
  const sourceName = String(member?.fieldSources?.[field] || "").replace(/^consensus:/, "").split("+")[0];
  if (["lastIntel", "lastRank", "lastWarRank"].includes(sourceName)) {
    return sourceObservation(member, sourceName, field);
  }
  const candidates = ["lastIntel", "lastRank", "lastWarRank"]
    .map((source) => sourceObservation(member, source, field))
    .filter(Boolean)
    .filter((item) => item.observedAt)
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  return candidates[0] || null;
}

function nearSupportCount(member, field, selectedValue, tolerance) {
  if (!Number.isFinite(Number(selectedValue)) || Number(selectedValue) === 0) return 0;
  return ["lastIntel", "lastRank", "lastWarRank"]
    .map((source) => sourceObservation(member, source, field))
    .filter(Boolean)
    .filter((item) => Math.abs(item.value - Number(selectedValue)) / Math.max(1, Math.abs(Number(selectedValue))) <= tolerance)
    .length;
}

async function loadHistory(db) {
  const empty = { available: false, byName: new Map(), rows: 0, error: null };
  if (!db) return empty;
  try {
    const result = await db.prepare(`
      SELECT m.normalized_name, c.hq, c.power, c.hero_power, c.rank, c.observed_at
      FROM core_canonical_snapshots c
      JOIN core_members m ON m.gomo_id = c.gomo_id
      WHERE julianday(c.observed_at) >= julianday('now', '-${HISTORY_HOURS} hours')
      ORDER BY c.observed_at DESC
      LIMIT ${HISTORY_LIMIT}
    `).all();
    const rows = Array.isArray(result?.results) ? result.results : [];
    const byName = new Map();
    for (const row of rows) {
      const key = String(row.normalized_name || "");
      if (!key) continue;
      const list = byName.get(key) || [];
      list.push({
        hq: row.hq == null ? null : Number(row.hq),
        power: row.power == null ? null : Number(row.power),
        heroPower: row.hero_power == null ? null : Number(row.hero_power),
        rank: row.rank || null,
        observedAt: validIso(row.observed_at),
      });
      byName.set(key, list);
    }
    return { available: true, byName, rows: rows.length, error: null };
  } catch (error) {
    return { ...empty, error: error?.message || String(error) };
  }
}

function historicalContext(history, memberName) {
  const points = history?.byName?.get(normalizeName(memberName)) || [];
  const latest = points[0] || null;
  const hqValues = points.map((point) => point.hq).filter(Number.isFinite);
  return {
    points,
    latest,
    maxHq: hqValues.length ? Math.max(...hqValues) : null,
  };
}

function temporalAnomalies(member, historyContext, generatedAt) {
  const anomalies = [];
  const latest = historyContext.latest;
  if (!latest?.observedAt) return anomalies;
  const now = Date.parse(validIso(generatedAt) || new Date().toISOString());
  const previous = Date.parse(latest.observedAt);
  const hours = Math.max(0, (now - previous) / 3600000);

  const currentHq = Number(member?.canonical?.hq);
  if (Number.isFinite(currentHq) && Number.isFinite(historyContext.maxHq) && currentHq < historyContext.maxHq) {
    anomalies.push({
      field: "hq",
      severity: "critical",
      code: "hq_decrease",
      message: `QG ${currentHq} inférieur au maximum historique ${historyContext.maxHq}`,
    });
  }

  const checks = [
    { field: "power", current: member?.canonical?.power, previous: latest.power, drop: 0.35, rise: 0.80 },
    { field: "heroPower", current: member?.canonical?.heroPower, previous: latest.heroPower, drop: 0.30, rise: 0.70 },
  ];
  if (hours <= 6) {
    for (const check of checks) {
      const current = Number(check.current);
      const prior = Number(check.previous);
      if (!Number.isFinite(current) || !Number.isFinite(prior) || prior <= 0) continue;
      const delta = (current - prior) / prior;
      if (delta <= -check.drop || delta >= check.rise) {
        anomalies.push({
          field: check.field,
          severity: "warning",
          code: delta < 0 ? `${check.field}_sudden_drop` : `${check.field}_sudden_rise`,
          message: `${check.field === "heroPower" ? "Hero Power" : "Puissance"} ${delta < 0 ? "en baisse" : "en hausse"} de ${Math.round(Math.abs(delta) * 100)} % en ${hours.toFixed(1)} h`,
        });
      }
    }
  }
  return anomalies;
}

function hqQuality(member, historyContext) {
  const vote = member?.comparison?.hq || {};
  const reasons = [];
  let score = 68;
  let decision = "Une seule information exploitable";

  if (vote.status === "agree_3_of_3") {
    score = 100;
    decision = "QG confirmé par 3 sources sur 3";
    reasons.push("LastIntel, LastRank et LastWarRank donnent la même valeur");
  } else if (vote.status === "agree_2_of_3") {
    score = 99;
    decision = "QG confirmé par majorité 2/3";
    reasons.push(`Consensus : ${(vote.supporters || []).join(" + ")}`);
  } else if (vote.status === "agree_2_of_2") {
    score = 96;
    decision = "QG confirmé par les 2 sources disponibles";
    reasons.push(`Accord : ${(vote.supporters || []).join(" + ")}`);
  } else if (vote.status === "all_three_different") {
    score = 35;
    decision = "QG à vérifier : trois valeurs différentes";
    reasons.push("Aucune majorité entre les trois sources");
  } else if (vote.status === "disagree_2_sources") {
    score = 48;
    decision = "QG à vérifier : deux sources en désaccord";
    reasons.push("La troisième source ne permet pas de départager");
  }

  const current = Number(member?.canonical?.hq);
  if (Number.isFinite(historyContext.maxHq)) {
    if (Number.isFinite(current) && current < historyContext.maxHq) {
      score = Math.min(score, 20);
      reasons.push(`Incohérent avec le QG historique maximum ${historyContext.maxHq}`);
    } else if (current === historyContext.maxHq) {
      score = Math.min(100, score + 1);
      reasons.push("Cohérent avec l'historique D1");
    } else if (Number.isFinite(current) && current > historyContext.maxHq) {
      reasons.push(`Progression depuis le maximum historique ${historyContext.maxHq}`);
    }
  }

  return quality(score, decision, reasons, { consensus: vote.consensus ?? null, supporters: vote.supporters || [] });
}

function rankQuality(member, historyContext) {
  const li = member?.sources?.lastIntel?.rank ?? null;
  const lr = member?.sources?.lastRank?.rank ?? null;
  const reasons = [];
  let score = 0;
  let decision = "Rang indisponible";

  if (li && lr && li === lr) {
    score = 99;
    decision = "Rang confirmé par LastIntel + LastRank";
    reasons.push(`Les deux sources donnent ${li}`);
  } else if (li && lr) {
    score = 55;
    decision = "Rang à vérifier";
    reasons.push(`LastIntel ${li} ≠ LastRank ${lr}`);
  } else if (li || lr) {
    score = 76;
    decision = "Rang fourni par une seule source";
    reasons.push(`Source disponible : ${li ? "LastIntel" : "LastRank"}`);
  }

  if (historyContext.latest?.rank && member?.canonical?.rank === historyContext.latest.rank) {
    score = Math.min(100, score + 1);
    reasons.push("Stable par rapport au dernier relevé D1");
  }
  return quality(score, decision, reasons);
}

function movingFieldQuality(member, field, label, tolerance, anomaly, now) {
  const selected = selectedObservation(member, field);
  const canonical = member?.canonical?.[field];
  if (canonical == null) return quality(0, `${label} indisponible`, ["Aucune valeur exploitable"]);

  const age = ageMinutes(selected?.observedAt, now);
  let score = freshnessPoints(age);
  const reasons = [];
  const source = selected?.source || member?.fieldSources?.[field] || "inconnue";
  reasons.push(`Valeur retenue depuis ${source}`);
  if (age != null) reasons.push(`Relevé âgé de ${age} min`); else reasons.push("Horodatage de la valeur non disponible");

  const support = nearSupportCount(member, field, canonical, tolerance);
  if (support >= 2) {
    score += support === 3 ? 7 : 4;
    reasons.push(`${support} sources proches à ±${Math.round(tolerance * 100)} %`);
  } else {
    score -= 6;
    reasons.push("Pas de confirmation proche par une autre source");
  }

  if (anomaly) {
    score -= anomaly.severity === "critical" ? 50 : 30;
    reasons.push(anomaly.message);
  }
  return quality(score, `${label} choisie par fraîcheur`, reasons, { source, observedAt: selected?.observedAt || null, ageMinutes: age, nearbySources: support });
}

function sourceHealth(report, sourceName, now) {
  const source = report?.sources?.[sourceName] || {};
  const union = Math.max(1, Number(report?.summary?.unionMembers || 0));
  const count = Number(source.memberCount || 0);
  const coverage = Math.max(0, Math.min(1, count / union));
  const age = ageMinutes(source.updatedAt, now);
  const fresh = freshnessPoints(age);
  const score = source.ok ? clamp(40 + coverage * 30 + fresh * 0.30) : 0;
  return {
    score,
    level: level(score),
    ok: Boolean(source.ok),
    memberCount: count,
    coveragePercent: Math.round(coverage * 100),
    ageMinutes: age,
    stale: age != null ? age > 720 : true,
    updatedAt: validIso(source.updatedAt),
    error: source.error || null,
  };
}

function sourceAgreement(members, sourceName) {
  let comparable = 0;
  let supported = 0;
  for (const member of members) {
    const vote = member?.comparison?.hq;
    const sourceValue = member?.sources?.[sourceName]?.hq;
    if (vote?.consensus == null || sourceValue == null) continue;
    comparable += 1;
    if (Number(sourceValue) === Number(vote.consensus)) supported += 1;
  }
  return {
    comparable,
    supported,
    supportPercent: comparable ? Math.round((supported / comparable) * 100) : null,
  };
}

function enrichPrecision(report, history) {
  const now = Date.now();
  let anomalyMembers = 0;
  let highConfidenceMembers = 0;
  let reviewMembers = 0;
  const sums = { hq: 0, power: 0, heroPower: 0, rank: 0 };
  const counts = { hq: 0, power: 0, heroPower: 0, rank: 0 };

  const members = (Array.isArray(report?.members) ? report.members : []).map((member) => {
    const context = historicalContext(history, member.name);
    const anomalies = temporalAnomalies(member, context, report.generatedAt);
    const anomalyFor = (field) => anomalies.find((item) => item.field === field) || null;

    const fieldConfidence = {
      hq: hqQuality(member, context),
      power: movingFieldQuality(member, "power", "Puissance", 0.03, anomalyFor("power"), now),
      heroPower: movingFieldQuality(member, "heroPower", "Hero Power", 0.05, anomalyFor("heroPower"), now),
      rank: rankQuality(member, context),
    };

    const weighted = (
      fieldConfidence.hq.score * 0.30 +
      fieldConfidence.power.score * 0.30 +
      fieldConfidence.heroPower.score * 0.25 +
      fieldConfidence.rank.score * 0.15
    );
    const overallScore = clamp(weighted);
    if (anomalies.length) anomalyMembers += 1;
    if (overallScore >= 90) highConfidenceMembers += 1;
    if (overallScore < 70) reviewMembers += 1;

    for (const field of Object.keys(sums)) {
      if (fieldConfidence[field].score > 0) {
        sums[field] += fieldConfidence[field].score;
        counts[field] += 1;
      }
    }

    return {
      ...member,
      confidence: { score: overallScore, level: level(overallScore) },
      fieldConfidence,
      anomalies,
      history: {
        points24h: context.points.length,
        previousObservedAt: context.latest?.observedAt || null,
        historicalMaxHq24h: context.maxHq,
      },
    };
  });

  const sourceHealthMap = {
    lastIntel: sourceHealth(report, "lastIntel", now),
    lastRank: sourceHealth(report, "lastRank", now),
    lastWarRank: sourceHealth(report, "lastWarRank", now),
  };
  for (const sourceName of Object.keys(sourceHealthMap)) {
    sourceHealthMap[sourceName].hqAgreement = sourceAgreement(members, sourceName);
  }

  const staleSources = Object.values(sourceHealthMap).filter((source) => source.stale || !source.ok).length;
  const average = (field) => counts[field] ? Math.round(sums[field] / counts[field]) : null;

  return {
    ...report,
    coreVersion: PRECISION_VERSION,
    mode: "precision_engine_test",
    precision: {
      version: PRECISION_VERSION,
      historyWindowHours: HISTORY_HOURS,
      historyAvailable: Boolean(history?.available),
      historyRowsRead: Number(history?.rows || 0),
      historyError: history?.error || null,
      rules: {
        hq: "consensus multi-source + cohérence historique",
        power: "fraîcheur + proximité inter-sources + anomalie historique",
        heroPower: "fraîcheur + proximité inter-sources + anomalie historique",
        rank: "accord LastIntel/LastRank + stabilité historique",
      },
      sourceHealth: sourceHealthMap,
      fieldAverageConfidence: {
        hq: average("hq"),
        power: average("power"),
        heroPower: average("heroPower"),
        rank: average("rank"),
      },
    },
    summary: {
      ...(report.summary || {}),
      highConfidenceMembers,
      reviewMembers,
      anomalyMembers,
      staleSources,
      precisionAverage: members.length ? Math.round(members.reduce((sum, member) => sum + member.confidence.score, 0) / members.length) : null,
    },
    members,
  };
}

async function readJson(response) {
  try { return await response.json(); } catch { return null; }
}

async function buildPrecisionReport(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = "/api/core/live";
  url.search = "";
  const internal = new Request(url.toString(), { method: "GET", headers: request.headers });
  const baseResponse = await coreV02.fetch(internal, env, ctx);
  const report = await readJson(baseResponse);
  if (!baseResponse.ok || !report?.members) {
    throw new Error(report?.error || `GoMo Core v0.2 HTTP ${baseResponse.status}`);
  }
  const history = await loadHistory(env.CORE_DB);
  return enrichPrecision(report, history);
}

async function precisionStatus(request, env, ctx) {
  const baseResponse = await coreV02.fetch(request, env, ctx);
  const base = await readJson(baseResponse);
  if (!baseResponse.ok) return json(base || { error: `HTTP ${baseResponse.status}` }, baseResponse.status);

  let latest3 = null;
  if (env.CORE_DB) {
    try {
      latest3 = await env.CORE_DB.prepare(
        "SELECT sync_id,started_at,completed_at,status,lastintel_status,lastrank_status,lastintel_members,lastrank_members,reconciled_members,error_json FROM core_sync_runs ORDER BY started_at DESC LIMIT 1"
      ).first();
      if (latest3?.error_json) {
        try {
          const metadata = JSON.parse(latest3.error_json);
          latest3 = { ...latest3, metadata };
        } catch {}
      }
    } catch {}
  }

  return json({
    ...base,
    precisionEngine: {
      version: PRECISION_VERSION,
      historyWindowHours: HISTORY_HOURS,
      active: true,
    },
    lastSyncDetailed: latest3,
  });
}

async function livePrecision(request, env, ctx) {
  if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method Not Allowed" }, 405);
  try {
    return json(await buildPrecisionReport(request, env, ctx));
  } catch (error) {
    return json({ error: error?.message || String(error) }, 503);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/core") {
      url.pathname = "/core/";
      return Response.redirect(url.toString(), 308);
    }
    if (url.pathname === "/core/") return handlePrecisionDashboard();
    if (url.pathname === "/api/core/live" || url.pathname === "/api/core/precision") {
      return livePrecision(request, env, ctx);
    }
    if (url.pathname === "/api/core/status") return precisionStatus(request, env, ctx);
    return coreV02.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    // Le stockage reste volontairement celui de v0.2 : trois observations brutes + canonique.
    // Le moteur v0.3 relit cet historique pour évaluer la précision sans doubler les appels externes.
    if (typeof coreV02.scheduled === "function") return coreV02.scheduled(event, env, ctx);
  },
};
