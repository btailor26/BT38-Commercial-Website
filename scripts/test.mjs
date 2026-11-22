import {spawnSync} from 'node:child_process';
const checks=['check.mjs','check-referrals.mjs','check-checkout.mjs','check-neon-store.mjs','check-customers.mjs','check-google-auth.mjs','check-standalone.mjs','check-commercial.mjs','check-node-http.mjs','check-partner-approval.mjs','check-messaging.mjs','check-sales-workflow.mjs'];
for(const file of checks){const r=spawnSync(process.execPath,['scripts/'+file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
