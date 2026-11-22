import {AwsClient} from 'aws4fetch';
export function privateObjects(env){if(env.PRIVATE_UPLOADS)return env.PRIVATE_UPLOADS;
 if(!env.PRIVATE_S3_ENDPOINT||!env.PRIVATE_S3_BUCKET||!env.PRIVATE_S3_ACCESS_KEY_ID||!env.PRIVATE_S3_SECRET_ACCESS_KEY)return null;
 const endpoint=new URL(env.PRIVATE_S3_ENDPOINT);if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw Error('Invalid private object endpoint.');
 const client=new AwsClient({accessKeyId:env.PRIVATE_S3_ACCESS_KEY_ID,secretAccessKey:env.PRIVATE_S3_SECRET_ACCESS_KEY,service:'s3',region:env.PRIVATE_S3_REGION||'auto'});
 const location=key=>new URL(encodeURIComponent(env.PRIVATE_S3_BUCKET)+'/'+key.split('/').map(encodeURIComponent).join('/'),endpoint.href.replace(/\/?$/,'/')).href;
 return {async put(key,value){const r=await client.fetch(location(key),{method:'PUT',headers:{'Content-Type':'application/octet-stream','Cache-Control':'private, no-store'},body:value});if(!r.ok)throw Error('Private upload storage failed.');return {key};},async get(key){const r=await client.fetch(location(key),{method:'GET'});if(r.status===404)return null;if(!r.ok)throw Error('Private download storage failed.');return {arrayBuffer:()=>r.arrayBuffer()};},async delete(key){const r=await client.fetch(location(key),{method:'DELETE'});if(!r.ok&&r.status!==404)throw Error('Private storage removal failed.');}};
}
