import { createCipheriv, publicEncrypt, randomBytes, constants } from 'node:crypto';
import { gzipSync } from 'node:zlib';

// One-shot private capture. The public TEST job logs only aggregate counts and
// encrypted payload; the matching private key never leaves the owner's workspace.
const API_BASE = 'https://api.lastwar.tools';
const ALLIANCE_ID = '26227dc9fb2945edaee8c7675c8fed5d';
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAtJD88cLC1XkO8hAWseqB
7xDygLtSgxaBOzrVDfgZ54p1bFA/JTUYkRHLsJF1WVt46dDfDuVRU5Lpzbp5Y3Y0
ps3HhuoazGw5/wwxkZh3l5Y4baV760uxKmbXvHdYd/DgML5OMMxEk1FR49iWcyNt
OsEVpmB3ojguM/k4Y/7QNJtcx9wbPbu3D3H3bLu6vV718B0NARN4RIMi9a3RxDwd
Ex/MQ5SSeKJUxPvXLLGo5iHaSAJ/Nx0W9thhAeBZI2HkbEWJUt9IHaxHdJo2zNmm
urWFoAtw4WFccBCM7EHQ6N7tZQ7gvsvwAppRnxOlkbLWAMsK0gMxLiPd6OoIIaub
I7b9Pf0LK471KmtIWd66D4Mt2bXDaoZu0aeZTt9pnTz+k/7+C+04NL1h4BOmIA1k
wSgiExt6Y5BG6yqBgvNmLSTFZwnkEwCd5JJF37HRZymyv6qAX/wKdNSpdI8AoqDt
oGalYhsRXxvxy3qsq3pKrU0tbhvLCXU3nSmU/nAdbccXAgMBAAE=
-----END PUBLIC KEY-----`;
const MAX_GO_MO_COST = 10;
const key = (process.env.LASTWAR_TOOLS_API_KEY || '').trim();
if (!key || /[\r\n]/.test(key)) throw new Error('API key unavailable; no paid request sent');
const headers = { Accept: 'application/json', 'X-API-Key': key };

function balances(value, prefix = '', out = {}) {
  if (!value || typeof value !== 'object') return out;
  for (const [name, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${name}` : name;
    if (typeof child === 'number' && Number.isFinite(child) &&
        /balance|remaining|available/i.test(name) && /token|credit/i.test(path)) out[path] = child;
    if (child && typeof child === 'object') balances(child, path, out);
  }
  return out;
}

async function validate() {
  const response = await fetch(new URL('/auth/validate', API_BASE), { headers });
  if (!response.ok) throw new Error(`Free key validation failed: HTTP ${response.status}; no paid request sent`);
  return balances(await response.json());
}

const before = await validate();
console.log('BALANCE_BEFORE=' + JSON.stringify(before));
const balanceEntry = Object.entries(before).find(([p]) => /token|credit/i.test(p));
if (balanceEntry && balanceEntry[1] < MAX_GO_MO_COST) {
  throw new Error(`Available balance below ${MAX_GO_MO_COST}; no paid request sent`);
}

// Public OpenAPI metadata did not state a price. The owner explicitly
// authorized ONE request with uncertain unit cost, capped to this mission.
const sentAt = new Date().toISOString();
const url = new URL(`/alliance/${ALLIANCE_ID}/members`, API_BASE);
url.searchParams.set('sort_by', 'power');
url.searchParams.set('descending', 'true');
console.log('ALLIANCE_MEMBERS_REQUESTS=1');
const response = await fetch(url, { headers });
const receivedAt = new Date().toISOString();
if (!response.ok) {
  console.error(`Alliance Members returned HTTP ${response.status}; never retry automatically`);
  process.exit(1);
}
const data = await response.json();
const after = await validate().catch(() => null);
console.log('BALANCE_AFTER=' + JSON.stringify(after));
let actualCost = null;
if (after && balanceEntry && typeof after[balanceEntry[0]] === 'number') {
  actualCost = balanceEntry[1] - after[balanceEntry[0]];
}
console.log('ACTUAL_BALANCE_DELTA=' + JSON.stringify(actualCost));
const members = Array.isArray(data?.members) ? data.members : [];
console.log('AGGREGATES=' + JSON.stringify({ received: members.length,
  uniqueUids: new Set(members.map(m => String(m.uid ?? ''))).size,
  reportedCount: data?.member_count ?? null, reportedPower: data?.total_power ?? null,
  calculatedPower: members.reduce((n,m) => n + (Number(m.power) || 0), 0),
  sentAt, receivedAt }));

const payload = { sentAt, receivedAt, before, after, actualCost, raw: data };
const aesKey = randomBytes(32), iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
const plaintext = gzipSync(Buffer.from(JSON.stringify(payload)));
const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const wrappedKey = publicEncrypt({ key: PUBLIC_KEY, oaepHash: 'sha256',
  padding: constants.RSA_PKCS1_OAEP_PADDING }, aesKey);
console.log('PRIVATE_PAYLOAD_BASE64=' + Buffer.from(JSON.stringify({
  wrappedKey: wrappedKey.toString('base64'), iv: iv.toString('base64'),
  tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64')
})).toString('base64'));
