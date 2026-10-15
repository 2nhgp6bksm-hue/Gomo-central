import { createCipheriv, createDecipheriv, publicEncrypt, privateDecrypt, randomBytes, constants, createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function validateAlliance(data) {
  const members = Array.isArray(data?.members) ? data.members : [];
  const uids = members.map(m => String(m?.uid ?? ''));
  const unique = new Set(uids);
  const presentInteger = v => v !== null && v !== undefined && v !== '' &&
    Number.isSafeInteger(Number(v));
  const missing = members.some(m => !m?.uid || !String(m?.name ?? '').trim() ||
    !presentInteger(m?.hq_level) || !presentInteger(m?.rank) ||
    !presentInteger(m?.power) || !presentInteger(m?.army_kill));
  const total = members.reduce((sum, m) => sum + (Number(m?.power) || 0), 0);
  const reported = Number(data?.total_power);
  const valid = members.length === 93 && unique.size === 93 && !missing &&
    Number(data?.member_count) === 93 && Number.isSafeInteger(total) && total === reported;
  return { valid, received: members.length, uniqueUids: unique.size,
    reportedCount: data?.member_count ?? null, reportedPower: data?.total_power ?? null,
    calculatedPower: total, missingEssential: missing };
}

// Same gzip + AES-256-GCM + RSA-OAEP-SHA256 envelope as the existing probe.
export function sealPayload(payload, publicKey) {
  const aesKey = randomBytes(32), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
  const plaintext = gzipSync(Buffer.from(JSON.stringify(payload)));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const wrappedKey = publicEncrypt({ key: publicKey, oaepHash: 'sha256',
    padding: constants.RSA_PKCS1_OAEP_PADDING }, aesKey);
  return { wrappedKey: wrappedKey.toString('base64'), iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}

// Used only in the local fictitious-data test. Production never loads a private key.
export function unsealPayload(envelope, privateKey) {
  const key = privateDecrypt({ key: privateKey, oaepHash: 'sha256',
    padding: constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(envelope.wrappedKey, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return JSON.parse(gunzipSync(Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()
  ])).toString('utf8'));
}

export function writeEncryptedCapture({payload, publicKey, directory, runId, attempt = 1, onSealed}) {
  const report = validateAlliance(payload.raw);
  const localDate = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Brussels', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(payload.receivedAt));
  const safeRun = String(runId);
  if (!/^\d+$/.test(safeRun) || !Number.isSafeInteger(Number(attempt))) throw new Error('Invalid run identity');
  const envelope = sealPayload(payload, publicKey);
  const bytes = Buffer.from(JSON.stringify(envelope) + '\n');
  const envelopeBase64 = Buffer.from(JSON.stringify(envelope)).toString('base64');
  // Logs retain the encrypted recovery copy even if disk or remote storage fails.
  if (onSealed) onSealed(envelopeBase64);
  mkdirSync(directory, {recursive:true, mode:0o700});
  const name = `${localDate}-run-${safeRun}-attempt-${attempt}.enc.json`;
  const file = join(directory, name);
  writeFileSync(file, bytes, {flag:'wx', mode:0o600});
  const digest = createHash('sha256').update(bytes).digest('hex');
  const manifest = {date: localDate, runId: safeRun, attempt: Number(attempt),
    sentAt: payload.sentAt, receivedAt: payload.receivedAt,
    validation: report, sha256: digest, fileName: name};
  writeFileSync(file + '.manifest.json', JSON.stringify(manifest) + '\n', {flag:'wx', mode:0o600});
  return {file, manifest, envelopeBase64};
}
