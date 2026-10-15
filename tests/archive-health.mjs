import { randomBytes } from 'node:crypto';
import { readCreatedFile } from './archive-private.mjs';

// This step runs before the supplier request. It tests private write and read
// with a tiny non-sensitive marker and never touches member data.
export async function checkArchive({repo, token, runId, attempt = 1,
  fetchImpl = fetch, apiBase = 'https://api.github.com'}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) || !token || !/^\d+$/.test(String(runId)))
    throw new Error('Private archive configuration missing');
  const headers = {Authorization:`Bearer ${token}`, Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'};
  const base = `${apiBase}/repos/${repo}`;
  const response = await fetchImpl(base,{headers});
  if (!response.ok || (await response.json()).private !== true)
    throw new Error('Private archive repository unavailable');
  const marker = Buffer.from(JSON.stringify({runId:String(runId), attempt:Number(attempt),
    nonce:randomBytes(12).toString('hex')}));
  const path = `_health/run-${runId}-attempt-${attempt}.json`;
  const url = `${base}/contents/${path}`;
  const before = await fetchImpl(url,{headers});
  if (before.status !== 404) throw new Error('Private archive health marker already exists or cannot be inspected');
  const put = await fetchImpl(url,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},
    body:JSON.stringify({message:`archive: preflight run ${runId}`,content:marker.toString('base64')})});
  if (put.status !== 201) throw new Error(`Private archive write check failed: HTTP ${put.status}`);
  const created = await put.json();
  if (created?.content?.path !== path || !created?.content?.sha || !created?.commit?.sha)
    throw new Error('Private archive health create response metadata differs');
  await readCreatedFile({url,path,content:marker,blobSha:created.content.sha,
    commitSha:created.commit.sha,headers,fetchImpl});
  return {private:true,writable:true,readback:true};
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const result = await checkArchive({repo:process.env.GOMO_PRIVATE_ARCHIVE_REPO,
      token:process.env.GOMO_ARCHIVE_TOKEN,runId:process.env.GITHUB_RUN_ID,
      attempt:process.env.GITHUB_RUN_ATTEMPT || 1});
    console.log('ARCHIVE_PREFLIGHT=' + JSON.stringify(result));
  } catch(error) {
    console.error('ARCHIVE_PREFLIGHT_ERROR=' + error.message);
    process.exitCode=1;
  }
}
