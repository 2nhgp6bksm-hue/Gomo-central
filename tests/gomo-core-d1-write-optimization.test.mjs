import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import core from "../gomo-core-entry-v071.js";
import { persist } from "../gomo-core-v06-storage.js";

class LocalStatement {
  constructor(database, sql, params = []) {
    this.database = database;
    this.sql = sql;
    this.params = params;
  }

  bind(...params) {
    return new LocalStatement(this.database, this.sql, params);
  }

  statement() {
    return this.database.prepare(this.sql);
  }

  async first() {
    return this.statement().get(...this.params) ?? null;
  }

  async all() {
    return { results: this.statement().all(...this.params), meta: { changes: 0 } };
  }

  async run() {
    const result = this.statement().run(...this.params);
    return { success: true, meta: { changes: Number(result.changes || 0) } };
  }

  async execute() {
    const statement = this.statement();
    if (statement.columns().length) {
      return { results: statement.all(...this.params), meta: { changes: 0 } };
    }
    const result = statement.run(...this.params);
    return { success: true, meta: { changes: Number(result.changes || 0) } };
  }
}

class LocalD1 {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    this.database.exec(readFileSync(new URL("../migrations/0001_gomo_core.sql", import.meta.url), "utf8"));
    this.database.exec(readFileSync(new URL("../migrations/0002_gomo_core_hardening.sql", import.meta.url), "utf8"));
    this.database.exec(readFileSync(new URL("../migrations/0003_gomo_core_current_state.sql", import.meta.url), "utf8"));
  }

  prepare(sql) {
    return new LocalStatement(this.database, sql);
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.execute());
    return results;
  }

  async exec(sql) {
    this.database.exec(sql);
  }

  scalar(sql, ...params) {
    return Object.values(this.database.prepare(sql).get(...params))[0];
  }

  rows(sql, ...params) {
    return this.database.prepare(sql).all(...params);
  }

  close() {
    this.database.close();
  }
}

class MemoryCache {
  constructor() { this.values = new Map(); }
  async match(request) {
    const response = this.values.get(new Request(request).url);
    return response?.clone();
  }
  async put(request, response) {
    this.values.set(new Request(request).url, response.clone());
  }
}

function context() {
  const pending = [];
  return {
    waitUntil(promise) { pending.push(promise); },
    async flush() { await Promise.all(pending); },
  };
}

function member(name, sourceId, power) {
  return {
    name,
    canonical: {
      rank: "R3",
      hq: 35,
      power,
      heroPower: Math.round(power / 2),
      kills: 1000,
      avatarUrl: `https://lastintel.io/${sourceId}.jpg`,
    },
    confidence: { score: 96, level: "high" },
    flags: [],
    fieldSources: { rank: "lastintel", hq: "lastintel", power: "lastintel" },
    sources: {
      lastIntel: {
        sourceId: `li-${sourceId}`,
        name,
        rank: "R3",
        hq: 35,
        power,
        heroPower: Math.round(power / 2),
        kills: 1000,
        avatarUrl: `https://lastintel.io/${sourceId}.jpg`,
        observedAt: "2026-09-02T00:00:00.000Z",
      },
      lastRank: {
        sourceId: `lr-${sourceId}`,
        name,
        rank: "R3",
        hq: 35,
        power,
        heroPower: Math.round(power / 2),
        kills: null,
        avatarUrl: null,
        observedAt: "2026-09-02T00:00:00.000Z",
      },
    },
  };
}

function report(firstPower = 100_000) {
  const members = [
    member("Alpha", "alpha", firstPower),
    member("Bravo", "bravo", 200_000),
  ];
  return {
    generatedAt: "2026-09-02T00:00:00.000Z",
    members,
    sources: {
      lastIntel: { ok: true, memberCount: 2 },
      lastRank: { ok: true, memberCount: 2 },
      lastWarRank: { ok: false, memberCount: 0, error: "fixture_disabled" },
    },
    summary: { unionMembers: 2, matchedBothSources: 2, conflicts: 0 },
  };
}

test("les synchronisations identiques n'écrivent plus les membres ni leur historique", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());

  const first = await persist(db, report());
  assert.equal(first.changed, true);
  assert.equal(first.storage.changesByStatement.canonical_snapshots_inserted, 2);
  assert.equal(first.storage.changesByStatement.source_observations_inserted, 4);

  const second = await persist(db, report());
  assert.equal(second.storage.changesByStatement.members_inserted, 0);
  assert.equal(second.storage.changesByStatement.members_updated, 0);
  assert.equal(second.storage.changesByStatement.aliases_updated, 0);
  assert.equal(second.storage.changesByStatement.canonical_snapshots_inserted, 0);
  assert.equal(second.storage.changesByStatement.source_links_updated, 0);
  assert.equal(second.storage.changesByStatement.source_observations_inserted, 0);
  assert.equal(second.storage.changesByStatement.memberships_updated, 2, "la seconde confirmation des nouveaux membres reste nécessaire");

  const third = await persist(db, report());
  assert.equal(third.changed, false);
  assert.equal(third.storage.meaningfulRows, 0);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots"), 2);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_source_observations"), 4);

  const changed = await persist(db, report(100_001));
  assert.equal(changed.changed, true);
  assert.equal(changed.storage.changesByStatement.members_inserted, 0);
  assert.equal(changed.storage.changesByStatement.members_updated, 0);
  assert.equal(changed.storage.changesByStatement.aliases_updated, 0);
  assert.equal(changed.storage.changesByStatement.memberships_updated, 0);
  assert.equal(changed.storage.changesByStatement.canonical_snapshots_inserted, 1);
  assert.equal(changed.storage.changesByStatement.source_links_updated, 0);
  assert.equal(changed.storage.changesByStatement.source_observations_inserted, 2);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots"), 3);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_source_observations"), 6);

  const alphaId = db.scalar("SELECT gomo_id FROM core_members WHERE current_name='Alpha'");
  const bravoId = db.scalar("SELECT gomo_id FROM core_members WHERE current_name='Bravo'");
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots WHERE gomo_id=?", alphaId), 2);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots WHERE gomo_id=?", bravoId), 1);

  const unchangedAgain = await persist(db, report(100_001));
  assert.equal(unchangedAgain.changed, false);
  assert.equal(unchangedAgain.storage.meaningfulRows, 0);

  globalThis.caches = { default: new MemoryCache() };
  t.after(() => { delete globalThis.caches; });
  const ctx = context();
  const response = await core.fetch(
    new Request("https://core.test/api/core/members"),
    { CORE_DB: db },
    ctx,
  );
  const body = await response.json();
  await ctx.flush();

  assert.equal(response.status, 200);
  assert.equal(body.memberCount, 2);
  assert.equal(body.members.find((entry) => entry.name === "Alpha").power, 100_001);
  assert.equal(body.members.find((entry) => entry.name === "Bravo").power, 200_000);
});
