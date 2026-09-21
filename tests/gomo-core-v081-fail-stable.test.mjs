import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import {
  loadLastGoodLastWarRank,
  reconcileWithLastWarRank,
} from "../gomo-core-entry-lastwarrank.js";
import { createInstrumentedD1 } from "../gomo-core-d1-observability.js";
import { persist } from "../gomo-core-v06-storage-stable-confidence.js";

class LocalStatement {
  constructor(owner, sql, params = []) {
    this.owner = owner;
    this.sql = String(sql);
    this.params = params;
  }
  bind(...params) { return new LocalStatement(this.owner, this.sql, params); }
  statement() { return this.owner.database.prepare(this.sql); }
  async first() {
    this.owner.firstCalls.push(this.sql);
    return this.statement().get(...this.params) ?? null;
  }
  async all() {
    this.owner.allCalls.push(this.sql);
    const results = this.statement().all(...this.params);
    return { results, meta: { changes: 0, rows_read: results.length, rows_written: 0 } };
  }
  async run() {
    const result = this.statement().run(...this.params);
    const changes = Number(result.changes || 0);
    return { success: true, meta: { changes, rows_read: 0, rows_written: changes } };
  }
  async execute() {
    const statement = this.statement();
    if (statement.columns().length) {
      const results = statement.all(...this.params);
      return { results, meta: { changes: 0, rows_read: results.length, rows_written: 0 } };
    }
    const result = statement.run(...this.params);
    const changes = Number(result.changes || 0);
    return { success: true, meta: { changes, rows_read: 0, rows_written: changes } };
  }
}

class LocalD1 {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    this.firstCalls = [];
    this.allCalls = [];
    for (const file of [
      "0001_gomo_core.sql",
      "0002_gomo_core_hardening.sql",
      "0003_gomo_core_current_state.sql",
    ]) this.database.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  }
  prepare(sql) { return new LocalStatement(this, sql); }
  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.execute());
    return results;
  }
  async exec(sql) { this.database.exec(sql); }
  scalar(sql, ...params) { return Object.values(this.database.prepare(sql).get(...params))[0]; }
  close() { this.database.close(); }
}

const T0 = "2026-09-20T10:00:00.000Z";
const T1 = "2026-09-21T10:00:00.000Z";

function source(name, id, overrides = {}) {
  return {
    sourceId: id,
    name,
    rank: "R4",
    hq: 35,
    power: 100,
    heroPower: 50,
    kills: 10,
    avatarUrl: null,
    observedAt: T1,
    ...overrides,
  };
}

function coreFixture() {
  const li = source("Alice", "li-alice", { power: 110, heroPower: 55 });
  const lr = source("Alice", "lr-alice", { power: 105, heroPower: 52 });
  return {
    coreVersion: "0.8.0-test",
    generatedAt: T1,
    sources: {
      lastIntel: { ok: true, memberCount: 1, updatedAt: T1 },
      lastRank: { ok: true, memberCount: 1, updatedAt: T1 },
    },
    freshness: { lastIntel: T1, lastRank: T1 },
    summary: { unionMembers: 1 },
    members: [{
      name: "Alice",
      canonical: { rank: "R4", hq: 35, power: 110, heroPower: 55, kills: 10, avatarUrl: null },
      confidence: { score: 90, level: "high" },
      flags: [],
      fieldSources: { rank: "lastIntel", hq: "consensus:lastIntel+lastRank", power: "lastIntel", heroPower: "lastIntel" },
      sources: { lastIntel: li, lastRank: lr },
      comparison: {},
    }],
  };
}

function liveLastWarRank(overrides = {}) {
  return {
    ok: true,
    status: "ok",
    page: { observedAt: T1 },
    alliance: {},
    roster: { members: [source("Alice", "lwr-alice", overrides)] },
  };
}

