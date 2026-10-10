import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {MaterialPageCache,composeMaterialPage,PAGE_STRIDE,PAGE_SIZE,ATLAS_WIDTH} from '../dist/material-pages.js';
import {generatePlanetData} from '../dist/planet-data.js';
import {defaults,environment} from '../dist/world.js';
const data=generatePlanetData(defaults,environment,n=>n.x*900+n.y*300,{width:32,height:17,passes:2});
const a=composeMaterialPage(data,0,3),b=composeMaterialPage(data,1,3),last=composeMaterialPage(data,15,3);
for(let y=0;y<PAGE_STRIDE;y++)for(let c=0;c<4;c++){
 assert.equal(a.pixels[(y*PAGE_STRIDE+PAGE_SIZE+1)*4+c],b.pixels[(y*PAGE_STRIDE+1)*4+c],'Adjacent page halos share identical world samples');
 assert.equal(last.pixels[(y*PAGE_STRIDE+PAGE_SIZE+1)*4+c],a.pixels[(y*PAGE_STRIDE+1)*4+c],'Longitude page seam');
}
const cache=new MaterialPageCache(T);cache.reset(data,null);for(let i=0;i<40;i++)cache.install({tx:i%16,ty:Math.floor(i/16),pixels:a.pixels});assert.equal(cache.pages.size,32);assert.equal(cache.pixels[3],0,'Evicted page mapping is invalidated');
for(const page of cache.pages.values()){const k=(page.ty*ATLAS_WIDTH+page.tx)*4;assert.equal(cache.pixels[k+3],255);assert.equal(cache.pixels[k]+8*cache.pixels[k+1],page.slot);}
cache.reset({...data,key:'new'},null);assert.equal(cache.pages.size,0);assert(cache.pixels.every(x=>x===0));assert.equal(cache.state().gpuBytes,1040*1041*4);
console.log('Material pages: shared halos, longitude continuity, bounded residency, eviction invalidation and world reset pass');
