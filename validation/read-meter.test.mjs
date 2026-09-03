import test from "node:test";
import assert from "node:assert/strict";

import { meteredDatabase } from "./read-cloudflare-entry.js";

function statement(rowsRead, results = []) {
  return {
    bind() { return this; },
    async all() { return { results, meta: { rows_read: rowsRead } }; },
    async run() { return { success: true, meta: { rows_read: rowsRead } }; },
    async raw() { return []; },
  };
}

test("the validation wrapper totals D1 meta.rows_read for statements and batches", async () => {
  const meter = { rowsRead: 0, queryCount: 0, tables: new Set() };
  const rawStatements = [];
  const raw = {
    prepare(sql) {
      const value = statement(sql.includes("members") ? 7 : 5, [{ value: 1 }]);
      rawStatements.push(value);
      return value;
    },
    async batch(values) {
      assert.deepEqual(values, rawStatements.slice(-2));
      return [{ meta: { rows_read: 3 } }, { meta: { rows_read: 4 } }];
    },
    async exec() { return { meta: { rows_read: 2 } }; },
    async dump() { return new ArrayBuffer(0); },
  };
  const db = meteredDatabase(raw, meter);

  assert.deepEqual(await db.prepare("SELECT * FROM core_current_members").first(), { value: 1 });
  const first = db.prepare("SELECT * FROM core_current_members");
  const second = db.prepare("SELECT * FROM core_current_source_state");
  await db.batch([first, second]);
  await db.exec("SELECT * FROM core_sync_runs");

  assert.equal(meter.rowsRead, 16);
  assert.equal(meter.queryCount, 4);
  assert.deepEqual([...meter.tables].sort(), [
    "core_current_members",
    "core_current_source_state",
    "core_sync_runs",
  ]);
});
