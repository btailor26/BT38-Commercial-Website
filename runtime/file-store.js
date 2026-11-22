// Local single-process storage only. Use the existing Neon database in production.
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export class FileStore {
 hash(value){return createHash('sha256').update(value).digest('hex');}
 constructor(directory){this.path=join(directory,'records.json');this.queue=Promise.resolve();this.ready=mkdir(directory,{recursive:true}).then(async()=>{try{this.data=JSON.parse(await readFile(this.path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;this.data={};}});}
 async get(key){await this.ready;await this.queue;const value=this.data[key];return value===undefined?null:{etag:this.hash(value),text:async()=>value,json:async()=>JSON.parse(value)};}
 mutate(fn){const pending=this.queue.then(async()=>{await this.ready;const result=fn();await writeFile(this.path+'.tmp',JSON.stringify(this.data),{mode:0o600});await rename(this.path+'.tmp',this.path);return result;});this.queue=pending.catch(()=>{});return pending;}
 put(key,value,options){return this.mutate(()=>{if(options?.onlyIf?.etagDoesNotMatch==='*'&&Object.hasOwn(this.data,key))return null;if(options?.onlyIf?.etagMatches!==undefined&&(this.data[key]===undefined||this.hash(this.data[key])!==options.onlyIf.etagMatches))return null;this.data[key]=value;return {key};});}
 batch(writes,events){return this.mutate(()=>{if(writes.some(w=>this.data[w.key]===undefined||this.hash(this.data[w.key])!==w.etag))return false;for(const w of writes)this.data[w.key]=w.body;for(const e of events)this.data[e.key]=e.body;return true;});}
 delete(key){return this.mutate(()=>{delete this.data[key]});}
 async list({prefix='',cursor='',limit=1000}={}){await this.ready;await this.queue;const keys=Object.keys(this.data).filter(k=>k.startsWith(prefix)&&k>cursor).sort();const page=keys.slice(0,limit),truncated=keys.length>limit;return {objects:page.map(key=>({key})),truncated,...(truncated?{cursor:page.at(-1)}:{})};}
}
