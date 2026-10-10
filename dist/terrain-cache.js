import {generateReference,referenceSample} from './terrain-data.js?v=terrain-7';
const cache=new Map(),inflight=new Map();let active=null,worker,serial=0,requestedSeed;const pending=new Map();
function retain(data){cache.delete(data.seed);cache.set(data.seed,data);while(cache.size>3)cache.delete(cache.keys().next().value);return data;}
export function installReference(data){active=data;return retain(data);}
export function getReference(){return active;}
export function referenceAt(seed,x,z){return active?.seed===seed?referenceSample(active,x,z):null;}
export async function prepareReference(seed=6){
 requestedSeed=seed;
 if(cache.has(seed))return installReference(cache.get(seed));
 if(typeof Worker==='undefined')return installReference(generateReference(seed));
 if(!worker){try{worker=new Worker(new URL('./terrain-worker.js?v=terrain-7',import.meta.url),{type:'module'});}catch(error){console.warn('Landscape worker unavailable; generating locally.',error.message);return installReference(generateReference(seed));}worker.onmessage=({data})=>{const job=pending.get(data.id);if(!job)return;pending.delete(data.id);data.error?job.reject(Error(data.error)):job.resolve(data.result);};worker.onerror=e=>{for(const job of pending.values())job.reject(Error(e.message));pending.clear();worker.terminate();worker=null;};}
 if(!inflight.has(seed)){
  const job=new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});worker.postMessage({id,seed});}).catch(error=>{console.warn('Landscape worker unavailable; generating locally.',error.message);return generateReference(seed);}).finally(()=>inflight.delete(seed));
  inflight.set(seed,job);
 }
 const data=retain(await inflight.get(seed));if(requestedSeed===seed)active=data;return data;
}
