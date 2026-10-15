import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runStagedCapture } from './gomo-archive-real-staged.mjs';
import { unsealPayload } from '../private-capture.mjs';

const repo='2nhgp6bksm-hue/gomo-alliance-archives',base=`https://api.github.com/repos/${repo}`;
const storage=new Map();
let putCount=0, supplierCalls=0, supplierFails=false, archiveWriteFails=false, archiveReadFails=false;
const sha=b=>createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
const archiveFetch=async (address,options={})=>{
  const url=String(address);
  if (url===base) return Response.json({private:true});
  const path=url.split('/contents/')[1]?.split('?')[0];
  if (!path) return new Response(null,{status:404});
  if (options.method==='PUT') {
    if (archiveWriteFails && path.includes('/snapshots/')) return new Response(null,{status:503});
    if (storage.has(path)) return new Response(null,{status:422});
    const bytes=Buffer.from(JSON.parse(options.body).content,'base64');
    storage.set(path,bytes);putCount++;
    return Response.json({content:{path,sha:sha(bytes)},commit:{sha:'a'.repeat(40)}},{status:201});
  }
  if (archiveReadFails && url.includes('?ref=') && path.includes('/snapshots/'))
    return new Response(null,{status:404});
  if (storage.has(path)) {
    const b=storage.get(path);
    return Response.json({path,name:path.split('/').at(-1),sha:sha(b),encoding:'base64',content:b.toString('base64')});
  }
  const children=[...storage.keys()].filter(p=>p.startsWith(path+'/') && !p.slice(path.length+1).includes('/'));
  if (children.length) return Response.json(children.map(p=>({name:p.split('/').at(-1),path:p})));
  return new Response(null,{status:404});
};
const members=Array.from({length:93},(_,i)=>({uid:`TEST-${String(i+1).padStart(3,'0')}`,
  name:`Fictif ${i+1}`,hq_level:30,rank:3,power:1_000_000+i,army_kill:i}));
const raw={member_count:93,total_power:members.reduce((n,m)=>n+m.power,0),members};
const supplierFetch=async address=>{
  if (String(address).includes('/auth/validate')) return Response.json({tokens_remaining:50});
  supplierCalls++;
  return supplierFails?new Response('failed',{status:500}):Response.json(raw);
};
const tmp=mkdtempSync(join(tmpdir(),'gomo-staged-integration-'));
const date='2026-10-15',clock=()=>new Date('2026-10-15T07:00:00Z');
const env=runId=>({GITHUB_RUN_ID:String(runId),GITHUB_RUN_ATTEMPT:'1',
  GOMO_CAPTURE_APPROVED_DATE:date,GOMO_DAILY_PRIOR_REQUESTS:'0',
  GOMO_ARCHIVE_TOKEN:'fake-private-token',LASTWAR_TOOLS_API_KEY:'fake-supplier-key',RUNNER_TEMP:tmp});
const run=(runId,options={})=>runStagedCapture({env:{...env(runId),...options.env},clock,
  fetchArchive:archiveFetch,fetchSupplier:supplierFetch,testMode:true,log:()=>{},
  onSealed:options.onSealed});
