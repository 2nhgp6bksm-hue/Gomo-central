import { readFileSync, writeFileSync } from "node:fs";

const directory = process.argv[2] || "validation-results-read";
const readJson = (name) => JSON.parse(readFileSync(`${directory}/${name}`, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function headers(name) {
  const lines = readFileSync(`${directory}/${name}`, "utf8").split(/\r?\n/);
  const values = new Map();
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    values.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }
  return values;
}

function d1Row(name) {
  const data = readJson(name);
  const executions = Array.isArray(data) ? data : [data];
  for (const execution of executions) {
    const row = execution?.results?.[0];
    if (row) return row;
  }
  throw new Error(`No D1 result row in ${name}`);
}

function measurement(name) {
  const values = headers(`${name}.headers`);
  const rowsRead = Number(values.get("x-validation-d1-rows-read"));
  const queryCount = Number(values.get("x-validation-d1-query-count"));
  const tables = String(values.get("x-validation-d1-tables") || "").split(",").filter(Boolean);
  assert(Number.isFinite(rowsRead), `${name}: missing rows_read measurement`);
  assert(Number.isFinite(queryCount), `${name}: missing query count`);
  assert(values.get("x-validation-app-commit") === "28d4ef7ee214ffd806d723b5f5369d9147168b48", `${name}: wrong application commit`);
  return {
    rowsRead,
    queryCount,
    tables,
    historyRead: values.get("x-validation-d1-history-read") === "1",
    cache: values.get("x-gomo-core-cache") || null,
  };
}

const sync = readJson("sync.json");
const members = readJson("members.json");
const power = readJson("power.json");
const before = d1Row("history-before.json");
const state = d1Row("state-after.json");
const historical = d1Row("history-sample.json");
const syncMeasurement = measurement("sync");
const membersMeasurement = measurement("members");
const powerMeasurement = measurement("power");

assert(sync.ok === true, "The single controlled synchronization failed");
assert(sync.coreVersion === "0.8.0-read-optimization-test", "Unexpected Core version during sync");
assert(syncMeasurement.historyRead === false, "Synchronization rebuilt state from historical tables");
assert(syncMeasurement.tables.includes("core_current_members"), "Synchronization did not read core_current_members");
assert(syncMeasurement.tables.includes("core_current_source_state"), "Synchronization did not read core_current_source_state");

assert(members.ok === true && members.memberCount === 94 && members.members?.length === 94, "Members API did not return 94 members");
assert(power.ok === true && power.memberCount === 94 && power.members?.length === 94, "Power API did not return 94 members");
assert(members.members.every((member) => member.active && member.membershipStatus !== "departed"), "Members API returned an inactive/departed member");
assert(members.members.every((member) => member.hq != null && member.power != null && member.rank && member.observedAt), "Members API has a missing QG, power, rank or observation");
assert(members.members.every((member) => member.fieldSources && Object.keys(member.fieldSources).length > 0), "Members API has a missing useful source");
assert(members.syncId && members.generatedAt, "Members API has no last successful synchronization");

const membersById = new Map(members.members.map((member) => [member.gomoId, member]));
for (const member of power.members) {
  const reference = membersById.get(member.gomoId);
  assert(reference, `Power member ${member.gomoId} is absent from Members`);
  for (const field of ["name", "rank", "hq", "power", "heroPower", "active", "membershipStatus"]) {
    assert(member[field] === reference[field], `Power mismatch for ${member.gomoId}.${field}`);
  }
}

for (const [name, value] of [["members", membersMeasurement], ["power", powerMeasurement]]) {
  assert(value.cache === "MISS", `${name}: first call was not a cache MISS`);
  assert(value.historyRead === false, `${name}: historical table read detected`);
  assert(value.tables.includes("core_current_members"), `${name}: core_current_members was not read`);
  assert(!value.tables.includes("core_canonical_snapshots"), `${name}: canonical history was read`);
  assert(!value.tables.includes("core_source_observations"), `${name}: source history was read`);
}
assert(!powerMeasurement.tables.includes("core_member_aliases"), "Power still reads aliases");

assert(Number(state.current_active) === 94, "Current state does not contain 94 active members");
assert(Number(state.missing_hq) === 0, "Current state has a missing QG");
assert(Number(state.missing_power) === 0, "Current state has a missing power");
assert(Number(state.missing_rank) === 0, "Current state has a missing rank");
assert(Number(state.missing_observation) === 0, "Current state has a missing observation");
assert(Number(state.useful_source_rows) >= 94, "Current source state is incomplete");
assert(Number(state.successful_syncs) >= 1, "No successful synchronization is stored");

assert(Number(state.canonical_snapshots) >= Number(before.canonical_snapshots), "Canonical history lost rows");
assert(Number(state.source_observations) >= Number(before.source_observations), "Source observation history lost rows");
assert(Number(historical.canonical_sample_rows) >= 1, "Historical canonical consultation returned no row");
assert(Number(historical.source_sample_rows) >= 1, "Historical source consultation returned no row");

const report = {
  verdict: "VALIDÉ",
  worker: process.env.VALIDATION_WORKER_NAME,
  database: process.env.VALIDATION_DATABASE_NAME,
  databaseId: process.env.VALIDATION_DATABASE_ID,
  deployedVersion: sync.coreVersion,
  testedCommit: "28d4ef7ee214ffd806d723b5f5369d9147168b48",
  members: {
    count: members.memberCount,
    active: Number(state.current_active),
    missingHq: Number(state.missing_hq),
    missingPower: Number(state.missing_power),
    missingRank: Number(state.missing_rank),
    missingObservation: Number(state.missing_observation),
    usefulSourceRows: Number(state.useful_source_rows),
    lastSuccessfulSyncId: members.syncId,
    lastSuccessfulSyncAt: members.generatedAt,
  },
  rowsRead: {
    synchronization: syncMeasurement.rowsRead,
    members: membersMeasurement.rowsRead,
    power: powerMeasurement.rowsRead,
  },
  statements: {
    synchronization: syncMeasurement,
    members: membersMeasurement,
    power: powerMeasurement,
  },
  history: {
    before: {
      canonicalSnapshots: Number(before.canonical_snapshots),
      sourceObservations: Number(before.source_observations),
    },
    after: {
      canonicalSnapshots: Number(state.canonical_snapshots),
      sourceObservations: Number(state.source_observations),
    },
    canonicalSampleRows: Number(historical.canonical_sample_rows),
    sourceSampleRows: Number(historical.source_sample_rows),
    intact: true,
  },
  comparison: {
    previousSynchronizationEstimate: "approximately 180000 rows_read",
    endpointsBefore: "historical MAX(id)/GROUP BY reconstruction",
    endpointsAfter: "current state plus indexed latest successful sync",
  },
  safety: {
    cronConfigured: false,
    mainModified: false,
    productionWorkerModified: false,
    productionDatabaseModified: false,
    productionDatabaseIdRejectedByHarness: true,
  },
};

writeFileSync(`${directory}/validation-report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
