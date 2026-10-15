// STAGED ONLY. No active workflow invokes this file.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkArchive } from '../archive-health.mjs';
import { archiveCapture, readCreatedFile } from '../archive-private.mjs';
import { writeEncryptedCapture, validateAlliance } from '../private-capture.mjs';

const REPO='2nhgp6bksm-hue/gomo-alliance-archives';
const BASE='https://api.lastwar.tools';
const ALLIANCE_ID='26227dc9fb2945edaee8c7675c8fed5d';
const dateInBrussels = date => new Intl.DateTimeFormat('en-CA',{
  timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'
}).format(date);

async function list({path,headers,fetchImpl,apiBase}) {
  const response=await fetchImpl(`${apiBase}/repos/${REPO}/contents/${path}`,{headers});
  if (response.status===404) return [];
  if (!response.ok) throw new Error(`Cannot inspect ${path}: HTTP ${response.status}; no paid request`);
  const files=await response.json();
  if (!Array.isArray(files)) throw new Error(`Invalid archive listing ${path}; no paid request`);
  return files;
}

// Reserve before fetching. Failed or uncertain supplier calls still count.
async function reserve({path,headers,fetchImpl,apiBase,runId,attempt,now}) {
  const url=`${apiBase}/repos/${REPO}/contents/${path}`;
  const before=await fetchImpl(url,{headers});
  if (before.status!==404) throw new Error('Attempt reservation exists or cannot be inspected; no paid request');
  const bytes=Buffer.from(JSON.stringify({runId,attempt,reservedAt:now.toISOString(),
    status:'reserved-before-supplier-call'})+'\n');
  const put=await fetchImpl(url,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},
    body:JSON.stringify({message:`archive: reserve GoMo attempt ${runId}`,content:bytes.toString('base64')})});
  if (put.status!==201) throw new Error(`Attempt reservation failed: HTTP ${put.status}; no paid request`);
  const created=await put.json();
  if (created?.content?.path!==path || !created?.content?.sha || !created?.commit?.sha)
    throw new Error('Attempt reservation metadata differs; no paid request');
  await readCreatedFile({url,path,content:bytes,blobSha:created.content.sha,
    commitSha:created.commit.sha,headers,fetchImpl});
}

export async function runStagedCapture({env=process.env,clock=()=>new Date(),
  fetchSupplier=fetch,fetchArchive=fetch,archiveApiBase='https://api.github.com',
  testMode=false,log=console.log,onSealed=null}={}) {
  const now=clock(),date=dateInBrussels(now),runId=String(env.GITHUB_RUN_ID||'');
  const attempt=Number(env.GITHUB_RUN_ATTEMPT||'1');
  const token=env.GOMO_ARCHIVE_TOKEN||'',apiKey=env.LASTWAR_TOOLS_API_KEY||'';
  if (env.GOMO_CAPTURE_APPROVED_DATE!==date)
    throw new Error('Explicit per-date authorization missing; no paid request');
  if (!token || !apiKey || /[\r\n]/.test(apiKey) || !/^\d+$/.test(runId) ||
      !Number.isSafeInteger(attempt) || attempt<1)
    throw new Error('Missing credential or run identity; no paid request');
  if (!/^[012]$/.test(String(env.GOMO_DAILY_PRIOR_REQUESTS)))
    throw new Error('Verified count of other daily requests required, including failures; no paid request');
  const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'};
  const [y,m,d]=date.split('-'),prefix=testMode?'_tests/staging/':'';
  const snapshots=await list({path:`${prefix}snapshots/${y}/${m}/${d}`,
    headers,fetchImpl:fetchArchive,apiBase:archiveApiBase});
  if (snapshots.some(f=>/\.enc\.json$/.test(f.name||'')))
    throw new Error('Snapshot already archived for today; no paid request');
  const attempts=await list({path:`${prefix}_attempts/${y}/${m}/${d}`,
    headers,fetchImpl:fetchArchive,apiBase:archiveApiBase});
  const count=attempts.filter(f=>/^run-\d+-attempt-\d+\.json$/.test(f.name||'')).length+
    Number(env.GOMO_DAILY_PRIOR_REQUESTS);
  if (count>=2 || (count>0 && env.GOMO_SECOND_REQUEST_APPROVED!=='yes'))
    throw new Error('Daily request limit or second-request approval blocks collection');
  await checkArchive({repo:REPO,token,runId,attempt,fetchImpl:fetchArchive,apiBase:archiveApiBase});
  log('ARCHIVE_PREFLIGHT=ok');
  const supplierHeaders={Accept:'application/json','X-API-Key':apiKey};
  const validation=await fetchSupplier(new URL('/auth/validate',BASE),{headers:supplierHeaders});
  if (!validation.ok) throw new Error(`Supplier key validation failed: HTTP ${validation.status}; no paid request`);
  const freeStatus=await validation.json();
  const balances=[...JSON.stringify(freeStatus).matchAll(/"(?:token_balance|tokens_remaining|remaining_tokens)"\s*:\s*(\d+)/gi)];
  if (balances.length && Number(balances[0][1])<10)
    throw new Error('Insufficient verified supplier balance; no paid request');
  const path=`${prefix}_attempts/${y}/${m}/${d}/run-${runId}-attempt-${attempt}.json`;
  await reserve({path,headers,fetchImpl:fetchArchive,apiBase:archiveApiBase,runId,attempt,now});
  const sentAt=clock().toISOString();
  const url=new URL(`/alliance/${ALLIANCE_ID}/members`,BASE);
  url.searchParams.set('sort_by','power');url.searchParams.set('descending','true');
  log('ALLIANCE_MEMBERS_REQUESTS=1');
  const response=await fetchSupplier(url,{headers:supplierHeaders});
  const receivedAt=clock().toISOString();
  if (!response.ok) throw new Error(`Alliance Members HTTP ${response.status}; attempt counted; no automatic retry`);
  const raw=await response.json(),report=validateAlliance(raw);
  log('AGGREGATES='+JSON.stringify(report));
  const payload={sentAt,receivedAt,raw};
  const publicKey=readFileSync(new URL('./gomo-archive-public.pem',import.meta.url),'utf8');
  const capture=writeEncryptedCapture({payload,publicKey,
    directory:join(env.RUNNER_TEMP||'/tmp',testMode?'gomo-staging-fake':'gomo-real-staged'),
    runId,attempt,onSealed:onSealed||(!testMode?(encrypted=>log('ENCRYPTED_RECOVERY_BASE64='+encrypted)):undefined)});
  const result=await archiveCapture({file:capture.file,repo:REPO,token,
    testPrefix:testMode?'_tests/staging':'',fetchImpl:fetchArchive,apiBase:archiveApiBase});
  log('PRIVATE_ARCHIVE_VERIFIED='+JSON.stringify(result));
  return {result,capture,report};
}

if (process.argv[1] && import.meta.url===new URL(`file://${process.argv[1]}`).href) {
  try { await runStagedCapture(); }
  catch(error) { console.error('STAGED_CAPTURE_ERROR='+error.message);process.exitCode=1; }
}
