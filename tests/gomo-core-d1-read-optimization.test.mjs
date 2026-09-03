import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import core from "../gomo-core-entry-v071.js";
import { invalidateCurrentApiCache } from "../gomo-core-entry-v07.js";
import { hqFloors, protect } from "../gomo-core-v06-engine.js";
import { persist } from "../gomo-core-v06-storage.js";

class LocalStatement {
  constructor(owner, sql, params = []) {
    this.owner = owner;
    this.sql = String(sql);
    this.params = params;
  }
  bind(...params) { return new LocalStatement(this.owner, this.sql, params); }
  statement() { return this.owner.database.prepare(this.sql); }
  async first() { return this.statement().get(...this.params) ?? null; }
  async all() { return { results: this.statement().all(...this.params), meta: { changes: 0 } }; }
  async run() {
    const result = this.statement().run(...this.params);
    return { success: true, meta: { changes: Number(result.changes || 0) } };
  }
  async execute() {
    const statement = this.statement();
    if (statement.columns().length) return { results: statement.all(...this.params), meta: { changes: 0 } };
    const result = statement.run(...this.params);
    return { success: true, meta: { changes: Number(result.changes || 0) } };
  }
}

class LocalD1 {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    this.prepared = [];
    for (const file of [
      "0001_gomo_core.sql",
      "0002_gomo_core_hardening.sql",
      "0003_gomo_core_current_state.sql",
    ]) this.database.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  }
  prepare(sql) { this.prepared.push(String(sql)); return new LocalStatement(this, sql); }
  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.execute());
    return results;
  }
  async exec(sql) { this.database.exec(sql); }
  scalar(sql, ...params) { return Object.values(this.database.prepare(sql).get(...params))[0]; }
  rows(sql, ...params) { return this.database.prepare(sql).all(...params); }
  close() { this.database.close(); }
}

class MemoryCache {
  constructor() { this.values = new Map(); }
  async match(request) { return this.values.get(new Request(request).url)?.clone(); }
  async put(request, response) { this.values.set(new Request(request).url, response.clone()); }
  async delete(request) { return this.values.delete(new Request(request).url); }
}

function context() {
  const pending = [];
  return {
    waitUntil(promise) { pending.push(promise); },
    async flush() { await Promise.all(pending.splice(0)); },
  };
}

function member(index, powerOffset = 0) {
  const name = `Member ${String(index + 1).padStart(2, "0")}`;
  const power = 100_000_000 + index * 10_000 + powerOffset;
  const common = { name, rank: index < 4 ? "R4" : "R3", hq: 35, power, heroPower: 50_000_000 + index, kills: 1_000 + index };
  return {
    name,
    canonical: { ...common, avatarUrl: `https://lastintel.io/member-${index}.jpg` },
    confidence: { score: 96, level: "high" },
    flags: [],
    fieldSources: { rank: "lastintel", hq: "lastintel", power: "lastintel", heroPower: "lastintel" },
    sources: {
      lastIntel: { ...common, sourceId: `li-${index}`, avatarUrl: `https://lastintel.io/member-${index}.jpg`, observedAt: "2026-09-03T00:15:00.000Z" },
      lastRank: { ...common, sourceId: `lr-${index}`, avatarUrl: null, observedAt: "2026-09-03T00:15:00.000Z" },
    },
  };
}

function fixture(powerOffset = 0) {
  return {
    generatedAt: "2026-09-03T00:15:00.000Z",
    members: Array.from({ length: 94 }, (_, index) => member(index, index === 0 ? powerOffset : 0)),
    sources: {
      lastIntel: { ok: true, memberCount: 94 },
      lastRank: { ok: true, memberCount: 94 },
      lastWarRank: { ok: false, memberCount: 0, error: "fixture_disabled" },
    },
    summary: { unionMembers: 94, matchedBothSources: 94, conflicts: 0 },
  };
}

function comparable(payload) {
  return [...payload.members]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, hq, power, rank }) => ({ name, hq, power, rank }));
}

test("l'etat courant conserve 94/94 membres sans agrandir l'historique identique", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());

  const first = await persist(db, fixture());
  assert.equal(first.storage.changesByStatement.canonical_snapshots_inserted, 94);
  assert.equal(first.storage.changesByStatement.current_members_updated, 94);
  assert.equal(first.storage.changesByStatement.source_observations_inserted, 188);
  assert.equal(first.storage.changesByStatement.current_source_state_updated, 188);

  await persist(db, fixture());
  const stable = await persist(db, fixture());
  assert.equal(stable.changed, false);
  assert.equal(stable.storage.changesByStatement.canonical_snapshots_inserted, 0);
  assert.equal(stable.storage.changesByStatement.current_members_updated, 0);
  assert.equal(stable.storage.changesByStatement.source_observations_inserted, 0);
  assert.equal(stable.storage.changesByStatement.current_source_state_updated, 0);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_current_members WHERE active=1"), 94);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_current_source_state"), 188);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots"), 94);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_source_observations"), 188);

  const changed = await persist(db, fixture(1));
  assert.equal(changed.storage.changesByStatement.canonical_snapshots_inserted, 1);
  assert.equal(changed.storage.changesByStatement.current_members_updated, 1);
  assert.equal(changed.storage.changesByStatement.source_observations_inserted, 2);
  assert.equal(changed.storage.changesByStatement.current_source_state_updated, 2);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots"), 95);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_source_observations"), 190);
  assert.equal(db.scalar("SELECT max_hq FROM core_current_members WHERE name='Member 01'"), 35);
});

