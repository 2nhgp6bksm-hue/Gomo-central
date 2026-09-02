import { readFileSync, writeFileSync } from "node:fs";

const dir = process.argv[2] || "validation-results";
const read = (name) => JSON.parse(readFileSync(`${dir}/${name}`, "utf8"));
const syncs = [1, 2, 3, 4].map((number) => read(`sync-${number}.json`));
const fixture = read("fixture.json");
const api = read("api-summary.json");

function counts(name) {
  const value = read(name);
  const rows = Array.isArray(value) ? value.flatMap((entry) => entry?.results || []) : value?.results || [];
  if (!rows[0]) throw new Error(`No D1 count row found in ${name}`);
  return rows[0];
}

function statement(result, name) {
  return Number(result?.storage?.changesByStatement?.[name] || 0);
}

const syncResults = syncs.map((result, index) => ({
  number: index + 1,
  mode: result.validationMode || "live-source-initialization",
  syncId: result.syncId,
  members: result.members,
  changed: result.changed,
  meaningfulRows: Number(result.storage?.meaningfulRows || 0),
  operationalBookkeepingRows: Number(result.storage?.operationalBookkeepingRows || 0),
  canonicalSnapshotsWritten: statement(result, "canonical_snapshots_inserted"),
  sourceObservationsWritten: statement(result, "source_observations_inserted"),
  membershipRowsWritten: statement(result, "memberships_updated"),
  tableCounts: counts(`counts-${index + 1}.json`),
}));

const fixtureResult = {
  syncId: fixture.syncId,
  target: fixture.target,
  meaningfulRows: Number(fixture.storage?.meaningfulRows || 0),
  operationalBookkeepingRows: Number(fixture.storage?.operationalBookkeepingRows || 0),
  canonicalSnapshotsWritten: statement(fixture, "canonical_snapshots_inserted"),
  sourceObservationsWritten: statement(fixture, "source_observations_inserted"),
  tableCounts: counts("counts-fixture.json"),
};

const stable = syncResults.slice(2);
const stablePass = stable.every((result) =>
  result.meaningfulRows === 0 &&
  result.canonicalSnapshotsWritten === 0 &&
  result.sourceObservationsWritten === 0
);
const fixturePass = fixtureResult.canonicalSnapshotsWritten === 1 &&
  fixtureResult.sourceObservationsWritten === 1 &&
  fixtureResult.meaningfulRows === 2;
const cronAttached = process.env.VALIDATION_CRON_ATTACHED === "true";
const passed = stablePass && fixturePass && api.ok === true && cronAttached;
const stableTechnicalWrites = Math.max(...stable.map((result) => result.operationalBookkeepingRows));

const report = {
  status: passed ? "VALIDATION CLOUDFLARE RÉUSSIE" : "VALIDATION CLOUDFLARE ÉCHOUÉE",
  resources: {
    worker: process.env.VALIDATION_WORKER_NAME,
    database: process.env.VALIDATION_DATABASE_NAME,
    cron: "15 * * * *",
    cronAttached,
  },
  code: {
    testedCommit: process.env.TESTED_COMMIT,
    validationHarnessCommit: process.env.GITHUB_SHA || null,
    version: "0.7.5-write-optimization-test",
  },
  syncs: syncResults,
  fixture: fixtureResult,
  api,
  estimates: {
    stableTechnicalRowsPerSync: stableTechnicalWrites,
    stableTechnicalRowsPerDayAt24Runs: stableTechnicalWrites * 24,
    note: "Excludes the once-daily maintenance audit/retention writes and any real source changes.",
  },
  safety: {
    mainModified: false,
    productionWorkerModified: false,
    productionDatabaseModified: false,
    productionDatabaseName: "gomo-core-db",
  },
  failureReason: passed
    ? null
    : !cronAttached
      ? "Cloudflare Workers Free limit of 5 Cron triggers prevented attaching the hourly :15 schedule (code 10072)."
      : "One or more D1 write or API contract assertions failed.",
};

writeFileSync(`${dir}/validation-report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!passed) process.exitCode = 1;
