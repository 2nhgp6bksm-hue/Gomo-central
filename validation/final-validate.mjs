import { readFileSync, writeFileSync } from "node:fs";

const directory = process.argv[2] || "validation-results-final";
const readJson = (name) => JSON.parse(readFileSync(`${directory}/${name}`, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function headers(name) {
  const values = new Map();
  for (const line of readFileSync(`${directory}/${name}`, "utf8").split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) values.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }
  return values;
}

const sync = readJson("sync.json");
const members = readJson("members.json");
const power = readJson("power.json");
const h = headers("sync.headers");
const rowsRead = Number(h.get("x-validation-d1-rows-read"));
const rowsWritten = Number(h.get("x-validation-d1-rows-written"));
const operations = Number(h.get("x-validation-d1-query-count"));
const d1DurationMs = Number(h.get("x-validation-d1-duration-ms"));
const tables = String(h.get("x-validation-d1-tables") || "").split(",").filter(Boolean);
const curlMeta = readFileSync(`${directory}/sync.curl-meta`, "utf8").trim().split(/\s+/);
const httpDurationMs = Number(curlMeta[1]) * 1000;
const deployment = readFileSync(`${directory}/deploy.txt`, "utf8").replace(/\x1b\[[0-9;]*m/g, "");
const workerVersion = deployment.match(/Current Version ID:\s*([0-9a-f-]+)/i)?.[1] || null;
const changes = sync.storage?.changesByStatement || {};

assert(sync.ok === true, "Refresh failed");
assert(sync.coreVersion === "0.8.0-read-optimization-test", "Unexpected Core version");
assert(sync.members === 94, "Refresh did not reconcile 94 members");
assert(sync.changed === false, "Refresh was not unchanged");
assert(sync.storage?.meaningfulRows === 0, "Refresh wrote business rows");
assert(sync.storage?.statements === 1, "Stable refresh did not reduce its batch to one statement");
assert(sync.storage?.statementsSkippedAsUnchanged === 12, "Stable refresh did not skip twelve statements");
assert(changes.canonical_snapshots_inserted === 0, "A canonical snapshot was inserted");
assert(changes.source_observations_inserted === 0, "A source observation was inserted");
assert(changes.current_members_updated === 0, "Current members were unexpectedly updated");
assert(changes.current_source_state_updated === 0, "Current source state was unexpectedly updated");
assert(changes.sync_completed === 1, "The technical synchronization closure is missing");
assert(sync.storage?.operationalBookkeepingRows === 3, "Unexpected technical bookkeeping count");
assert(Number.isFinite(rowsRead) && rowsRead >= 0, "Missing rows_read");
assert(Number.isFinite(rowsWritten) && rowsWritten >= 0, "Missing rows_written");
assert(Number.isFinite(operations) && operations > 0, "Missing D1 operation count");
assert(Number.isFinite(d1DurationMs) && d1DurationMs >= 0, "Missing D1 duration");
assert(Number.isFinite(httpDurationMs) && httpDurationMs >= 0, "Missing HTTP duration");
assert(workerVersion, "Missing deployed Worker version ID");
assert(h.get("x-validation-app-commit") === "896a677e04701be796b99f4c471e1d074d13cf28", "Wrong application commit");
assert(!tables.includes("core_canonical_snapshots"), "Stable refresh prepared canonical history SQL");
assert(!tables.includes("core_source_observations"), "Stable refresh prepared source history SQL");

assert(members.ok && members.memberCount === 94 && members.members?.length === 94, "Members regression");
assert(power.ok && power.memberCount === 94 && power.members?.length === 94, "Power regression");
const membersById = new Map(members.members.map((member) => [member.gomoId, member]));
for (const member of power.members) {
  const reference = membersById.get(member.gomoId);
  assert(reference, `Power member ${member.gomoId} missing from Members`);
  for (const field of ["name", "rank", "hq", "power", "heroPower", "active", "membershipStatus"]) {
    assert(member[field] === reference[field], `Power mismatch for ${member.gomoId}.${field}`);
  }
}

const verdict = rowsRead <= 1500 ? "VALIDÉ" : "À CORRIGER";
const report = {
  verdict,
  worker: process.env.VALIDATION_WORKER_NAME,
  database: process.env.VALIDATION_DATABASE_NAME,
  workerVersion,
  commit: "896a677e04701be796b99f4c471e1d074d13cf28",
  refresh: {
    rowsRead,
    rowsWritten,
    operations,
    d1DurationMs,
    httpDurationMs,
    changed: sync.changed,
    members: sync.members,
    batchStatements: sync.storage.statements,
    statementsSkippedAsUnchanged: sync.storage.statementsSkippedAsUnchanged,
    meaningfulRows: sync.storage.meaningfulRows,
    operationalBookkeepingRows: sync.storage.operationalBookkeepingRows,
    tables,
  },
  history: {
    baselineCanonicalSnapshots: 189,
    baselineSourceObservations: 516,
    recounted: false,
    newCanonicalSnapshots: changes.canonical_snapshots_inserted,
    newSourceObservations: changes.source_observations_inserted,
    intact: true,
  },
  endpoints: { members: members.memberCount, power: power.memberCount, coherent: true },
  safety: {
    migrationReplayed: false,
    backfillReplayed: false,
    cronConfigured: false,
    mainModified: false,
    productionModified: false,
  },
};

writeFileSync(`${directory}/validation-report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
