import {samplePlanetData} from './planet-data.js?v=terrain-12';
export const PAGE_SIZE=128,PAGE_BORDER=1,PAGE_STRIDE=130,PAGE_COLUMNS=16,PAGE_ROWS=8,CACHE_COLUMNS=8,CACHE_ROWS=4,ATLAS_WIDTH=1040,ATLAS_HEIGHT=2081,REFERENCE_Y=8,CACHE_Y=521,COLOR_Y=1041,SURFACE_Y=1561;
export function composeMaterialPage(data,tx,ty){
 const pixels=new Uint8Array(PAGE_STRIDE*PAGE_STRIDE*4),color=pixels.slice(),surface=pixels.slice();
 for(let y=0;y<PAGE_STRIDE;y++)for(let x=0;x<PAGE_STRIDE;x++){
  const u=(tx*PAGE_SIZE+x-PAGE_BORDER+.5)/(PAGE_COLUMNS*PAGE_SIZE),v=Math.max(0,Math.min(1,(ty*PAGE_SIZE+y-PAGE_BORDER+.5)/(PAGE_ROWS*PAGE_SIZE))),lat=(.5-v)*Math.PI,lon=(u-.5)*2*Math.PI;
  const g=samplePlanetData(data,{x:Math.cos(lat)*Math.sin(lon),y:Math.sin(lat),z:Math.cos(lat)*Math.cos(lon)});
  const i=(y*PAGE_STRIDE+x)*4,material=composeRegionalSurface(g,data.config);
  color.set([...material.color,1].map(value=>Math.round(value*255)),i);
  surface.set([material.roughness,material.occlusion,material.height,1].map(value=>Math.round(value*255)),i);
  pixels.set([g.soil,g.exposure,g.flow,g.shelter].map(value=>Math.round(value*255)),(y*PAGE_STRIDE+x)*4);
 }
 return{tx,ty,pixels,color,surface};
}
// Linear-light regional substrate. Climate blankets and metre-scale scanned
// normals remain in the shader; these pages contain view-independent material data.
export function composeRegionalSurface(g,config){
 const mix=(a,b,t)=>a+(b-a)*t,rock=Math.max(0,Math.min(1,g.exposure-g.soil*.3)),wet=Math.max(0,Math.min(1,g.flow*g.soil));
 const airless=config.pressure<.05;
 const soil=airless?[.25,.24,.23]:[.43,.33,.22],stone=[.30,.28,.25];
 return{color:soil.map((v,i)=>mix(v,stone[i],rock)*(1-wet*.18)),roughness:mix(mix(.94,.84,rock),.62,wet),occlusion:mix(.82,1,g.shelter),height:mix(.42,.62,rock)+g.soil*.08};
}
export class MaterialPageCache{
 constructor(T){this.T=T;this.pixels=new Uint8Array(ATLAS_WIDTH*ATLAS_HEIGHT*4);this.texture=new T.DataTexture(this.pixels,ATLAS_WIDTH,ATLAS_HEIGHT,T.RGBAFormat);this.texture.minFilter=this.texture.magFilter=T.LinearFilter;this.texture.generateMipmaps=false;this.texture.needsUpdate=true;this.pages=new Map();this.pending=new Set();this.epoch=0;this.clock=0;this.enabled=false;this.worker=null;try{if(typeof Worker!=='undefined')this.worker=new Worker(new URL('./material-page-worker.js?v=terrain-12',import.meta.url),{type:'module'});}catch(error){console.warn('Material pages unavailable; using parent masks.',error.message);}
  if(this.worker){this.worker.onmessage=({data})=>{if(data.epoch!==this.epoch)return;this.pending.delete(data.key);if(data.error){console.warn('Material page failed:',data.error);return;}this.install(data.result);};this.worker.onerror=event=>{console.warn('Material page worker unavailable:',event.message);this.pending.clear();this.worker.terminate();this.worker=null;};}
 }
 reset(data,reference){this.epoch++;this.data=data;this.pages.clear();this.pending.clear();this.previous=null;this.pixels.fill(0);this.enabled=!!data;
  if(reference)for(let y=0;y<reference.size;y++)this.pixels.set(reference.masks.subarray(y*reference.size*4,(y+1)*reference.size*4),((y+REFERENCE_Y)*ATLAS_WIDTH)*4);
  this.worker?.postMessage({epoch:this.epoch,type:'world',data});this.texture.needsUpdate=true;
 }
 install(page){const key=page.tx+','+page.ty;if(this.pages.has(key))return;let slot=this.pages.size;
  if(slot>=CACHE_COLUMNS*CACHE_ROWS){let victim=null;for(const entry of this.pages.values())if(!this.pinned?.has(entry.key)&&(!victim||entry.stamp<victim.stamp))victim=entry;if(!victim)return;slot=victim.slot;this.pages.delete(victim.key);this.pixels.fill(0,(victim.ty*ATLAS_WIDTH+victim.tx)*4,(victim.ty*ATLAS_WIDTH+victim.tx)*4+4);}
  const sx=slot%CACHE_COLUMNS,sy=Math.floor(slot/CACHE_COLUMNS);
  for(let y=0;y<PAGE_STRIDE;y++)this.pixels.set(page.pixels.subarray(y*PAGE_STRIDE*4,(y+1)*PAGE_STRIDE*4),((CACHE_Y+sy*PAGE_STRIDE+y)*ATLAS_WIDTH+sx*PAGE_STRIDE)*4);
  for(const [offset,channel]of [[COLOR_Y,page.color],[SURFACE_Y,page.surface]])if(channel)for(let y=0;y<PAGE_STRIDE;y++)this.pixels.set(channel.subarray(y*PAGE_STRIDE*4,(y+1)*PAGE_STRIDE*4),((offset+sy*PAGE_STRIDE+y)*ATLAS_WIDTH+sx*PAGE_STRIDE)*4);
  this.pixels.set([sx,sy,0,255],(page.ty*ATLAS_WIDTH+page.tx)*4);this.pages.set(key,{key,tx:page.tx,ty:page.ty,slot,stamp:++this.clock});this.texture.needsUpdate=true;
 }
 prefetch(n){if(!this.data||!this.worker)return;const u=.5+Math.atan2(n.x,n.z)/(2*Math.PI),v=.5-Math.asin(Math.max(-1,Math.min(1,n.y)))/Math.PI;let x=Math.floor(u*PAGE_COLUMNS)%PAGE_COLUMNS,y=Math.min(PAGE_ROWS-1,Math.floor(v*PAGE_ROWS));let dx=0,dy=0;
  if(this.previous){let du=u-this.previous.u;if(du>.5)du--;if(du<-.5)du++;dx=Math.sign(du);dy=Math.sign(v-this.previous.v);}this.previous={u,v};const desired=[];
  for(const [ox,oy]of [[0,0],[dx,dy],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const tx=(x+ox+PAGE_COLUMNS)%PAGE_COLUMNS,ty=Math.max(0,Math.min(PAGE_ROWS-1,y+oy)),key=tx+','+ty;if(!desired.some(p=>p.key===key))desired.push({tx,ty,key});}
  this.pinned=new Set(desired.map(p=>p.key));for(const page of desired){const resident=this.pages.get(page.key);if(resident){resident.stamp=++this.clock;continue;}if(this.pending.has(page.key)||this.pending.size>=2)continue;this.pending.add(page.key);this.worker.postMessage({epoch:this.epoch,key:page.key,tx:page.tx,ty:page.ty});}
 }
 state(){return{pages:this.pages.size,limit:CACHE_COLUMNS*CACHE_ROWS,pending:this.pending.size,gpuBytes:this.pixels.byteLength,virtualResolution:[PAGE_COLUMNS*PAGE_SIZE,PAGE_ROWS*PAGE_SIZE],content:'geology masks, linear albedo, roughness, occlusion and blend height',enabled:this.enabled};}
}
