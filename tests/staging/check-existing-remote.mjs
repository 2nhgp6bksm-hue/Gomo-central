// Read-only duplicate guard test against the already archived fictitious day.
import { runStagedCapture } from './gomo-archive-real-staged.mjs';

const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',
  year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let supplierCalls=0;
const fakeSupplier=async ()=>{supplierCalls++;throw new Error('Supplier must not be reached');};
try {
  await runStagedCapture({env:{...process.env,GOMO_CAPTURE_APPROVED_DATE:date,
    GOMO_DAILY_PRIOR_REQUESTS:'0',LASTWAR_TOOLS_API_KEY:'FAKE-TEST-ONLY'},
    fetchSupplier:fakeSupplier,testMode:true,log:()=>{}});
  throw new Error('Expected duplicate detection did not occur');
} catch(error) {
  if (!/Snapshot already archived for today/.test(error.message) || supplierCalls!==0) throw error;
  console.log('STAGING_DUPLICATE_BLOCKED='+JSON.stringify({existingSnapshot:true,supplierCalls:0}));
}
