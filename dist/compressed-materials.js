import {KTX2Loader} from './vendor/KTX2Loader.js';
export async function loadCompressedMaterials(T,renderer){
 const loader=new KTX2Loader().setTranscoderPath('./vendor/basis/').setWorkerLimit(2).detectSupport(renderer);let loaded=[];
 try{
  const manifest=await fetch('./compressed/manifest.json').then(r=>{if(!r.ok)throw Error('Compressed material manifest unavailable');return r.json();});
  const results=await Promise.allSettled(Object.entries(manifest).map(async([key,asset])=>{const texture=await loader.loadAsync(asset.path);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());return [key,texture];}));
  loaded=results.filter(r=>r.status==='fulfilled').map(r=>r.value);const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
  const inverse=await fetch('./material-histogram.json').then(r=>{if(!r.ok)throw Error('Material histogram unavailable');return r.json();});
  if(inverse.length!==256*3*4||!inverse.every(Number.isFinite))throw Error('Invalid material histogram');
  const half=Uint16Array.from(inverse,v=>T.DataUtils.toHalfFloat(v)),lut=new T.DataTexture(half,256,3,T.RGBAFormat,T.HalfFloatType);lut.minFilter=lut.magFilter=T.LinearFilter;lut.needsUpdate=true;
  return{...Object.fromEntries(loaded),histogram:lut,normalMoments:true,compressed:true};
 }catch(error){for(const [,t]of loaded)t.dispose();throw error;}finally{loader.dispose();}
}
