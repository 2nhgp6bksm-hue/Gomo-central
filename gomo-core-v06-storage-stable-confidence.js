import { norm } from "./gomo-core-v06-engine.js";
import { persist as persistBase } from "./gomo-core-v06-storage.js";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function stableJson(value, fallback) {
  return JSON.stringify(stable(value ?? fallback));
}

const same = (left, right) => left === right || (left == null && right == null);

function canonicalEvidenceStable(current, member) {
  if (!current || !member) return false;
  const canonical = member.canonical || {};
  return same(current.name, member.name)
    && same(current.rank, canonical.rank ?? null)
    && same(current.hq, canonical.hq ?? null)
    && same(current.power, canonical.power ?? null)
    && same(current.hero_power, canonical.heroPower ?? null)
    && same(current.kills, canonical.kills ?? null)
    && same(current.avatar_url, canonical.avatarUrl ?? null)
    && same(current.flags_json, stableJson([...new Set(member.flags || [])].sort(), []))
    && same(current.field_sources_json, stableJson(member.fieldSources, {}));
}

function uniqueCurrentMembers(rows) {
  const map = new Map();
  const ambiguous = new Set();
  for (const row of rows || []) {
    const key = norm(row.name);
    if (!key) continue;
    if (map.has(key)) {
      ambiguous.add(key);
      map.delete(key);
      continue;
    }
    if (!ambiguous.has(key)) map.set(key, row);
  }
  return map;
}

async function stabilizeTimeOnlyConfidence(db, report) {
  if (!db || !Array.isArray(report?.members) || report.members.length === 0) {
    return { report, suppressed: 0, rowsReadForStability: 0 };
  }

  let result;
  try {
    result = await db.prepare(`
      SELECT name,rank,hq,power,hero_power,kills,avatar_url,
        confidence,confidence_level,flags_json,field_sources_json
      FROM core_current_members
      WHERE active=1
    `).all();
  } catch {
    // Initial install/backfill paths may not have the current-state table yet.
    // In that case preserve the existing persistence behaviour unchanged.
    return { report, suppressed: 0, rowsReadForStability: 0 };
  }

  const rows = result?.results || [];
  const currentByName = uniqueCurrentMembers(rows);
  let suppressed = 0;
  const members = report.members.map((member) => {
    const current = currentByName.get(norm(member.name));
    if (!canonicalEvidenceStable(current, member)) return member;

    const nextScore = member.confidence?.score ?? 0;
    const nextLevel = member.confidence?.level || "review";
    if (same(current.confidence, nextScore) && same(current.confidence_level, nextLevel)) return member;

    suppressed += 1;
    return {
      ...member,
      confidence: {
        ...(member.confidence || {}),
        score: current.confidence ?? nextScore,
        level: current.confidence_level || nextLevel,
      },
    };
  });

  return {
    report: { ...report, members },
    suppressed,
    rowsReadForStability: rows.length,
  };
}

async function persist(db, report) {
  const stabilized = await stabilizeTimeOnlyConfidence(db, report);
  const saved = await persistBase(db, stabilized.report);
  return {
    ...saved,
    storage: {
      ...saved.storage,
      volatileConfidenceRowsSuppressed: stabilized.suppressed,
      confidenceStabilityRowsLoaded: stabilized.rowsReadForStability,
    },
  };
}

export { persist, stabilizeTimeOnlyConfidence };
