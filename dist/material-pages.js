import {referenceSample} from './terrain-data.js?v=terrain-13';
import {composeRegionalSurface} from './regional-material.js?v=terrain-13';
export {composeRegionalSurface} from './regional-material.js?v=terrain-13';
import {samplePlanetData} from './planet-data.js?v=terrain-13';
export const PAGE_SIZE=128,PAGE_BORDER=1,PAGE_STRIDE=130,PAGE_COLUMNS=512,PAGE_ROWS=256,CACHE_COLUMNS=6,CACHE_ROWS=5,ATLAS_WIDTH=1560,ATLAS_HEIGHT=1813,REFERENCE_Y=0,PARENT_X=1040,PARENT_Y=0,TABLE_X=520,TABLE_Y=0,CACHE_Y=513,COLOR_X=780,COLOR_Y=513,SURFACE_X=0,SURFACE_Y=1163,NORMAL_X=780,NORMAL_Y=1163;
const length=Math.hypot(.27,.46,.846),landing=[.27/length,.46/length,.846/length],horizontal=Math.hypot(landing[0],landing[2]),east=[landing[2]/horizontal,0,-landing[0]/horizontal],north=[-landing[1]*landing[0]/horizontal,horizontal,-landing[1]*landing[2]/horizontal];
export function composeMaterialPage(data,tx,ty,reference=null){
 const pixels=new Uint8Array(PAGE_STRIDE*PAGE_STRIDE*4),color=pixels.slice(),surface=pixels.slice(),normal=pixels.slice();
 for(let y=0;y<PAGE_STRIDE;y++)for(let x=0;x<PAGE_STRIDE;x++){
  const u=(tx*PAGE_SIZE+x-PAGE_BORDER+.5)/(PAGE_COLUMNS*PAGE_SIZE),v=Math.max(0,Math.min(1,(ty*PAGE_SIZE+y-PAGE_BORDER+.5)/(PAGE_ROWS*PAGE_SIZE))),lat=(.5-v)*Math.PI,lon=(u-.5)*2*Math.PI;
  const direction={x:Math.cos(lat)*Math.sin(lon),y:Math.sin(lat),z:Math.cos(lat)*Math.cos(lon)},g=samplePlanetData(data,direction);
  const radial=[direction.x,direction.y,direction.z],dot=basis=>radial.reduce((v,n,i)=>v+n*basis[i],0),local=reference&&dot(landing)>0?referenceSample(reference,dot(east)*60000,dot(north)*60000):null;
  const composed=local?Object.fromEntries(['soil','exposure','flow','shelter'].map(key=>[key,g[key]+(local[key]-g[key])*local.weight])):g;
  const i=(y*PAGE_STRIDE+x)*4,material=composeRegionalSurface(composed,data.config,data.environment,direction);
  color.set([...material.color,material.decal].map(value=>Math.round(value*255)),i);
  surface.set([material.roughness,material.occlusion,material.height,1].map(value=>Math.round(value*255)),i);
  normal.set([...material.gradient.map(value=>Math.round(Math.max(1,Math.min(255,128+value*1016)))),255],i);
  pixels.set([g.soil,g.exposure,g.flow,g.shelter].map(value=>Math.round(value*255)),(y*PAGE_STRIDE+x)*4);
 }
 return{tx,ty,pixels,color,surface,normal};
}
export class MaterialPageCache{
 constructor(T){this.T=T;this.dirty=new Map();this.uploadTexture=new T.DataTexture(new Uint8Array(4),1,1,T.RGBAFormat);this.uploadPosition=new T.Vector2();this.parentSize={value:new T.Vector2(0,0)};this.pixels=new Uint8Array(ATLAS_WIDTH*ATLAS_HEIGHT*4);this.texture=new T.DataTexture(this.pixels,ATLAS_WIDTH,ATLAS_HEIGHT,T.RGBAFormat);this.texture.minFilter=this.texture.magFilter=T.LinearFilter;this.texture.generateMipmaps=false;this.texture.needsUpdate=true;this.pages=new Map();this.pending=new Set();this.epoch=0;this.clock=0;this.enabled=false;this.worker=null;try{if(typeof Worker!=='undefined')this.worker=new Worker(new URL('./material-page-worker.js?v=terrain-13',import.meta.url),{type:'module'});}catch(error){console.warn('Material pages unavailable; using parent masks.',error.message);}
  if(this.worker){this.worker.onmessage=({data})=>{if(data.epoch!==this.epoch)return;this.pending.delete(data.key);if(data.error){console.warn('Material page failed:',data.error);return;}this.install(data.result);};this.worker.onerror=event=>{console.warn('Material page worker unavailable:',event.message);this.pending.clear();this.worker.terminate();this.worker=null;};}
 }
 reset(data,reference){this.epoch++;this.dirty.clear();this.data=data;this.pages.clear();this.pending.clear();this.previous=null;this.pixels.fill(0);this.enabled=!!data;
  this.parentSize.value.set(data?.width||0,data?.height||0);
  if(data)for(let y=0;y<data.height;y++)this.pixels.set(data.masks.subarray(y*data.width*4,(y+1)*data.width*4),((PARENT_Y+y)*ATLAS_WIDTH+PARENT_X)*4);
  if(reference)for(let y=0;y<reference.size;y++)this.pixels.set(reference.masks.subarray(y*reference.size*4,(y+1)*reference.size*4),((y+REFERENCE_Y)*ATLAS_WIDTH)*4);
  this.worker?.postMessage({epoch:this.epoch,type:'world',data,reference:reference?{size:reference.size,extent:reference.extent,height:reference.height,masks:reference.masks}:null});this.texture.needsUpdate=true;
 }
 install(page){const key=page.tx+','+page.ty;if(this.pages.has(key))return;let slot=this.pages.size;
  if(slot>=CACHE_COLUMNS*CACHE_ROWS){let victim=null;for(const entry of this.pages.values())if(!this.pinned?.has(entry.key)&&(!victim||entry.stamp<victim.stamp))victim=entry;if(!victim)return;slot=victim.slot;this.pages.delete(victim.key);this.queue(new Uint8Array(4),1,1,TABLE_X+victim.tx,TABLE_Y+victim.ty);this.pixels.fill(0,((TABLE_Y+victim.ty)*ATLAS_WIDTH+TABLE_X+victim.tx)*4,((TABLE_Y+victim.ty)*ATLAS_WIDTH+TABLE_X+victim.tx)*4+4);}
  const sx=slot%CACHE_COLUMNS,sy=Math.floor(slot/CACHE_COLUMNS);this.queue(page.pixels,PAGE_STRIDE,PAGE_STRIDE,sx*PAGE_STRIDE,CACHE_Y+sy*PAGE_STRIDE);
  for(let y=0;y<PAGE_STRIDE;y++)this.pixels.set(page.pixels.subarray(y*PAGE_STRIDE*4,(y+1)*PAGE_STRIDE*4),((CACHE_Y+sy*PAGE_STRIDE+y)*ATLAS_WIDTH+sx*PAGE_STRIDE)*4);
  for(const [ox,offset,channel]of [[COLOR_X,COLOR_Y,page.color],[SURFACE_X,SURFACE_Y,page.surface],[NORMAL_X,NORMAL_Y,page.normal]])if(channel)for(let y=0;y<PAGE_STRIDE;y++)this.pixels.set(channel.subarray(y*PAGE_STRIDE*4,(y+1)*PAGE_STRIDE*4),((offset+sy*PAGE_STRIDE+y)*ATLAS_WIDTH+ox+sx*PAGE_STRIDE)*4);
  for(const [ox,oy,channel]of [[COLOR_X,COLOR_Y,page.color],[SURFACE_X,SURFACE_Y,page.surface],[NORMAL_X,NORMAL_Y,page.normal]])if(channel)this.queue(channel,PAGE_STRIDE,PAGE_STRIDE,ox+sx*PAGE_STRIDE,oy+sy*PAGE_STRIDE);
  this.queue(new Uint8Array([sx,sy,0,255]),1,1,TABLE_X+page.tx,TABLE_Y+page.ty);
  this.pixels.set([sx,sy,0,255],((TABLE_Y+page.ty)*ATLAS_WIDTH+TABLE_X+page.tx)*4);this.pages.set(key,{key,tx:page.tx,ty:page.ty,slot,stamp:++this.clock});
 }
 queue(data,width,height,x,y){this.dirty.set(x+','+y,{data,width,height,x,y});}
 flush(renderer){if(!this.dirty.size)return;let bytes=0;for(const block of this.dirty.values()){this.uploadTexture.image={data:block.data,width:block.width,height:block.height};this.uploadPosition.set(block.x,block.y);renderer.copyTextureToTexture(this.uploadTexture,this.texture,null,this.uploadPosition);bytes+=block.data.byteLength;}this.lastUploadBytes=bytes;this.dirty.clear();}
 prefetch(n){if(!this.data||!this.worker)return;const u=.5+Math.atan2(n.x,n.z)/(2*Math.PI),v=.5-Math.asin(Math.max(-1,Math.min(1,n.y)))/Math.PI;let x=Math.floor(u*PAGE_COLUMNS)%PAGE_COLUMNS,y=Math.min(PAGE_ROWS-1,Math.floor(v*PAGE_ROWS));let dx=0,dy=0;
  if(this.previous){let du=u-this.previous.u;if(du>.5)du--;if(du<-.5)du++;dx=Math.sign(du);dy=Math.sign(v-this.previous.v);}this.previous={u,v};const desired=[];
  for(const [ox,oy]of [[0,0],[dx,dy],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const tx=(x+ox+PAGE_COLUMNS)%PAGE_COLUMNS,ty=Math.max(0,Math.min(PAGE_ROWS-1,y+oy)),key=tx+','+ty;if(!desired.some(p=>p.key===key))desired.push({tx,ty,key});}
  this.pinned=new Set(desired.map(p=>p.key));for(const page of desired){const resident=this.pages.get(page.key);if(resident){resident.stamp=++this.clock;continue;}if(this.pending.has(page.key)||this.pending.size>=2)continue;this.pending.add(page.key);this.worker.postMessage({epoch:this.epoch,key:page.key,tx:page.tx,ty:page.ty});}
 }
 state(){return{pages:this.pages.size,limit:CACHE_COLUMNS*CACHE_ROWS,pending:this.pending.size,queuedUploads:this.dirty.size,lastUploadBytes:this.lastUploadBytes||0,gpuBytes:this.pixels.byteLength,virtualResolution:[PAGE_COLUMNS*PAGE_SIZE,PAGE_ROWS*PAGE_SIZE],content:'geology masks, linear albedo, roughness, occlusion, blend height, world-space normal gradients and geological overlays',enabled:this.enabled};}
}
