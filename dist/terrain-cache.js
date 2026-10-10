import {generateReference,referenceSample} from './terrain-data.js?v=terrain-9';
import {prepareDetail,prepareDetailIndex,DETAIL_EXTENT,emptyDetailTile,sampleDetailTile} from './terrain-detail.js?v=terrain-9';
const cache=new Map(),inflight=new Map();let active=null,worker,serial=0,requestedSeed;const pending=new Map();
function retain(data){cache.delete(data.seed);cache.set(data.seed,data);while(cache.size>3)cache.delete(cache.keys().next().value);return data;}
const detailCaches=new WeakMap();
const prefetching=new Set();
function tilesFor(data){let tiles=detailCaches.get(data);if(!tiles){tiles=new Map();detailCaches.set(data,tiles);}return tiles;}
function keepTile(tiles,key,tile){tiles.delete(key);tiles.set(key,tile);while(tiles.size>192)tiles.delete(tiles.keys().next().value);return tile;}
export function installReference(data){active=prepareDetailIndex(prepareDetail(data));return retain(data);}
export function getReference(){return active;}
export function referenceAt(seed,x,z,refine=true){
 if(active?.seed!==seed)return null;const g=referenceSample(active,x,z);if(!g||!refine||Math.hypot(x,z)>2700)return g;
 const tiles=tilesFor(active),tx=Math.floor(x/DETAIL_EXTENT),tz=Math.floor(z/DETAIL_EXTENT),key=tx+','+tz;let tile=tiles.get(key);
 tile=keepTile(tiles,key,tile||emptyDetailTile(seed,tx,tz));
 g.height+=sampleDetailTile(active,tile,x,z);return g;
}
export function detailCacheState(){const tiles=active?detailCaches.get(active):null;return{step:2,tiles:tiles?.size||0,prepared:tiles?Array.from(tiles.values()).filter(t=>t.complete).length:0,limit:192,bytes:(tiles?.size||0)*67*67*4,pending:prefetching.size};}
export function installDetailTile(tile,data=active){if(!data||tile.seed!==data.seed)return false;keepTile(tilesFor(data),tile.tx+','+tile.tz,tile);return true;}
export function prefetchDetail(x,z){
 if(!active||!worker||Math.hypot(x,z)>2700||prefetching.size>=2)return;
 const data=active,tiles=tilesFor(data),cx=Math.floor(x/DETAIL_EXTENT),cz=Math.floor(z/DETAIL_EXTENT);
 for(const [dx,dz]of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
  const tx=cx+dx,tz=cz+dz,key=tx+','+tz,jobKey=data.seed+'/'+key;if(tiles.get(key)?.complete||prefetching.has(jobKey))continue;
  prefetching.add(jobKey);const id=++serial;
  new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});worker.postMessage({id,type:'detail',seed:data.seed,tx,tz});}).then(tile=>{if(active===data)installDetailTile(tile,data);}).catch(error=>console.warn('Fine tile prefetch failed.',error.message)).finally(()=>prefetching.delete(jobKey));
  if(prefetching.size>=2)break;
 }
}
export async function prepareReference(seed=6){
 requestedSeed=seed;
 if(cache.has(seed))return installReference(cache.get(seed));
 if(typeof Worker==='undefined')return installReference(generateReference(seed));
 if(!worker){try{worker=new Worker(new URL('./terrain-worker.js?v=terrain-9',import.meta.url),{type:'module'});}catch(error){console.warn('Landscape worker unavailable; generating locally.',error.message);return installReference(generateReference(seed));}worker.onmessage=({data})=>{const job=pending.get(data.id);if(!job)return;pending.delete(data.id);data.error?job.reject(Error(data.error)):job.resolve(data.result);};worker.onerror=e=>{for(const job of pending.values())job.reject(Error(e.message));pending.clear();worker.terminate();worker=null;};}
 if(!inflight.has(seed)){
  const job=new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});worker.postMessage({id,seed});}).catch(error=>{console.warn('Landscape worker unavailable; generating locally.',error.message);return generateReference(seed);}).finally(()=>inflight.delete(seed));
  inflight.set(seed,job);
 }
 const data=retain(prepareDetailIndex(prepareDetail(await inflight.get(seed))));if(requestedSeed===seed)active=data;return data;
}
