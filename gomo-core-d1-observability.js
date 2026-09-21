function metric(meta, snake, camel) {
  const value = meta?.[snake] ?? meta?.[camel];
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function labelFor(sql) {
  const text = String(sql || "").replace(/\s+/g, " ").trim().toLowerCase();
  if (text.includes("from core_current_source_state") && text.includes("source='lastwarrank'")) return "lastwarrank.last_good_state";
  if (text.includes("from core_source_links union all") && text.includes("core_member_aliases")) return "current_state.identity";
  if (text.includes("from core_members m left join core_member_membership")) return "current_state.membership";
  if (text.includes("from core_current_members") && text.includes("max_hq") && !text.includes("insert into")) return "current_state.members";
  if (text.includes("from core_current_source_state") && !text.includes("insert into")) return "current_state.sources";
  if (text.includes("where c.active=1 and c.observed_at>=?")) return "history.targeted_current";
  if (text.includes("with w(name)") && text.includes("max(c.max_hq)")) return "history.hq_floors";
  if (text.includes("insert into core_canonical_snapshots")) return "write.canonical_snapshots";
  if (text.includes("insert into core_current_members")) return "write.current_members";
  if (text.includes("insert into core_source_observations")) return "write.source_observations";
  if (text.includes("insert into core_current_source_state")) return "write.current_source_state";
  if (text.includes("insert into core_sync_runs")) return "bookkeeping.sync_started";
  if (text.includes("update core_sync_runs")) return "bookkeeping.sync_completed";
  if (text.includes("insert into core_sync_metadata")) return "bookkeeping.sync_metadata";
  if (text.includes("insert into core_public_reports")) return "bookkeeping.public_report";
  if (text.includes("core_member_membership")) return "write.membership";
  if (text.includes("core_members")) return "write.members";
  if (text.includes("core_member_aliases")) return "write.aliases";
  if (text.includes("core_source_links")) return "write.source_links";
  if (text.includes("sqlite_master")) return "schema.check";
  return /^select\b|^with\b/.test(text) ? "read.other" : "write.other";
}

class Collector {
  constructor() {
    this.operations = new Map();
  }

  record(label, result) {
    const meta = result?.meta || null;
    const rowsRead = metric(meta, "rows_read", "rowsRead");
    const rowsWritten = metric(meta, "rows_written", "rowsWritten");
    const current = this.operations.get(label) || {
      queries: 0,
      rowsRead: 0,
      rowsWritten: 0,
      rowsReadAvailable: true,
      rowsWrittenAvailable: true,
    };
    current.queries += 1;
    if (rowsRead == null) current.rowsReadAvailable = false;
    else current.rowsRead += rowsRead;
    if (rowsWritten == null) current.rowsWrittenAvailable = false;
    else current.rowsWritten += rowsWritten;
    this.operations.set(label, current);
  }

  snapshot() {
    const operations = {};
    let queries = 0;
    let rowsRead = 0;
    let rowsWritten = 0;
    let rowsReadAvailable = true;
    let rowsWrittenAvailable = true;
    for (const [label, value] of [...this.operations.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      queries += value.queries;
      rowsRead += value.rowsRead;
      rowsWritten += value.rowsWritten;
      rowsReadAvailable &&= value.rowsReadAvailable;
      rowsWrittenAvailable &&= value.rowsWrittenAvailable;
      operations[label] = {
        queries: value.queries,
        rowsRead: value.rowsReadAvailable ? value.rowsRead : null,
        rowsWritten: value.rowsWrittenAvailable ? value.rowsWritten : null,
      };
    }
    return {
      version: 1,
      source: "d1-result-meta",
      queries,
      rowsRead: rowsReadAvailable ? rowsRead : null,
      rowsWritten: rowsWrittenAvailable ? rowsWritten : null,
      operations,
    };
  }
}

class InstrumentedStatement {
  constructor(statement, sql, collector) {
    this.statement = statement;
    this.sql = String(sql || "");
    this.collector = collector;
  }

  bind(...params) {
    return new InstrumentedStatement(this.statement.bind(...params), this.sql, this.collector);
  }

  async first(...args) {
    const result = await this.statement.first(...args);
    this.collector.record(labelFor(this.sql), result);
    return result;
  }

  async all(...args) {
    const result = await this.statement.all(...args);
    this.collector.record(labelFor(this.sql), result);
    return result;
  }

  async run(...args) {
    const result = await this.statement.run(...args);
    this.collector.record(labelFor(this.sql), result);
    return result;
  }
}

function createInstrumentedD1(database) {
  const collector = new Collector();
  const wrapped = {
    prepare(sql) {
      return new InstrumentedStatement(database.prepare(sql), sql, collector);
    },
    async batch(statements) {
      const wrappedStatements = statements.map((statement) => (
        statement instanceof InstrumentedStatement ? statement : null
      ));
      const results = await database.batch(wrappedStatements.map((statement, index) => (
        statement ? statement.statement : statements[index]
      )));
      results.forEach((result, index) => {
        const statement = wrappedStatements[index];
        collector.record(statement ? labelFor(statement.sql) : "batch.other", result);
      });
      return results;
    },
    exec(sql) {
      return database.exec(sql);
    },
    d1Observability: collector,
  };
  return { database: wrapped, observability: collector };
}

export { createInstrumentedD1, labelFor };
