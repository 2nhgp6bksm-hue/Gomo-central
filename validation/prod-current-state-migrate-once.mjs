import fs from 'node:fs/promises';

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const dbId = process.env.DB_ID;
const worker = process.env.WORKER || 'gomo-core-test';
const expectedActiveVersion = process.env.EXPECTED_ACTIVE_VERSION;
const expectedCron = process.env.EXPECTED_CRON || '15 * * * *';
const previewUrl = process.env.PREVIEW_URL;

if (!token || !accountId || !dbId || !expectedActiveVersion || !previewUrl) {
  throw new Error('Missing required environment');
}

const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
const auth = { Authorization: `Bearer ${token}` };

async function cfJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...auth, ...(options.headers || {}) },
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`Non-JSON Cloudflare response ${response.status}: ${text.slice(0, 500)}`); }
  if (!response.ok || json.success === false) {
    throw new Error(`Cloudflare ${response.status}: ${JSON.stringify(json.errors || json).slice(0, 1000)}`);
  }
  return json;
}

async function query(sql) {
  const json = await cfJson(`${apiBase}/d1/database/${dbId}/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sql, params: [] }),
  });
  const parts = Array.isArray(json.result) ? json.result : [json.result];
  for (const part of parts) {
    if (part?.success === false) throw new Error(`D1 statement failed: ${JSON.stringify(part)}`);
  }
  return json;
}

function rows(json) {
  const parts = Array.isArray(json.result) ? json.result : [json.result];
  return parts.flatMap((part) => part?.results || []);
}

function meta(json) {
  const parts = Array.isArray(json.result) ? json.result : [json.result];
  return parts.map((part) => part?.meta || {});
}

function stripStatements(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)
    .filter((statement) => !/^PRAGMA\s+foreign_keys\s*=\s*ON$/i.test(statement));
}

function assertSqlScope(migrationStatements, backfillStatements) {
  if (migrationStatements.length !== 3) throw new Error(`Expected 3 migration statements, got ${migrationStatements.length}`);
  const expectedCreates = [
    /^CREATE TABLE IF NOT EXISTS core_current_members\b/i,
    /^CREATE TABLE IF NOT EXISTS core_current_source_state\b/i,
    /^CREATE INDEX IF NOT EXISTS idx_core_sync_runs_success_completed\b/i,
  ];
  migrationStatements.forEach((statement, index) => {
    if (!expectedCreates[index].test(statement)) throw new Error(`Unexpected migration statement ${index + 1}`);
    if (/\b(DROP|DELETE|ALTER|TRUNCATE|VACUUM|ATTACH|DETACH|REPLACE)\b/i.test(statement)) {
      throw new Error('Destructive token in migration');
    }
  });

  if (backfillStatements.length !== 2) throw new Error(`Expected 2 backfill statements, got ${backfillStatements.length}`);
  const targets = backfillStatements.map((statement) => statement.match(/INSERT\s+INTO\s+(core_[a-z0-9_]+)/i)?.[1] || null);
  if (JSON.stringify(targets) !== JSON.stringify(['core_current_members', 'core_current_source_state'])) {
    throw new Error(`Unexpected backfill targets: ${JSON.stringify(targets)}`);
  }
  for (const statement of backfillStatements) {
    if (/\b(DROP|DELETE|ALTER|TRUNCATE|VACUUM|ATTACH|DETACH|REPLACE)\b/i.test(statement)) {
      throw new Error('Destructive token in backfill');
    }
    const insertTargets = [...statement.matchAll(/INSERT\s+INTO\s+([a-z0-9_]+)/gi)].map((m) => m[1]);
    if (insertTargets.some((name) => !['core_current_members', 'core_current_source_state'].includes(name))) {
      throw new Error(`Backfill writes outside current-state tables: ${insertTargets.join(',')}`);
    }
  }
}

async function activeState() {
  const deployments = await cfJson(`${apiBase}/workers/scripts/${worker}/deployments`);
  const schedules = await cfJson(`${apiBase}/workers/scripts/${worker}/schedules`);
  const depList = deployments.result?.deployments || deployments.result || [];
  const activeVersion = depList?.[0]?.versions?.[0]?.version_id || null;
  const scheduleList = Array.isArray(schedules.result) ? schedules.result : (schedules.result?.schedules || []);
  return { activeVersion, scheduleList };
}

function assertActiveState(state, label) {
  if (state.activeVersion !== expectedActiveVersion) throw new Error(`${label}: active version changed to ${state.activeVersion}`);
  if (state.scheduleList.length !== 1 || state.scheduleList[0].cron !== expectedCron) {
    throw new Error(`${label}: Cron changed: ${JSON.stringify(state.scheduleList)}`);
  }
}

async function getPreview(path) {
  const response = await fetch(`${previewUrl}${path}`, { headers: { 'cache-control': 'no-cache' } });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: response.status, json, body: text.slice(0, 1000), cache: response.headers.get('x-gomo-core-cache'), version: response.headers.get('x-gomo-core-version') };
}

const [migrationText, backfillText] = await Promise.all([
  fs.readFile('migrations/0003_gomo_core_current_state.sql', 'utf8'),
  fs.readFile('validation/backfill-current-state.sql', 'utf8'),
]);
const migrationStatements = stripStatements(migrationText);
const backfillStatements = stripStatements(backfillText);
assertSqlScope(migrationStatements, backfillStatements);

const beforeActive = await activeState();
assertActiveState(beforeActive, 'before');

const historyBeforeJson = await query(`SELECT
  (SELECT COUNT(*) FROM core_canonical_snapshots) AS canonical_snapshots,
  (SELECT COUNT(*) FROM core_source_observations) AS source_observations,
  (SELECT COUNT(*) FROM core_members) AS members,
  (SELECT COUNT(*) FROM core_sync_runs) AS sync_runs`);
const historyBefore = rows(historyBeforeJson)[0];

const currentBeforeJson = await query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('core_current_members','core_current_source_state') ORDER BY name");
const currentBefore = rows(currentBeforeJson).map((row) => row.name);
if (currentBefore.length !== 0) throw new Error(`Current-state tables unexpectedly existed before migration: ${currentBefore.join(',')}`);

const writeMeta = [];
for (const statement of migrationStatements) {
  const result = await query(statement);
  writeMeta.push(...meta(result));
}

const tablesAfterMigration = rows(await query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('core_current_members','core_current_source_state') ORDER BY name")).map((row) => row.name);
if (JSON.stringify(tablesAfterMigration) !== JSON.stringify(['core_current_members', 'core_current_source_state'])) {
  throw new Error(`Migration did not create both current-state tables: ${JSON.stringify(tablesAfterMigration)}`);
}

for (const statement of backfillStatements) {
  const result = await query(statement);
  writeMeta.push(...meta(result));
}

const counts = rows(await query(`SELECT
  (SELECT COUNT(*) FROM core_current_members) AS total_current,
  (SELECT COUNT(*) FROM core_current_members WHERE active=1) AS active_current,
  (SELECT COUNT(*) FROM core_current_members WHERE active=1 AND membership_status<>'departed') AS public_current,
  (SELECT COUNT(*) FROM core_current_source_state) AS current_source_rows`))[0];
if (Number(counts.public_current) !== 94) throw new Error(`Expected 94 public current members, got ${counts.public_current}`);
if (Number(counts.current_source_rows) <= 0) throw new Error('Current source state is empty');

const memberColumns = rows(await query('PRAGMA table_info(core_current_members)')).map((row) => row.name);
const sourceColumns = rows(await query('PRAGMA table_info(core_current_source_state)')).map((row) => row.name);
const requiredMemberColumns = ['gomo_id','name','rank','hq','max_hq','power','hero_power','kills','avatar_url','confidence','confidence_level','flags_json','field_sources_json','observed_at','active','membership_status','updated_sync_id','updated_at'];
const requiredSourceColumns = ['source','source_member_id','gomo_id','name','rank','hq','power','hero_power','kills','avatar_url','observed_at','updated_sync_id','updated_at'];
if (requiredMemberColumns.some((name) => !memberColumns.includes(name))) throw new Error('core_current_members schema mismatch');
if (requiredSourceColumns.some((name) => !sourceColumns.includes(name))) throw new Error('core_current_source_state schema mismatch');

const historyAfterJson = await query(`SELECT
  (SELECT COUNT(*) FROM core_canonical_snapshots) AS canonical_snapshots,
  (SELECT COUNT(*) FROM core_source_observations) AS source_observations,
  (SELECT COUNT(*) FROM core_members) AS members,
  (SELECT COUNT(*) FROM core_sync_runs) AS sync_runs`);
const historyAfter = rows(historyAfterJson)[0];
for (const key of ['canonical_snapshots','source_observations','members','sync_runs']) {
  if (Number(historyAfter[key]) !== Number(historyBefore[key])) throw new Error(`Historical count changed for ${key}: ${historyBefore[key]} -> ${historyAfter[key]}`);
}

const status = await getPreview('/api/core/status');
const members = await getPreview('/api/core/members');
const power = await getPreview('/api/core/power');
if (status.status !== 200 || status.json?.ok !== true) throw new Error(`Preview status failed: ${status.status} ${status.body}`);
if (members.status !== 200 || members.json?.memberCount !== 94 || members.json?.members?.length !== 94) throw new Error(`Preview members failed: ${members.status} ${members.body}`);
if (power.status !== 200 || power.json?.memberCount !== 94 || power.json?.members?.length !== 94) throw new Error(`Preview power failed: ${power.status} ${power.body}`);
if ([status.json?.coreVersion, members.json?.coreVersion, power.json?.coreVersion].some((v) => v !== '0.8.0-read-optimization-test')) {
  throw new Error('Preview Core version mismatch');
}

const afterActive = await activeState();
assertActiveState(afterActive, 'after');

const report = {
  databaseId: dbId,
  migration: '0003_gomo_core_current_state.sql',
  backfill: 'validation/backfill-current-state.sql',
  historicalCountsBefore: historyBefore,
  historicalCountsAfter: historyAfter,
  currentState: {
    total: Number(counts.total_current),
    active: Number(counts.active_current),
    public: Number(counts.public_current),
    sourceRows: Number(counts.current_source_rows),
  },
  preview: {
    status: status.status,
    members: members.json.memberCount,
    power: power.json.memberCount,
    coreVersion: members.json.coreVersion,
    statusCache: status.cache,
    membersCache: members.cache,
    powerCache: power.cache,
  },
  activeWorker: {
    worker,
    versionBefore: beforeActive.activeVersion,
    versionAfter: afterActive.activeVersion,
    cronBefore: beforeActive.scheduleList,
    cronAfter: afterActive.scheduleList,
  },
  writes: writeMeta.map((m) => ({ changes: Number(m.changes || 0), rowsWritten: Number(m.rows_written || 0), changedDb: Boolean(m.changed_db) })),
  productionWorkerDeploymentChanged: false,
  cronChanged: false,
};

await fs.mkdir('migration-results', { recursive: true });
await fs.writeFile('migration-results/report.json', JSON.stringify(report, null, 2) + '\n');
console.log('CORE_CURRENT_STATE_MIGRATION=' + JSON.stringify(report));
