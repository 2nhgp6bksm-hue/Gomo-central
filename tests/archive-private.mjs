import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';

function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function readCreatedFile({url, path, content, blobSha, commitSha,
  headers, fetchImpl, delays = [0, 250, 750, 1500, 3000], sleep = pause}) {
  if (!/^[0-9a-f]{40}$/.test(blobSha) || !/^[0-9a-f]{40}$/.test(commitSha))
    throw new Error(`Archive create response lacks valid GitHub SHA: ${path}`);
  const refUrl = `${url}?ref=${encodeURIComponent(commitSha)}`;
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);
    const get = await fetchImpl(refUrl, {headers});
    if (get.status === 404 && i < delays.length - 1) continue;
    if (!get.ok) throw new Error(`Archive readback failed after ${i+1} attempt(s): HTTP ${get.status}; path=${path}; commit=${commitSha}`);
    const record = await get.json();
    if (record.path !== path || record.sha !== blobSha || record.encoding !== 'base64')
      throw new Error(`Archive readback metadata differs: ${path}`);
    const remote = Buffer.from(String(record.content || '').replace(/\s/g,''),'base64');
    if (!remote.equals(content) || sha(remote) !== sha(content))
      throw new Error(`Archive readback SHA-256 differs: ${path}`);
    return sha(remote);
  }
  throw new Error(`Archive readback failed: ${path}`);
}

export async function archiveCapture({file, repo, token, testPrefix = '', fetchImpl = fetch,
  apiBase = 'https://api.github.com'}) {
  if (testPrefix !== '' && testPrefix !== '_tests/staging')
    throw new Error('Invalid archive test prefix');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) || !token) {
    throw new Error('Private archive repository or credential unavailable');
  }
  const bytes = readFileSync(file);
  const manifestBytes = readFileSync(file + '.manifest.json');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (basename(file) !== manifest.fileName || sha(bytes) !== manifest.sha256 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(manifest.date) ||
      !/^\d+$/.test(manifest.runId)) throw new Error('Local encrypted capture failed integrity check');
  const headers = {Authorization:`Bearer ${token}`, Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'};
  const base = `${apiBase}/repos/${repo}`;
  const repoRes = await fetchImpl(base, {headers});
  if (!repoRes.ok || (await repoRes.json()).private !== true)
    throw new Error('Archive destination is not an accessible private repository');

  const [year,month,day] = manifest.date.split('-');
  const prefix = manifest.validation.valid ? 'snapshots' : 'quarantine';
  const path = `${testPrefix ? testPrefix + '/' : ''}${prefix}/${year}/${month}/${day}/${manifest.fileName}`;
  async function createAndVerify(target, content) {
    const url = `${base}/contents/${target}`;
    const existing = await fetchImpl(url, {headers});
    if (existing.status !== 404) {
      if (!existing.ok) throw new Error(`Archive preflight failed: HTTP ${existing.status}`);
      throw new Error(`Archive path already exists; no overwrite: ${target}`);
    }
    const put = await fetchImpl(url, {method:'PUT', headers:{...headers,'Content-Type':'application/json'},
      body:JSON.stringify({message:`archive: encrypted GoMo ${manifest.date} run ${manifest.runId}`,
        content:content.toString('base64')})});
    if (put.status !== 201) throw new Error(`Archive create failed: HTTP ${put.status}`);
    const created = await put.json();
    if (created?.content?.path !== target || !created?.content?.sha || !created?.commit?.sha)
      throw new Error(`Archive create response metadata differs: ${target}`);
    return readCreatedFile({url,path:target,content,blobSha:created.content.sha,
      commitSha:created.commit.sha,headers,fetchImpl});
  }
  const verifiedSha = await createAndVerify(path, bytes);
  const verifiedManifestSha = await createAndVerify(path+'.manifest.json', manifestBytes);
  if (verifiedManifestSha !== sha(manifestBytes) || manifest.sha256 !== verifiedSha ||
      manifest.fileName !== basename(path)) throw new Error('Archive manifest differs from encrypted capture');
  if (!manifest.validation.valid) throw new Error(`Invalid capture was safely quarantined at ${path}`);
  return {path, sha256:verifiedSha, count:manifest.validation.received,
    uniqueUids:manifest.validation.uniqueUids, power:manifest.validation.calculatedPower,
    receivedAt:manifest.receivedAt};
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const result = await archiveCapture({file:process.env.GOMO_CAPTURE_FILE,
      repo:process.env.GOMO_PRIVATE_ARCHIVE_REPO,
      token:process.env.GOMO_ARCHIVE_TOKEN});
    console.log('ARCHIVE_VERIFIED=' + JSON.stringify(result));
  } catch (error) {
    console.error('ARCHIVE_ERROR=' + error.message);
    process.exitCode = 1;
  }
}
