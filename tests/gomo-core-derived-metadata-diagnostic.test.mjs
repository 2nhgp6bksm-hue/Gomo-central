import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { persist } from "../gomo-core-v06-storage-stable-confidence.js";

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

function member(index, { provenance = "lastintel", flags = [] } = {}) {
  const name = `Member ${String(index + 1).padStart(2, "0")}`;
  const common = {
    name,
    rank: index < 4 ? "R4" : "R3",
    hq: 35,
    power: 100_000_000 + index * 10_000,
    heroPower: 50_000_000 + index,
    kills: 1_000 + index,
  };
  const observedAt = "2026-09-03T00:15:00.000Z";
  return {
    name,
    canonical: { ...common, avatarUrl: `https://lastintel.io/member-${index}.jpg` },
    confidence: { score: 96, level: "high" },
    flags,
    fieldSources: {
      rank: "lastintel",
      hq: "consensus:lastIntel+lastRank+lastWarRank",
      power: provenance,
      heroPower: provenance,
    },
    sources: {
      lastIntel: { ...common, sourceId: `li-${index}`, avatarUrl: `https://lastintel.io/member-${index}.jpg`, observedAt },
      lastRank: { ...common, sourceId: `lr-${index}`, avatarUrl: null, observedAt },
      lastWarRank: { ...common, sourceId: `lwr-${index}`, avatarUrl: null, observedAt },
    },
  };
}

function fixture({ provenance = "lastintel", flags = [] } = {}) {
  return {
    generatedAt: "2026-09-03T00:15:00.000Z",
    members: Array.from({ length: 94 }, (_, index) => member(index, { provenance, flags })),
    sources: {
      lastIntel: { ok: true, memberCount: 94 },
      lastRank: { ok: true, memberCount: 94 },
      lastWarRank: { ok: true, memberCount: 94 },
    },
    summary: { unionMembers: 94, conflicts: 0 },
  };
}

async function seeded() {
  const db = new LocalD1();
  await persist(db, fixture());
  await persist(db, fixture());
  return db;
}

test("fieldSources seul ne cree plus de snapshot ni de mise a jour courante", async (t) => {
  const db = await seeded();
  t.after(() => db.close());

  const snapshotsBefore = db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots");
  const observationsBefore = db.scalar("SELECT COUNT(*) FROM core_source_observations");

  const result = await persist(db, fixture({ provenance: "lastwarrank" }));

  assert.equal(result.changed, false);
  assert.equal(result.storage.derivedMetadataRowsSuppressed, 94);
  assert.equal(result.storage.changesByStatement.canonical_snapshots_inserted, 0);
  assert.equal(result.storage.changesByStatement.current_members_updated, 0);
  assert.equal(result.storage.changesByStatement.source_observations_inserted, 0);
  assert.equal(result.storage.changesByStatement.current_source_state_updated, 0);
  assert.equal(result.storage.meaningfulRows, 0);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots"), snapshotsBefore);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_source_observations"), observationsBefore);
});

test("flags seuls ne creent plus de snapshot ni de mise a jour courante", async (t) => {
  const db = await seeded();
  t.after(() => db.close());

  const result = await persist(db, fixture({ flags: ["power_conflict"] }));

  assert.equal(result.changed, false);
  assert.equal(result.storage.derivedMetadataRowsSuppressed, 94);
  assert.equal(result.storage.changesByStatement.canonical_snapshots_inserted, 0);
  assert.equal(result.storage.changesByStatement.current_members_updated, 0);
  assert.equal(result.storage.changesByStatement.source_observations_inserted, 0);
  assert.equal(result.storage.changesByStatement.current_source_state_updated, 0);
  assert.equal(result.storage.meaningfulRows, 0);
});


