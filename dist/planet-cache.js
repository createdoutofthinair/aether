import {planetDataKey,samplePlanetData} from './planet-data.js?v=terrain-14';
const cache=new Map();let active=null,requestedKey=null,worker=null,serial=0;const jobs=new Map(),inflight=new Map();
export function installPlanetData(data){cache.delete(data.key);cache.set(data.key,data);while(cache.size>3)cache.delete(cache.keys().next().value);active=data;return data;}
export function planetAt(config,environment,n){if(!active)return null;for(const key of ['seed','relief','temperature','water','pressure','activity'])if(active.config[key]!==config[key])return null;for(const key of ['waterEnabled','iceEnabled','basin'])if(active.environment[key]!==environment[key])return null;return samplePlanetData(active,n);}
export function getPlanetData(){return active;}
export function planetCacheState(){return{resident:cache.size,limit:3,bytes:[...cache.values()].reduce((s,d)=>s+d.stats.bytes,0),active:active?.stats||null,pending:jobs.size};}
export async function preparePlanetData(config,environment){
 const key=planetDataKey(config,environment);requestedKey=key;if(cache.has(key))return installPlanetData(cache.get(key));
 if(typeof Worker==='undefined')return null;
 if(!worker){try{worker=new Worker(new URL('./planet-worker.js?v=terrain-14',import.meta.url),{type:'module'});}catch(error){console.warn('Planetary data worker unavailable; using authored terrain.',error.message);return null;}worker.onmessage=({data})=>{const job=jobs.get(data.id);if(!job)return;jobs.delete(data.id);data.error?job.reject(Error(data.error)):job.resolve(data.result);};worker.onerror=event=>{for(const job of jobs.values())job.reject(Error(event.message));jobs.clear();worker.terminate();worker=null;};}
 if(!inflight.has(key)){const request=new Promise((resolve,reject)=>{const id=++serial;jobs.set(id,{resolve,reject});worker.postMessage({id,config:{...config},environment:{...environment}});}).finally(()=>inflight.delete(key));inflight.set(key,request);}
 let data;try{data=await inflight.get(key);}catch(error){console.warn('Planetary data unavailable; using authored terrain.',error.message);return null;}if(requestedKey===key)installPlanetData(data);return data;
}