test("members et power lisent l'etat courant, restent equivalents et utilisent le cache 5 minutes", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());
  await persist(db, fixture());
  await persist(db, fixture());

  globalThis.caches = { default: new MemoryCache() };
  t.after(() => { delete globalThis.caches; });

  const currentContext = context();
  db.prepared.length = 0;
  const currentResponse = await core.fetch(
    new Request("https://core.test/api/core/members"),
    { CORE_DB: db, CORE_CURRENT_READS: "1" },
    currentContext,
  );
  const currentBody = await currentResponse.json();
  await currentContext.flush();
  assert.equal(currentBody.memberCount, 94);
  assert.equal(currentBody.source, "gomo-core-d1-current-state");
  assert.match(currentResponse.headers.get("cache-control"), /s-maxage=300/);
  assert.ok(currentResponse.headers.get("etag"));
  assert.ok(db.prepared.some((sql) => sql.includes("FROM core_current_members")));
  assert.ok(!db.prepared.some((sql) => sql.includes("MAX(id)") && sql.includes("core_canonical_snapshots")));

  const preparedAfterMiss = db.prepared.length;
  const hit = await core.fetch(
    new Request("https://core.test/api/core/members"),
    { CORE_DB: db, CORE_CURRENT_READS: "1" },
    context(),
  );
  assert.equal(hit.headers.get("x-gomo-core-cache"), "HIT");
  assert.equal(db.prepared.length, preparedAfterMiss);

  const alternateOriginContext = context();
  const alternateOrigin = await core.fetch(
    new Request("https://core-alternate.test/api/core/members"),
    { CORE_DB: db, CORE_CURRENT_READS: "1" },
    alternateOriginContext,
  );
  await alternateOriginContext.flush();
  assert.equal(alternateOrigin.headers.get("x-gomo-core-cache"), "MISS");
  assert.ok(db.prepared.length > preparedAfterMiss);

  globalThis.caches.default = new MemoryCache();
  const legacyResponse = await core.fetch(
    new Request("https://core.test/api/core/members"),
    { CORE_DB: db, CORE_CURRENT_READS: "0" },
    context(),
  );
  const legacyBody = await legacyResponse.json();
  assert.deepEqual(comparable(currentBody), comparable(legacyBody));

  globalThis.caches.default = new MemoryCache();
  db.prepared.length = 0;
  const powerContext = context();
  const power = await core.fetch(
    new Request("https://core.test/api/core/power"),
    { CORE_DB: db, CORE_CURRENT_READS: "1" },
    powerContext,
  );
  const powerBody = await power.json();
  await powerContext.flush();
  assert.equal(powerBody.memberCount, 94);
  assert.match(power.headers.get("cache-control"), /s-maxage=300/);
  assert.ok(!db.prepared.some((sql) => sql.includes("FROM core_member_aliases") && sql.includes("ORDER BY last_seen")));

  const beforeInvalidation = db.prepared.length;
  await invalidateCurrentApiCache();
  const afterInvalidationContext = context();
  await core.fetch(
    new Request("https://core.test/api/core/power"),
    { CORE_DB: db, CORE_CURRENT_READS: "1" },
    afterInvalidationContext,
  );
  await afterInvalidationContext.flush();
  assert.ok(db.prepared.length > beforeInvalidation);
});

test("le backfill local reproduit l'etat courant sans supprimer l'historique", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());
  await persist(db, fixture());
  const canonicalBefore = db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots");
  const observationsBefore = db.scalar("SELECT COUNT(*) FROM core_source_observations");
  db.database.exec("DELETE FROM core_current_source_state; DELETE FROM core_current_members;");
  db.database.exec(readFileSync(new URL("../validation/backfill-current-state.sql", import.meta.url), "utf8"));
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_current_members"), 94);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_current_source_state"), 188);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots"), canonicalBefore);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_source_observations"), observationsBefore);
});

test("la protection du QG maximal utilise l'etat courant sans relire l'historique", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());
  await persist(db, fixture());
  db.prepared.length = 0;

  const lower = fixture();
  lower.members[0].canonical.hq = 34;
  lower.members[0].sources.lastIntel.hq = 34;
  lower.members[0].sources.lastRank.hq = 34;
  const floors = await hqFloors(db, lower.members.map((entry) => entry.name), true);
  assert.equal(floors.get("member 01"), 35);
  assert.ok(db.prepared.some((sql) => sql.includes("core_current_members")));
  assert.ok(!db.prepared.some((sql) => sql.includes("core_canonical_snapshots")));

  const protectedReport = protect(lower, floors);
  assert.equal(protectedReport.members[0].canonical.hq, 35);
  assert.ok(protectedReport.members[0].flags.includes("hq_historical_floor"));
  await persist(db, protectedReport);
  assert.equal(db.scalar("SELECT hq FROM core_current_members WHERE name='Member 01'"), 35);
  assert.equal(db.scalar("SELECT max_hq FROM core_current_members WHERE name='Member 01'"), 35);
});