function reportFixture({ sourceChange = false, businessChange = false, derivedChange = false } = {}) {
  const li = source("Alice", "li-alice", { power: businessChange ? 111 : 110, heroPower: 55 });
  const lr = source("Alice", "lr-alice", { power: sourceChange ? 106 : 105, heroPower: 52 });
  const lwr = source("Alice", "lwr-alice", { power: 100, heroPower: 50, observedAt: T0 });
  return {
    generatedAt: T1,
    sources: {
      lastIntel: { ok: true, memberCount: 1 },
      lastRank: { ok: true, memberCount: 1 },
      lastWarRank: { ok: true, status: "ok", stale: false, memberCount: 1, updatedAt: T0 },
    },
    summary: { unionMembers: 1 },
    members: [{
      name: "Alice",
      canonical: { rank: "R4", hq: 35, power: businessChange ? 111 : 110, heroPower: 55, kills: 10, avatarUrl: null },
      confidence: { score: 90, level: "high" },
      flags: derivedChange ? ["power_conflict"] : [],
      fieldSources: { rank: "lastIntel", hq: "consensus:lastIntel+lastRank+lastWarRank", power: derivedChange ? "lastRank" : "lastIntel", heroPower: "lastIntel" },
      sources: { lastIntel: li, lastRank: lr, lastWarRank: lwr },
    }],
  };
}

async function seedStable(db) {
  await persist(db, reportFixture());
  await persist(db, reportFixture());
}

test("LastWarRank OK conserve le comportement normal", () => {
  const report = reconcileWithLastWarRank(coreFixture(), liveLastWarRank());
  assert.equal(report.sources.lastWarRank.ok, true);
  assert.equal(report.sources.lastWarRank.stale, false);
  assert.equal(report.members[0].sources.lastWarRank.sourceId, "lwr-alice");
  assert.equal(report.members[0].comparison.hq.status, "agree_3_of_3");
});

test("HTTP 403 charge en une requete le dernier etat LastWarRank", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());
  await seedStable(db);
  db.allCalls.length = 0;

  const fallback = await loadLastGoodLastWarRank(db, { error: "HTTP 403", httpStatus: 403 });
  assert.equal(fallback.ok, false);
  assert.equal(fallback.status, "error");
  assert.equal(fallback.stale, true);
  assert.equal(fallback.error, "HTTP 403");
  assert.equal(fallback.lastGoodAt, T0);
  assert.equal(db.allCalls.filter((sql) => sql.includes("core_current_source_state")).length, 1);
});

test("HTTP 403 sans ancien etat reste proprement degrade", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());
  const fallback = await loadLastGoodLastWarRank(db, { error: "HTTP 403", httpStatus: 403 });
  const report = reconcileWithLastWarRank(coreFixture(), fallback);
  assert.equal(report.sources.lastWarRank.ok, false);
  assert.equal(report.sources.lastWarRank.stale, false);
  assert.equal(report.sources.lastWarRank.lastGoodMembers, 0);
  assert.equal(report.members[0].sources.lastWarRank, null);
});

test("LastWarRank stale ne gagne jamais Power ou Hero Power", () => {
  const fallback = {
    ...liveLastWarRank({ power: 999, heroPower: 888, observedAt: "2026-09-22T00:00:00.000Z", stale: true }),
    ok: false,
    status: "error",
    stale: true,
    error: "HTTP 403",
    lastGoodAt: "2026-09-22T00:00:00.000Z",
    page: { observedAt: "2026-09-22T00:00:00.000Z" },
  };
  const member = reconcileWithLastWarRank(coreFixture(), fallback).members[0];
  assert.equal(member.canonical.power, 110);
  assert.equal(member.canonical.heroPower, 55);
  assert.equal(member.fieldSources.power, "lastIntel");
  assert.equal(member.fieldSources.heroPower, "lastIntel");
});

test("membership reste exclusivement pilote par LastIntel", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());
  const report = reportFixture();
  report.members.push({
    ...structuredClone(report.members[0]),
    name: "Only Rank",
    sources: {
      lastIntel: null,
      lastRank: source("Only Rank", "lr-only"),
      lastWarRank: source("Only Rank", "lwr-only"),
    },
  });
  const saved = await persist(db, report);
  assert.equal(saved.members, 1);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_current_members"), 1);
});

