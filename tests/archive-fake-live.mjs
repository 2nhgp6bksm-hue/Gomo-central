import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeEncryptedCapture, unsealPayload } from './private-capture.mjs';
import { archiveCapture } from './archive-private.mjs';
import { createHash } from 'node:crypto';

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
const repo = process.env.GOMO_PRIVATE_ARCHIVE_REPO;
const token = process.env.GOMO_ARCHIVE_TOKEN;
const runId = process.env.GITHUB_RUN_ID;
const attempt = Number(process.env.GITHUB_RUN_ATTEMPT || 1);
if (!token || !repo || !/^\d+$/.test(String(runId))) throw new Error('Test configuration missing');
const members = Array.from({length:93}, (_,i)=>({
  uid:`TEST-${String(i+1).padStart(3,'0')}`,
  name:`Fictif ${i+1}`,
  hq_level:20+(i%16), rank:1+(i%5),
  power:1_000_000+i, army_kill:i*17
}));
const totalPower=members.reduce((n,m)=>n+m.power,0);
const now=new Date().toISOString();
const payload={sentAt:now,receivedAt:now,raw:{member_count:93,total_power:totalPower,members}};
const directory=join(process.env.RUNNER_TEMP || '/tmp','gomo-archive-fake-test');
const {file,manifest}=writeEncryptedCapture({payload,publicKey:PUBLIC_KEY,directory,runId,attempt});
if (!manifest.validation.valid) throw new Error('Fictitious payload failed validation');
const result=await archiveCapture({file,repo,token});
if (result.count!==93 || result.uniqueUids!==93 || result.power!==totalPower || result.sha256!==manifest.sha256)
  throw new Error('Archive validation differs');
console.log('FAKE_ARCHIVE_VERIFIED='+JSON.stringify({path:result.path,count:result.count,uniqueUids:result.uniqueUids,sha256:result.sha256}));
