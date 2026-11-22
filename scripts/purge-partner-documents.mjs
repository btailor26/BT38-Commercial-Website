// Run from an operator-configured secret environment; never prints credentials.
import {NeonRecordStore} from '../worker/neon-record-store.js';
import {purgeDocuments} from '../worker/partner-documents.js';
if(!process.env.WEBSITE_DATABASE_URL)throw Error('The dedicated website connection is required.');
const env={...process.env,BUCKET:new NeonRecordStore(process.env.WEBSITE_DATABASE_URL)};
console.log(JSON.stringify({purged:await purgeDocuments(env)}));
