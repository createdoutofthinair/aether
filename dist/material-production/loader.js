import {decodeMaterialPack,sha256} from './pack.js';
export const MATERIAL_CACHE='aether-production-materials-v1';
export async function loadProductionMaterial(entry,{baseURL=new URL('./',import.meta.url),useCache=true}={}){
 const start=performance.now(),url=new URL(entry.url,baseURL).href;let response,source='network',cache;
 if(useCache&&globalThis.caches){cache=await caches.open(MATERIAL_CACHE);response=await cache.match(url);if(response)source='Cache Storage';}
 const fetchStart=performance.now();if(!response){response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Material download failed: '+response.status);}const payload=new Uint8Array(await response.arrayBuffer()),fetchMs=performance.now()-fetchStart,decodeStart=performance.now();let bytes=payload;
 if(bytes[0]===31&&bytes[1]===139){if(!globalThis.DecompressionStream)throw Error('This browser cannot decode gzip material packs');bytes=new Uint8Array(await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());}
 if(await sha256(bytes)!==entry.sha256)throw Error('Material checksum mismatch');const pack=decodeMaterialPack(bytes);if(cache&&source==='network')await cache.put(url,new Response(payload,{headers:{'Content-Type':'application/octet-stream'}}));return{pack,source,timings:{fetchMs,decodeMs:performance.now()-decodeStart,totalMs:performance.now()-start},payloadBytes:payload.byteLength};
}
