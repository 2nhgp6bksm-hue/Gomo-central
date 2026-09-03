import core from "../gomo-core-entry-v071.js";

const TESTED_COMMIT = "896a677e04701be796b99f4c471e1d074d13cf28";
const RAW_STATEMENT = Symbol("rawD1StatementFinal");

function number(meta, snake, camel) {
  const value = Number(meta?.[snake] ?? meta?.[camel] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function duration(meta) {
  const value = Number(meta?.timings?.sql_duration_ms ?? meta?.duration ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function recordResult(meter, result) {
  if (Array.isArray(result)) {
    for (const entry of result) recordResult(meter, entry);
    return;
  }
  meter.rowsRead += number(result?.meta, "rows_read", "rowsRead");
  meter.rowsWritten += number(result?.meta, "rows_written", "rowsWritten");
  meter.durationMs += duration(result?.meta);
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

function measured(response, meter) {
  const headers = new Headers(response.headers);
  headers.set("x-validation-d1-rows-read", String(meter.rowsRead));
  headers.set("x-validation-d1-rows-written", String(meter.rowsWritten));
  headers.set("x-validation-d1-query-count", String(meter.queryCount));
  headers.set("x-validation-d1-duration-ms", String(meter.durationMs));
  headers.set("x-validation-d1-tables", [...meter.tables].sort().join(","));
  headers.set("x-validation-app-commit", TESTED_COMMIT);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname !== "/api/core/refresh") {
      return core.fetch(request, env, ctx);
    }
    const meter = { rowsRead: 0, rowsWritten: 0, queryCount: 0, durationMs: 0, tables: new Set() };
    const response = await core.fetch(request, { ...env, CORE_DB: meteredDatabase(env.CORE_DB, meter) }, ctx);
    return measured(response, meter);
  },
};
