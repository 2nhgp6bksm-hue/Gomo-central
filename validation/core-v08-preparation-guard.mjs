import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const errors = [];

if (config.name !== 'gomo-core-test') errors.push('Worker must remain gomo-core-test');
if (config.vars?.GOMO_CORE_MODE !== 'test') errors.push('GOMO_CORE_MODE must remain test');
if (config.d1_databases?.[0]?.database_name !== 'gomo-core-v08-read-test-db') errors.push('Only the isolated v0.8 test D1 is allowed');
if (config.d1_databases?.[0]?.database_id !== '45ca2537-70d2-409c-9db1-2fa1772c0a2d') errors.push('Unexpected D1 id');
if (config.triggers?.crons?.length) errors.push('Cron must remain disabled during preparation');
if (config.name === 'gomo-central') errors.push('Production Worker target is forbidden');
if (config.d1_databases?.some(db => db.database_name === 'gomo-core-db' || db.database_id === 'ac1b5094-c1f9-4706-b29b-8507e6f85a92')) errors.push('Production D1 target is forbidden');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Core v0.8 preparation guard: OK');
