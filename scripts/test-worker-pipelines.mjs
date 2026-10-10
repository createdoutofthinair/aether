import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {defaults,environment} from '../dist/world.js';
const workerURL=new URL('../dist/planet-worker.js',import.meta.url);
const worker=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:(data,transfer)=>parentPort.postMessage(data,transfer)};import(${JSON.stringify(workerURL.href)}).then(()=>parentPort.on('message',data=>self.onmessage({data}))).catch(e=>{throw e;});`,{eval:true});
const result=await new Promise((resolve,reject)=>{worker.once('error',reject);worker.once('message',resolve);worker.postMessage({id:1,config:defaults,environment});});await worker.terminate();assert(!result.error,result.error);assert.equal(result.result.stats.nodes,32514);assert(result.result.residual.every(Number.isFinite));assert(result.result.stats.maximumFlow>1000);assert.equal(result.result.masks.length,256*129*4);console.log('Planet worker: production module graph, full-resolution routing and transferred typed arrays pass');
