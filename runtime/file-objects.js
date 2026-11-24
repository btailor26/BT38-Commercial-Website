import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
export class FileObjects {
 constructor(directory){this.directory=directory;}
 path(key){if(!/^(?:partner-documents\/[a-f0-9]{64}\/[a-f0-9-]{36}|partner-agreements\/templates\/[a-f0-9-]{36}\/[a-f0-9]{64})$/.test(key))throw Error('Invalid private object key.');return join(this.directory,key);}
 async put(key,value){const path=this.path(key);await mkdir(path.slice(0,path.lastIndexOf('/')),{recursive:true});await writeFile(path,new Uint8Array(value),{mode:0o600});}
 async get(key){try{const value=await readFile(this.path(key));return {arrayBuffer:async()=>value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength)};}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async delete(key){try{await unlink(this.path(key));}catch(e){if(e.code!=='ENOENT')throw e;}}
}
