import core from "../gomo-core-entry-v071.js";
import { persist } from "../gomo-core-v06-storage.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function authorized(request, env) {
  const expected = String(env.GOMO_CORE_ADMIN_KEY || "");
  const supplied = String(request.headers.get("authorization") || "");
  return Boolean(expected) && supplied === `Bearer ${expected}`;
}

async function latestStoredReport(db) {
  const row = await db.prepare(
    "SELECT sync_id,report_json FROM core_public_reports ORDER BY created_at DESC LIMIT 1",
  ).first();
  if (!row?.report_json) throw new Error("No stored report available for validation replay");
  return { syncId: row.sync_id, report: JSON.parse(row.report_json) };
}

async function saveStoredReport(db, syncId, report) {
  const generatedAt = report.generatedAt || new Date().toISOString();
  await db.prepare(`
    INSERT INTO core_public_reports(sync_id,generated_at,report_json,created_at)
    VALUES(?,?,?,?)
    ON CONFLICT(sync_id) DO UPDATE SET
      generated_at=excluded.generated_at,
      report_json=excluded.report_json,
      created_at=excluded.created_at
  `).bind(syncId, generatedAt, JSON.stringify(report), new Date().toISOString()).run();
}

async function replayStoredReport(env) {
  const stored = await latestStoredReport(env.CORE_DB);
  const saved = await persist(env.CORE_DB, structuredClone(stored.report));
  if (saved.changed) await saveStoredReport(env.CORE_DB, saved.syncId, stored.report);
  return {
    ok: true,
    validationMode: "identical-stored-report-replay",
    replayedFromSyncId: stored.syncId,
    ...saved,
  };
}

function sourceEntries(member) {
  return [
    ["lastIntel", member?.sources?.lastIntel],
    ["lastRank", member?.sources?.lastRank],
    ["lastWarRank", member?.sources?.lastWarRank],
  ];
}

function choosePowerFixture(report) {
  for (const member of report.members || []) {
    const canonicalPower = Number(member?.canonical?.power);
    if (!Number.isFinite(canonicalPower)) continue;
    for (const [sourceName, source] of sourceEntries(member)) {
      if (!source || Number(source.power) !== canonicalPower) continue;
      return { member, source, sourceName, canonicalPower };
    }
  }
  throw new Error("No member with a numeric canonical/source power pair is available");
}

async function changeOneMember(env) {
  const stored = await latestStoredReport(env.CORE_DB);
  const report = structuredClone(stored.report);
  const chosen = choosePowerFixture(report);
  const after = chosen.canonicalPower + 1;

  chosen.member.canonical.power = after;
  chosen.source.power = after;
  report.generatedAt = new Date().toISOString();

  const saved = await persist(env.CORE_DB, report);
  if (saved.changed) await saveStoredReport(env.CORE_DB, saved.syncId, report);

  return {
    ok: true,
    validationMode: "controlled-single-member-power-change",
    basedOnSyncId: stored.syncId,
    target: {
      gomoId: chosen.member.gomoId || null,
      name: chosen.member.name,
      field: "power",
      source: chosen.sourceName,
      before: chosen.canonicalPower,
      after,
    },
    ...saved,
  };
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path === "/__validation/replay-stored-report" || path === "/__validation/change-one-member") {
      if (request.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
      if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
      try {
        const data = path.endsWith("replay-stored-report")
          ? await replayStoredReport(env)
          : await changeOneMember(env);
        return json(data);
      } catch (error) {
        return json({ error: error?.message || String(error) }, 503);
      }
    }
    return core.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    return core.scheduled(event, env, ctx);
  },
};
