import core from "../gomo-core-entry-v071.js";

const TESTED_COMMIT = "28d4ef7ee214ffd806d723b5f5369d9147168b48";
const RAW_STATEMENT = Symbol("rawD1Statement");

function numericRowsRead(meta) {
  const value = Number(meta?.rows_read ?? meta?.rowsRead ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function recordResult(meter, result) {
  if (Array.isArray(result)) {
    for (const entry of result) recordResult(meter, entry);
    return;
  }
  meter.rowsRead += numericRowsRead(result?.meta);
}

function recordSql(meter, sql) {
  const value = String(sql || "");
  meter.queryCount += 1;
  for (const match of value.matchAll(/\b(core_[a-z0-9_]+)\b/gi)) {
    meter.tables.add(match[1].toLowerCase());
  }
}

class MeteredStatement {
  constructor(raw, meter) {
    this[RAW_STATEMENT] = raw;
    this.meter = meter;
  }

  bind(...values) {
    return new MeteredStatement(this[RAW_STATEMENT].bind(...values), this.meter);
  }

  async all() {
    const result = await this[RAW_STATEMENT].all();
    recordResult(this.meter, result);
    return result;
  }

  async first(columnName) {
    const result = await this[RAW_STATEMENT].all();
    recordResult(this.meter, result);
    const row = result?.results?.[0] ?? null;
    if (columnName === undefined) return row;
    return row === null ? null : row[columnName];
  }

  async run() {
    const result = await this[RAW_STATEMENT].run();
    recordResult(this.meter, result);
    return result;
  }

  async raw(options) {
    return this[RAW_STATEMENT].raw(options);
  }
}

function meteredDatabase(database, meter) {
  return {
    prepare(sql) {
      recordSql(meter, sql);
      return new MeteredStatement(database.prepare(sql), meter);
    },
    async batch(statements) {
      const result = await database.batch(statements.map((statement) => statement[RAW_STATEMENT]));
      recordResult(meter, result);
      return result;
    },
    async exec(sql) {
      recordSql(meter, sql);
      const result = await database.exec(sql);
      recordResult(meter, result);
      return result;
    },
    dump: (...args) => database.dump(...args),
  };
}

export { meteredDatabase };

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
    if (!measuredPath(path)) return core.fetch(request, env, ctx);
    const meter = { rowsRead: 0, queryCount: 0, tables: new Set() };
    const response = await core.fetch(request, {
      ...env,
      CORE_DB: meteredDatabase(env.CORE_DB, meter),
    }, ctx);
    return withMeasurement(response, meter);
  },
};
