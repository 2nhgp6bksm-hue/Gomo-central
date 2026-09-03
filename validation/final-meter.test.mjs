import test from "node:test";
import assert from "node:assert/strict";

import { meteredDatabase } from "./final-cloudflare-entry.js";

function statement(meta, results = []) {
  return {
    bind() { return this; },
    async all() { return { results, meta }; },
    async run() { return { success: true, meta }; },
    async raw() { return []; },
  };
}

test("final meter totals reads, writes, operations and D1 duration", async () => {
  const meter = { rowsRead: 0, rowsWritten: 0, queryCount: 0, durationMs: 0, tables: new Set() };
  const prepared = [];
  const raw = {
    prepare(sql) {
      const value = statement({ rows_read: 7, rows_written: 2, timings: { sql_duration_ms: 1.25 } }, [{ value: 1 }]);
      prepared.push(value);
      return value;
    },
    async batch(values) {
      assert.deepEqual(values, prepared.slice(-2));
      return [
        { meta: { rows_read: 3, rows_written: 1, duration: 0.5 } },
        { meta: { rows_read: 4, rows_written: 1, timings: { sql_duration_ms: 0.75 } } },
      ];
    },
    async exec() { return { meta: { rows_read: 2, rows_written: 0, duration: 0.25 } }; },
    async dump() { return new ArrayBuffer(0); },
  };
  const db = meteredDatabase(raw, meter);

  assert.deepEqual(await db.prepare("SELECT * FROM core_current_members").first(), { value: 1 });
  const first = db.prepare("UPDATE core_sync_runs SET status='ok'");
  const second = db.prepare("INSERT INTO core_sync_metadata VALUES(1)");
  await db.batch([first, second]);
  await db.exec("SELECT * FROM core_current_source_state");

  assert.equal(meter.rowsRead, 16);
  assert.equal(meter.rowsWritten, 4);
  assert.equal(meter.queryCount, 4);
  assert.equal(meter.durationMs, 2.75);
});
