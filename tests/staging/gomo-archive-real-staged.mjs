// STAGED ONLY — not connected to any active GitHub Actions workflow.
// A human must explicitly authorize each future paid collection.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkArchive } from '../archive-health.mjs';
import { archiveCapture } from '../archive-private.mjs';
import { writeEncryptedCapture, validateAlliance } from '../private-capture.mjs';

const REPO = '2nhgp6bksm-hue/gomo-alliance-archives';
const ALLIANCE_ID = '26227dc9fb2945edaee8c7675c8fed5d';
const BASE = 'https://api.lastwar.tools';
const token = process.env.GOMO_ARCHIVE_TOKEN || '';
const apiKey = process.env.LASTWAR_TOOLS_API_KEY || '';
const runId = process.env.GITHUB_RUN_ID || '';
const attempt = Number(process.env.GITHUB_RUN_ATTEMPT || '1');
const localDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
const headers = {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'};

if (process.env.GOMO_CAPTURE_APPROVED_DATE !== localDate) {
  throw new Error('Explicit per-date authorization missing; no paid request');
}
if (!token || !apiKey || !/^\d+$/.test(runId) || !Number.isSafeInteger(attempt)) {
  throw new Error('Required credentials/run identity missing; no paid request');
}
if (/[\r\n]/.test(apiKey)) throw new Error('Invalid supplier credential; no paid request');

// Check whether an archived valid snapshot already exists for this Brussels date.
const [y, m, d] = localDate.split('-');
const listUrl = `https://api.github.com/repos/${REPO}/contents/snapshots/${y}/${m}/${d}`;
const listed = await fetch(listUrl, {headers});
if (listed.status === 200) {
  const files = await listed.json();
  if (!Array.isArray(files)) throw new Error('Unexpected archive listing; no paid request');
  if (files.some(f => /\.enc\.json$/.test(f.name || ''))) {
    throw new Error('Snapshot already archived for today; no paid request');
  }
} else if (listed.status !== 404) {
  throw new Error(`Cannot verify existing snapshots: HTTP ${listed.status}; no paid request`);
}

// Check real private write and read before the supplier request.
const health = await checkArchive({repo: REPO, token, runId, attempt});
console.log('ARCHIVE_PREFLIGHT=' + JSON.stringify(health));

const supplierHeaders = {Accept: 'application/json', 'X-API-Key': apiKey};
const validation = await fetch(new URL('/auth/validate', BASE), {headers:supplierHeaders});
if (!validation.ok) throw new Error(`Supplier key validation failed: HTTP ${validation.status}; no paid request`);
const freeStatus = await validation.json();
console.log('SUPPLIER_AUTH_VALID=true');
// Cost historically observed as 2 tokens; current guaranteed tariff and balance may be unavailable.
// Explicit authorization for ONE uncertain-cost call is provided by the owner per date.
const before = JSON.stringify(freeStatus);
const matches = [...before.matchAll(/"(?:token_balance|tokens_remaining|remaining_tokens)"\s*:\s*(\d+)/gi)];
if (matches.length && Number(matches[0][1]) < 10) {
  throw new Error('Insufficient verified supplier balance; no paid request');
}
const sentAt = new Date().toISOString();
const url = new URL(`/alliance/${ALLIANCE_ID}/members`, BASE);
url.searchParams.set('sort_by', 'power');
url.searchParams.set('descending', 'true');
console.log('ALLIANCE_MEMBERS_REQUESTS=1');
const response = await fetch(url, {headers:supplierHeaders});
const receivedAt = new Date().toISOString();
if (!response.ok) throw new Error(`Alliance Members HTTP ${response.status}; no automatic retry`);
const raw = await response.json();
const report = validateAlliance(raw);
console.log('AGGREGATES=' + JSON.stringify(report));
const payload = {sentAt, receivedAt, raw};
const publicKey = readFileSync(new URL('./gomo-archive-public.pem', import.meta.url), 'utf8');
const {file, manifest} = writeEncryptedCapture({
  payload, publicKey, directory: join(process.env.RUNNER_TEMP || '/tmp','gomo-real-staged'),
  runId, attempt,
  onSealed: encrypted => console.log('ENCRYPTED_RECOVERY_BASE64=' + encrypted)
});
if (!manifest.validation.valid) {
  throw new Error('Supplier payload invalid; encrypted recovery copy logged; no archive as valid snapshot');
}
const result = await archiveCapture({file, repo:REPO, token});
console.log('PRIVATE_ARCHIVE_VERIFIED=' + JSON.stringify(result));
