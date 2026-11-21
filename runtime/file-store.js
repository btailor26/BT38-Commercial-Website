// Local single-process storage only. Use the existing Neon database in production.
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
export class FileStore {
 constructor(directory){this.path=join(directory,'records.json');this.queue=Promise.resolve();this.ready=mkdir(directory,{recursive:true}).then(async()=>{try{this.data=JSON.parse(await readFile(this.path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;this.data={};}});}
 async get(key){await this.ready;await this.queue;const value=this.data[key];return value===undefined?null:{text:async()=>value,json:async()=>JSON.parse(value)};}
 mutate(fn){const pending=this.queue.then(async()=>{await this.ready;const result=fn();await writeFile(this.path+'.tmp',JSON.stringify(this.data),{mode:0o600});await rename(this.path+'.tmp',this.path);return result;});this.queue=pending.catch(()=>{});return pending;}
 put(key,value,options){return this.mutate(()=>{if(options?.onlyIf?.etagDoesNotMatch==='*'&&Object.hasOwn(this.data,key))return null;this.data[key]=value;return {key};});}
 delete(key){return this.mutate(()=>{delete this.data[key]});}
 async list({prefix='',cursor='',limit=1000}={}){await this.ready;await this.queue;const keys=Object.keys(this.data).filter(k=>k.startsWith(prefix)&&k>cursor).sort();const page=keys.slice(0,limit),truncated=keys.length>limit;return {objects:page.map(key=>({key})),truncated,...(truncated?{cursor:page.at(-1)}:{})};}
}