test("un 403 ne cree aucune observation ni current_source_state LastWarRank", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());
  await seedStable(db);
  const failed = reportFixture();
  failed.sources.lastWarRank = { ok: false, status: "error", stale: true, memberCount: 0, lastGoodMembers: 1, lastGoodAt: T0, error: "HTTP 403" };
  failed.members[0].sources.lastWarRank.stale = true;
  const observations = db.scalar("SELECT COUNT(*) FROM core_source_observations WHERE source='lastwarrank'");
  const result = await persist(db, failed);
  assert.equal(result.storage.changesByStatement.source_observations_inserted, 0);
  assert.equal(result.storage.changesByStatement.current_source_state_updated, 0);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_source_observations WHERE source='lastwarrank'"), observations);
});

test("le retour de LastWarRank sort automatiquement du mode stale", () => {
  const failed = reconcileWithLastWarRank(coreFixture(), {
    ...liveLastWarRank(), ok: false, status: "error", stale: true, error: "HTTP 403", lastGoodAt: T1,
  });
  const recovered = reconcileWithLastWarRank(coreFixture(), liveLastWarRank({ power: 101 }));
  assert.equal(failed.sources.lastWarRank.stale, true);
  assert.equal(recovered.sources.lastWarRank.ok, true);
  assert.equal(recovered.sources.lastWarRank.stale, false);
  assert.equal(recovered.members[0].sources.lastWarRank.stale, false);
});

test("le 403 seul ne provoque aucun churn de consensus ou fieldSources", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());
  await seedStable(db);
  const failed = reportFixture();
  failed.sources.lastWarRank = { ok: false, status: "error", stale: true, memberCount: 0, lastGoodMembers: 1, lastGoodAt: T0, error: "HTTP 403" };
  failed.members[0].sources.lastWarRank.stale = true;
  const result = await persist(db, failed);
  assert.equal(result.storage.changesByStatement.canonical_snapshots_inserted, 0);
  assert.equal(result.storage.changesByStatement.current_members_updated, 0);
  assert.equal(result.storage.derivedMetadataRowsSuppressed, 0);
});

test("un membre totalement inchange produit zero ecriture metier", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());
  await seedStable(db);
  const result = await persist(db, reportFixture());
  assert.equal(result.storage.meaningfulRows, 0);
  assert.equal(result.storage.changesByStatement.current_members_updated, 0);
});

test("les metadonnees derivees restent persistees quand une vraie source change", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());
  await seedStable(db);
  const result = await persist(db, reportFixture({ sourceChange: true, derivedChange: true }));
  assert.equal(result.storage.changesByStatement.current_members_updated, 1);
  const row = db.database.prepare("SELECT flags_json,field_sources_json FROM core_current_members WHERE name='Alice'").get();
  assert.deepEqual(JSON.parse(row.flags_json), ["power_conflict"]);
  assert.equal(JSON.parse(row.field_sources_json).power, "lastRank");
});

test("un changement metier reel conserve son ecriture current_members", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());
  await seedStable(db);
  const result = await persist(db, reportFixture({ businessChange: true }));
  assert.equal(result.storage.changesByStatement.canonical_snapshots_inserted, 1);
  assert.equal(result.storage.changesByStatement.current_members_updated, 1);
  assert.equal(db.scalar("SELECT power FROM core_current_members WHERE name='Alice'"), 111);
});

test("l'instrumentation D1 conserve le resultat et expose des labels stables", async (t) => {
  const raw = new LocalD1();
  t.after(() => raw.close());
  const instrumented = createInstrumentedD1(raw);
  const result = await persist(instrumented.database, reportFixture());
  const metrics = instrumented.observability.snapshot();
  assert.equal(result.members, 1);
  assert.equal(raw.scalar("SELECT COUNT(*) FROM core_current_members"), 1);
  assert.ok(metrics.operations["current_state.members"]);
  assert.ok(metrics.operations["write.current_members"]);
  assert.ok(metrics.operations["bookkeeping.sync_metadata"]);
  assert.equal(typeof metrics.rowsRead, "number");
  assert.equal(typeof metrics.rowsWritten, "number");
});
