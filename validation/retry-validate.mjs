import { readFileSync, writeFileSync } from "node:fs";

const directory = process.argv[2] || "validation-results-retry";
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

function measurement(name) {
  const values = headers(`${name}.headers`);
  const rowsRead = Number(values.get("x-validation-d1-rows-read"));
  const queryCount = Number(values.get("x-validation-d1-query-count"));
  const tables = String(values.get("x-validation-d1-tables") || "").split(",").filter(Boolean);
  assert(Number.isFinite(rowsRead), `${name}: missing rows_read`);
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
const synchronization = measurement("sync");
const membersRead = measurement("members");
const powerRead = measurement("power");

assert(sync.ok === true, "Refresh failed");
assert(members.ok && members.memberCount === 94 && members.members?.length === 94, "Members did not return 94 members");
assert(power.ok && power.memberCount === 94 && power.members?.length === 94, "Power did not return 94 members");
assert(members.members.every((member) => member.active && member.membershipStatus !== "departed"), "Inactive/departed member returned");
assert(members.members.every((member) => member.hq != null && member.power != null && member.rank && member.observedAt), "Missing current member field");
assert(members.members.every((member) => member.fieldSources && Object.keys(member.fieldSources).length > 0), "Missing useful source");
assert(members.syncId && members.generatedAt, "Missing last successful synchronization");

const membersById = new Map(members.members.map((member) => [member.gomoId, member]));
for (const member of power.members) {
  const reference = membersById.get(member.gomoId);
  assert(reference, `Power member ${member.gomoId} missing from Members`);
  for (const field of ["name", "rank", "hq", "power", "heroPower", "active", "membershipStatus"]) {
    assert(member[field] === reference[field], `Power mismatch for ${member.gomoId}.${field}`);
  }
}

for (const [name, value] of [["members", membersRead], ["power", powerRead]]) {
  assert(value.cache === "MISS", `${name}: expected a cache MISS`);
  assert(value.historyRead === false, `${name}: historical table read detected`);
  assert(value.tables.includes("core_current_members"), `${name}: current table not read`);
}
assert(!powerRead.tables.includes("core_member_aliases"), "Power still reads aliases");

const report = {
  verdict: "VALIDÉ",
  worker: process.env.VALIDATION_WORKER_NAME,
  database: process.env.VALIDATION_DATABASE_NAME,
  testedCommit: "28d4ef7ee214ffd806d723b5f5369d9147168b48",
  members: members.memberCount,
  rowsRead: { synchronization: synchronization.rowsRead, members: membersRead.rowsRead, power: powerRead.rowsRead },
  statements: { synchronization, members: membersRead, power: powerRead },
  history: { canonicalSnapshotsBeforeRetry: 189, sourceObservationsBeforeRetry: 516, recountedDuringRetry: false },
  safety: {
    migrationReplayed: false,
    backfillReplayed: false,
    historyCheckReplayed: false,
    cronConfigured: false,
    mainModified: false,
    productionModified: false,
  },
};

writeFileSync(`${directory}/validation-report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