try {
  const first=await run(6001);
  assert.equal(first.report.uniqueUids,93);
  assert.equal(first.result.count,93);
  assert.equal(supplierCalls,1);
  const ciphertext=storage.get(first.result.path);
  const manifest=JSON.parse(storage.get(first.result.path+'.manifest.json'));
  assert.equal(createHash('sha256').update(ciphertext).digest('hex'),manifest.sha256);
  assert.ok(storage.has(`_tests/staging/_attempts/2026/10/15/run-6001-attempt-1.json`));
  const keyFile=process.env.GOMO_RESTORE_PRIVATE_KEY_FILE;
  if (keyFile) assert.deepEqual(unsealPayload(JSON.parse(ciphertext),readFileSync(keyFile,'utf8')).raw,raw);
  const writesBefore=putCount,callsBefore=supplierCalls;
  await assert.rejects(()=>run(6002),/Snapshot already archived/);
  assert.equal(supplierCalls,callsBefore);assert.equal(putCount,writesBefore);
  assert.ok(storage.get(first.result.path).equals(ciphertext));

  // Separate virtual day, failed calls count as reserved attempts.
  const nextClock=()=>new Date('2026-10-16T07:00:00Z');
  const failRun=(runId,extra={})=>runStagedCapture({env:{...env(runId),
    GOMO_CAPTURE_APPROVED_DATE:'2026-10-16',...extra},clock:nextClock,
    fetchArchive:archiveFetch,fetchSupplier:supplierFetch,testMode:true,log:()=>{}});
  supplierFails=true;
  await assert.rejects(()=>failRun(6003),/HTTP 500; attempt counted/);
  assert.equal(supplierCalls,2);
  await assert.rejects(()=>failRun(6004),/second-request approval/);
  assert.equal(supplierCalls,2);
  await assert.rejects(()=>failRun(6005,{GOMO_SECOND_REQUEST_APPROVED:'yes'}),/HTTP 500; attempt counted/);
  assert.equal(supplierCalls,3);
  await assert.rejects(()=>failRun(6006,{GOMO_SECOND_REQUEST_APPROVED:'yes'}),/Daily request limit/);
  assert.equal(supplierCalls,3);
  await assert.rejects(()=>failRun(6007,{GOMO_DAILY_PRIOR_REQUESTS:'2'}),/Daily request limit/);
  assert.equal(supplierCalls,3);
  supplierFails=false;

  // A write failure after the one simulated supplier call keeps the sealed copy.
  const thirdClock=()=>new Date('2026-10-17T07:00:00Z');
  let sealed=null;
  archiveWriteFails=true;
  await assert.rejects(()=>runStagedCapture({env:{...env(6008),
    GOMO_CAPTURE_APPROVED_DATE:'2026-10-17'},clock:thirdClock,
    fetchArchive:archiveFetch,fetchSupplier:supplierFetch,testMode:true,
    log:()=>{},onSealed:value=>{sealed=value}}),/Archive create failed: HTTP 503/);
  archiveWriteFails=false;
  assert.equal(supplierCalls,4);
  assert.ok(sealed);
  if (keyFile) assert.deepEqual(unsealPayload(JSON.parse(Buffer.from(sealed,'base64').toString('utf8')),
    readFileSync(keyFile,'utf8')).raw,raw);
  assert.ok(storage.has('_tests/staging/_attempts/2026/10/17/run-6008-attempt-1.json'));
  let sealedAfterReadFailure=null;
  archiveReadFails=true;
  await assert.rejects(()=>runStagedCapture({env:{...env(6009),
    GOMO_CAPTURE_APPROVED_DATE:'2026-10-18'},
    clock:()=>new Date('2026-10-18T07:00:00Z'),
    fetchArchive:archiveFetch,fetchSupplier:supplierFetch,testMode:true,
    log:()=>{},onSealed:value=>{sealedAfterReadFailure=value}}),/after 5 attempt\(s\): HTTP 404/);
  archiveReadFails=false;
  assert.equal(supplierCalls,5);
  assert.ok(sealedAfterReadFailure);
  assert.ok([...storage.keys()].some(x=>x.startsWith('_tests/staging/snapshots/2026/10/18/')));
  console.log(JSON.stringify({fictitiousMembers:93,encryptedArchive:true,readback:true,
    sha256:true,independentDecryption:Boolean(keyFile),duplicateBlocked:true,
    failedCallsCounted:true,maxTwoAttempts:true,noApiRetryAfterSaveFailure:true,
    sealedFailureRecovery:true,read404NoApiRetry:true,realSupplierCalls:0}));
} finally { rmSync(tmp,{recursive:true,force:true}); }