test("une vraie observation source peut actualiser les metadonnees courantes sans creer de snapshot", async (t) => {
  const db = await seeded();
  t.after(() => db.close());

  const report = fixture({ provenance: "lastwarrank", flags: ["power_conflict"] });
  report.members[0].sources.lastRank.power += 1;

  const result = await persist(db, report);

  assert.equal(result.changed, true);
  assert.equal(result.storage.derivedMetadataRowsSuppressed, 93);
  assert.equal(result.storage.changesByStatement.canonical_snapshots_inserted, 0);
  assert.equal(result.storage.changesByStatement.current_members_updated, 1);
  assert.equal(result.storage.changesByStatement.source_observations_inserted, 1);
  assert.equal(result.storage.changesByStatement.current_source_state_updated, 1);
  assert.equal(result.storage.meaningfulRows, 3);
});


function freshnessFixture({ provenance = "lastintel", lastWarRankObservedAt = "2026-09-03T00:00:00.000Z" } = {}) {
  const report = fixture({ provenance, flags: ["power_conflict", "hero_power_conflict"] });
  for (const member of report.members) {
    member.sources.lastRank.power += 1_000;
    member.sources.lastRank.heroPower += 100;
    member.sources.lastWarRank.power += 2_000;
    member.sources.lastWarRank.heroPower += 200;
    member.sources.lastWarRank.observedAt = lastWarRankObservedAt;
    if (provenance === "lastwarrank") {
      member.canonical.power = member.sources.lastWarRank.power;
      member.canonical.heroPower = member.sources.lastWarRank.heroPower;
    }
  }
  return report;
}

test("un basculement de fraicheur observedAt seul ne change plus la puissance canonique", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());

  const baseline = freshnessFixture({ provenance: "lastintel", lastWarRankObservedAt: "2026-09-03T00:00:00.000Z" });
  await persist(db, baseline);
  await persist(db, baseline);

  const snapshotsBefore = db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots");
  const observationsBefore = db.scalar("SELECT COUNT(*) FROM core_source_observations");
  const flipped = freshnessFixture({ provenance: "lastwarrank", lastWarRankObservedAt: "2026-09-03T00:30:00.000Z" });
  const result = await persist(db, flipped);

  assert.equal(result.changed, false);
  assert.equal(result.storage.freshnessOnlyCanonicalRowsSuppressed, 94);
  assert.equal(result.storage.changesByStatement.canonical_snapshots_inserted, 0);
  assert.equal(result.storage.changesByStatement.current_members_updated, 0);
  assert.equal(result.storage.changesByStatement.source_observations_inserted, 0);
  assert.equal(result.storage.changesByStatement.current_source_state_updated, 0);
  assert.equal(result.storage.meaningfulRows, 0);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_canonical_snapshots"), snapshotsBefore);
  assert.equal(db.scalar("SELECT COUNT(*) FROM core_source_observations"), observationsBefore);
});

test("une vraie variation de puissance source reste historisee malgre la stabilisation de fraicheur", async (t) => {
  const db = new LocalD1();
  t.after(() => db.close());

  const baseline = freshnessFixture({ provenance: "lastintel", lastWarRankObservedAt: "2026-09-03T00:00:00.000Z" });
  await persist(db, baseline);
  await persist(db, baseline);

  const changedReport = freshnessFixture({ provenance: "lastwarrank", lastWarRankObservedAt: "2026-09-03T00:30:00.000Z" });
  changedReport.members[0].sources.lastWarRank.power += 1;
  changedReport.members[0].canonical.power = changedReport.members[0].sources.lastWarRank.power;

  const result = await persist(db, changedReport);

  assert.equal(result.changed, true);
  assert.equal(result.storage.freshnessOnlyCanonicalRowsSuppressed, 93);
  assert.equal(result.storage.changesByStatement.canonical_snapshots_inserted, 1);
  assert.equal(result.storage.changesByStatement.current_members_updated, 1);
  assert.equal(result.storage.changesByStatement.source_observations_inserted, 1);
  assert.equal(result.storage.changesByStatement.current_source_state_updated, 1);
});
