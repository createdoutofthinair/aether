// HTTP/service check only. No browser, screenshots, or GPU are involved.
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';

const root=fileURLToPath(new URL('../',import.meta.url));
const server=await createServer({root:root+'dist',configFile:root+'vite.config.js',logLevel:'silent',server:{host:'127.0.0.1',port:0,strictPort:true,open:false}});
const results=[];
try{
 await server.listen();const address=server.httpServer.address();
 assert(address&&typeof address==='object');
 const paths=['/','/entry.js','/terrain-worker.js?v=terrain-19','/material-page-worker.js?v=terrain-19','/material-editor.html','/compressed/manifest.json','/vendor/basis/basis_transcoder.wasm','/rover.glb.gz'];
 for(const path of paths){
  const response=await fetch(`http://127.0.0.1:${address.port}${path}`,{signal:AbortSignal.timeout(5000)}),data=Buffer.from(await response.arrayBuffer());
  assert.equal(response.status,200,path);assert(data.length>0,path);
  if(path==='/')assert(data.toString().includes('entry.js?v=manual-review-1'));
  if(path.endsWith('.wasm'))assert.equal(data.subarray(0,4).toString('hex'),'0061736d');
  if(path.endsWith('manifest.json'))assert.equal(Object.keys(JSON.parse(data)).length,13);
  if(path.endsWith('rover.glb.gz')){
   const glb=data[0]===31&&data[1]===139?gunzipSync(data):data;
   assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(glb.readUInt32LE(8),glb.length);
  }
  results.push({path,status:response.status,contentType:response.headers.get('content-type'),servedBytes:data.length});
 }
 console.log(JSON.stringify({schemaVersion:1,capturedAt:new Date().toISOString(),kind:'same-process loopback Vite HTTP smoke',results,functionalStatus:'pass',visualStatus:'not applicable',performanceStatus:'not applicable',limitations:['Delivery checks only; no renderer launched or GPU observed.']},null,2));
}finally{await server.close();}
