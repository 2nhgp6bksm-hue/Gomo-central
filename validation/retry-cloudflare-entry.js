import core from "../gomo-core-entry-v071.js";
import { invalidateCurrentApiCache } from "../gomo-core-entry-v07.js";
import { admin } from "../gomo-core-v06-engine.js";
import { meteredDatabase } from "./read-cloudflare-entry.js";

const TESTED_COMMIT = "28d4ef7ee214ffd806d723b5f5369d9147168b48";

function measuredPath(pathname) {
  return ["/api/core/refresh", "/api/core/members", "/api/core/power"].includes(pathname);
}

function withMeasurement(response, meter) {
  const headers = new Headers(response.headers);
  const tables = [...meter.tables].sort();
  const historyRead = tables.some((table) => [
    "core_canonical_snapshots",
    "core_source_observations",
    "core_daily_member_rollups",
  ].includes(table));
  headers.set("x-validation-d1-rows-read", String(meter.rowsRead));
  headers.set("x-validation-d1-query-count", String(meter.queryCount));
  headers.set("x-validation-d1-tables", tables.join(","));
  headers.set("x-validation-d1-history-read", historyRead ? "1" : "0");
  headers.set("x-validation-app-commit", TESTED_COMMIT);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;

    if (path === "/__validation/reset-current-cache") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      if (!admin(request, env)) return new Response("Unauthorized", { status: 401 });
      await invalidateCurrentApiCache(null, env, request);
      return Response.json({ ok: true, d1RowsRead: 0 }, { headers: { "cache-control": "no-store" } });
    }

    if (!measuredPath(path)) return core.fetch(request, env, ctx);
    const meter = { rowsRead: 0, queryCount: 0, tables: new Set() };
    const database = meteredDatabase(env.CORE_DB, meter);
    const response = await core.fetch(request, { ...env, CORE_DB: database }, ctx);
    return withMeasurement(response, meter);
  },
};
