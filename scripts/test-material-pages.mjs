import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {MaterialPageCache,composeMaterialPage,PAGE_STRIDE,PAGE_SIZE,ATLAS_WIDTH,ATLAS_HEIGHT,COLOR_Y,SURFACE_Y,composeRegionalSurface} from '../dist/material-pages.js';
import {generatePlanetData} from '../dist/planet-data.js';
import {defaults,environment} from '../dist/world.js';
const data=generatePlanetData(defaults,environment,n=>n.x*900+n.y*300,{width:32,height:17,passes:2});
const a=composeMaterialPage(data,0,3),b=composeMaterialPage(data,1,3),last=composeMaterialPage(data,15,3);
for(let y=0;y<PAGE_STRIDE;y++)for(let c=0;c<4;c++){
 assert.equal(a.pixels[(y*PAGE_STRIDE+PAGE_SIZE+1)*4+c],b.pixels[(y*PAGE_STRIDE+1)*4+c],'Adjacent page halos share identical world samples');
 assert.equal(last.pixels[(y*PAGE_STRIDE+PAGE_SIZE+1)*4+c],a.pixels[(y*PAGE_STRIDE+1)*4+c],'Longitude page seam');
}
for(const channel of ['color','surface'])for(let y=0;y<PAGE_STRIDE;y++)for(let c=0;c<4;c++)assert.equal(a[channel][(y*PAGE_STRIDE+PAGE_SIZE+1)*4+c],b[channel][(y*PAGE_STRIDE+1)*4+c]);
const dry=composeRegionalSurface({soil:1,exposure:0,flow:0,shelter:1},defaults),wet=composeRegionalSurface({soil:1,exposure:0,flow:1,shelter:1},defaults);assert(wet.roughness<dry.roughness);assert(wet.color.every((v,i)=>v<dry.color[i]));
const cache=new MaterialPageCache(T);cache.reset(data,null);cache.install(a);assert.deepEqual([...cache.pixels.slice(COLOR_Y*ATLAS_WIDTH*4,COLOR_Y*ATLAS_WIDTH*4+4)],[...a.color.slice(0,4)]);assert.deepEqual([...cache.pixels.slice(SURFACE_Y*ATLAS_WIDTH*4,SURFACE_Y*ATLAS_WIDTH*4+4)],[...a.surface.slice(0,4)]);cache.reset(data,null);for(let i=0;i<40;i++)cache.install({tx:i%16,ty:Math.floor(i/16),pixels:a.pixels,color:a.color,surface:a.surface});assert.equal(cache.pages.size,32);assert.equal(cache.pixels[3],0,'Evicted page mapping is invalidated');
for(const page of cache.pages.values()){const k=(page.ty*ATLAS_WIDTH+page.tx)*4;assert.equal(cache.pixels[k+3],255);assert.equal(cache.pixels[k]+8*cache.pixels[k+1],page.slot);}
cache.reset({...data,key:'new'},null);assert.equal(cache.pages.size,0);assert(cache.pixels.every(x=>x===0));assert.equal(cache.state().gpuBytes,1040*ATLAS_HEIGHT*4);
console.log('Material pages: shared halos, longitude continuity, bounded residency, eviction invalidation and world reset pass');
