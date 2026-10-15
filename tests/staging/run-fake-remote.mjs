// GitHub Actions integration test. No LastWar Tools key or request is available.
import { runStagedCapture } from './gomo-archive-real-staged.mjs';

const members=Array.from({length:93},(_,i)=>({
  uid:`TEST-${String(i+1).padStart(3,'0')}`,name:`Fictif ${i+1}`,
  hq_level:20+i%16,rank:1+i%5,power:1_000_000+i,army_kill:i*17
}));
const raw={member_count:93,total_power:members.reduce((n,m)=>n+m.power,0),members};
let simulatedCalls=0;
const fakeSupplier=async address=>{
  if (String(address).includes('/auth/validate')) return Response.json({tokens_remaining:50});
  simulatedCalls++;
  return Response.json(raw);
};
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',
  year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const env={...process.env,GOMO_CAPTURE_APPROVED_DATE:date,
  GOMO_DAILY_PRIOR_REQUESTS:'0',LASTWAR_TOOLS_API_KEY:'FAKE-TEST-ONLY'};
const {result}=await runStagedCapture({env,fetchSupplier:fakeSupplier,testMode:true,
  log:message=>{if (!message.startsWith('ENCRYPTED_RECOVERY_BASE64=')) console.log(message)}});
if (simulatedCalls!==1 || result.count!==93 || result.uniqueUids!==93 ||
    !result.path.startsWith('_tests/staging/snapshots/'))
  throw new Error('Fictitious staging integration mismatch');
console.log('STAGING_FAKE_VERIFIED='+JSON.stringify({path:result.path,
  sha256:result.sha256,simulatedCalls,realSupplierCalls:0}));
