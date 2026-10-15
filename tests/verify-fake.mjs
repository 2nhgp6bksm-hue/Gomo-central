import assert from 'node:assert/strict';
import { generateKeyPairSync, createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeEncryptedCapture, unsealPayload } from './private-capture.mjs';
import { archiveCapture } from './archive-private.mjs';
import { checkArchive } from './archive-health.mjs';

const {publicKey, privateKey} = generateKeyPairSync('rsa', {modulusLength:3072,
  publicKeyEncoding:{type:'spki',format:'pem'}, privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const fakeMembers = Array.from({length:93}, (_,i) => ({
  uid:String(8000000+i), name:`Fixture Player ${i+1}`, rank:i===0?5:3,
  hq_level:30, power:1000000+i*100, army_kill:i,
}));
const raw = {member_count:93, total_power:fakeMembers.reduce((s,m)=>s+m.power,0), members:fakeMembers};
const payload = {sentAt:'2026-10-13T05:59:00Z', receivedAt:'2026-10-13T05:59:01Z',
  before:{},after:{},actualCost:null,raw};
const tmp = mkdtempSync(join(tmpdir(),'gomo-archive-fake-'));
const saved = new Map();
let privateRepo = true;
let failNextWrite = false;
let failNextRead = false;
let transientRead404s = 0;
let persistentRead404 = false;
let putCount = 0;
const blobSha = b => createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
const fakeFetch = async (url, options) => {
  assert.equal(options.headers.Authorization, 'Bearer fake-local-token');
  if (url === 'https://fake.invalid/repos/owner/private-archive') {
    return Response.json({private:privateRepo});
  }
  const prefix = '/repos/owner/private-archive/contents/';
  const pathIndex = url.indexOf(prefix);
  if (pathIndex < 0) return new Response(null,{status:404});
  const path = url.slice(pathIndex+prefix.length).split('?')[0];
  if (!options.method || options.method === 'GET') {
    if (!saved.has(path)) return new Response(null,{status:404});
    if (failNextRead) { failNextRead=false; return new Response(null,{status:503}); }
    if (url.includes('?ref=') && (persistentRead404 || transientRead404s-- > 0))
      return new Response(null,{status:404});
    return Response.json({path,sha:blobSha(saved.get(path)),content:saved.get(path).toString('base64'),encoding:'base64'});
  }
  if (options.method === 'PUT') {
    if (failNextWrite) { failNextWrite=false; return new Response(null,{status:503}); }
    if (saved.has(path)) return new Response(null,{status:409});
    putCount++;
    const bytes=Buffer.from(JSON.parse(options.body).content,'base64');
    saved.set(path,bytes);
    return Response.json({content:{path,sha:blobSha(bytes)},commit:{sha:'a'.repeat(40)}}, {status:201});
  }
  return new Response(null,{status:405});
};
try {
  const base = 'https://fake.invalid';
  const health = await checkArchive({repo:'owner/private-archive',token:'fake-local-token',
    runId:123456,apiBase:base,fetchImpl:fakeFetch});
  assert.equal(health.readback,true);
  const capture = writeEncryptedCapture({payload,publicKey,directory:tmp,runId:123456});
  assert.equal(capture.manifest.validation.received,93);
  assert.equal(capture.manifest.validation.uniqueUids,93);
  assert.equal(capture.manifest.validation.calculatedPower,raw.total_power);
  assert.deepEqual(unsealPayload(JSON.parse(readFileSync(capture.file,'utf8')),privateKey),payload);
  const savedResult = await archiveCapture({file:capture.file,repo:'owner/private-archive',
    token:'fake-local-token',apiBase:base,fetchImpl:fakeFetch});
  assert.equal(savedResult.power,raw.total_power);
  assert.equal(saved.size,3);
  const beforeTransientPutCount=putCount;
  const transient=writeEncryptedCapture({payload,publicKey,directory:tmp,runId:123461});
  transientRead404s=2;
  const transientResult=await archiveCapture({file:transient.file,repo:'owner/private-archive',
    token:'fake-local-token',apiBase:base,fetchImpl:fakeFetch});
  assert.equal(transientResult.count,93);
  assert.equal(putCount-beforeTransientPutCount,2);
  assert.equal(saved.size,5);
  const downloaded = JSON.parse(saved.get(savedResult.path).toString('utf8'));
  assert.deepEqual(unsealPayload(downloaded,privateKey),payload);
  const unchanged = Buffer.from(saved.get(savedResult.path));
  await assert.rejects(() => archiveCapture({file:capture.file,repo:'owner/private-archive',
    token:'fake-local-token',apiBase:base,fetchImpl:fakeFetch}),/already exists/);
  assert.ok(saved.get(savedResult.path).equals(unchanged));
  privateRepo=false;
  await assert.rejects(() => checkArchive({repo:'owner/private-archive',token:'fake-local-token',
    runId:123457,apiBase:base,fetchImpl:fakeFetch}),/unavailable/);
  await assert.rejects(() => archiveCapture({file:capture.file,repo:'owner/private-archive',
    token:'fake-local-token',apiBase:base,fetchImpl:fakeFetch}),/not an accessible private repository/);
  const tampered={...downloaded,tag:Buffer.alloc(16).toString('base64')};
  assert.throws(()=>unsealPayload(tampered,privateKey));
  privateRepo=true;
  const invalid={...payload,raw:{...raw,members:[...fakeMembers.slice(0,92),fakeMembers[0]]}};
  let fallback=null;
  const quarantined=writeEncryptedCapture({payload:invalid,publicKey,directory:tmp,runId:123458,
    onSealed:line=>fallback=line});
  assert.equal(quarantined.manifest.validation.valid,false);
  await assert.rejects(()=>archiveCapture({file:quarantined.file,repo:'owner/private-archive',
    token:'fake-local-token',apiBase:base,fetchImpl:fakeFetch}),/safely quarantined/);
  assert.ok([...saved.keys()].some(x=>x.startsWith('quarantine/2026/10/13/')));
  assert.deepEqual(unsealPayload(JSON.parse(Buffer.from(fallback,'base64').toString('utf8')),privateKey),invalid);
  let writeFailureFallback=null;
  const writeFailure=writeEncryptedCapture({payload,publicKey,directory:tmp,runId:123459,
    onSealed:line=>writeFailureFallback=line});
  failNextWrite=true;
  await assert.rejects(()=>archiveCapture({file:writeFailure.file,repo:'owner/private-archive',
    token:'fake-local-token',apiBase:base,fetchImpl:fakeFetch}),/Archive create failed: HTTP 503/);
  assert.deepEqual(unsealPayload(JSON.parse(Buffer.from(writeFailureFallback,'base64').toString('utf8')),privateKey),payload);
  let readFailureFallback=null;
  const readFailure=writeEncryptedCapture({payload,publicKey,directory:tmp,runId:123460,
    onSealed:line=>readFailureFallback=line});
  failNextRead=true;
  await assert.rejects(()=>archiveCapture({file:readFailure.file,repo:'owner/private-archive',
    token:'fake-local-token',apiBase:base,fetchImpl:fakeFetch}),/Archive readback failed after 1 attempt\(s\): HTTP 503/);
  assert.deepEqual(unsealPayload(JSON.parse(Buffer.from(readFailureFallback,'base64').toString('utf8')),privateKey),payload);
  const persistent=writeEncryptedCapture({payload,publicKey,directory:tmp,runId:123462});
  const beforePersistentPutCount=putCount;
  persistentRead404=true;
  await assert.rejects(()=>archiveCapture({file:persistent.file,repo:'owner/private-archive',
    token:'fake-local-token',apiBase:base,fetchImpl:fakeFetch}),/after 5 attempt\(s\): HTTP 404/);
  persistentRead404=false;
  assert.equal(putCount-beforePersistentPutCount,1);
  assert.ok(saved.has(`snapshots/2026/10/13/${persistent.manifest.fileName}`));
  console.log(JSON.stringify({fakeMembers:93,preflightBeforePaidCall:true,privateArchiveCreated:true,
    readBackIdentical:true,privateKeyDecryptionIdentical:true,noOverwrite:true,
    publicDestinationRejected:true,tamperRejected:true,invalidCaptureQuarantined:true,
    archiveWriteFailureRecoverable:true,archiveReadFailureRecoverable:true,
    transient404Recovered:true,persistent404NoRewrite:true,
    encryptedLogFallbackDecryptable:true,paidSupplierCalls:0}));
} finally {
  rmSync(tmp,{recursive:true,force:true});
}
