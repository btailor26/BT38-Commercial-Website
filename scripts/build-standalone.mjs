import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await build({entryPoints:['runtime/worker.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/server/index.js',logLevel:'warning'});
await writeFile('dist/package.json',JSON.stringify({type:'module'}));
console.log('Built independent BT38 application. No Sites tools or hosting manifest required.');
