import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {MaterialPageCache,composeMaterialPage,PAGE_STRIDE,PAGE_SIZE,ATLAS_WIDTH,ATLAS_HEIGHT,COLOR_X,COLOR_Y,SURFACE_X,SURFACE_Y,NORMAL_X,NORMAL_Y,TABLE_X,TABLE_Y,PARENT_X,PARENT_Y,CACHE_COLUMNS,CACHE_ROWS,PAGE_COLUMNS,PAGE_ROWS,composeRegionalSurface} from '../dist/material-pages.js';
import {generatePlanetData} from '../dist/planet-data.js';
import {defaults,environment} from '../dist/world.js';
const data=generatePlanetData(defaults,environment,n=>n.x*900+n.y*300,{width:32,height:17,passes:2});
const a=composeMaterialPage(data,0,PAGE_ROWS/2),b=composeMaterialPage(data,1,PAGE_ROWS/2),last=composeMaterialPage(data,PAGE_COLUMNS-1,PAGE_ROWS/2);
for(let y=0;y<PAGE_STRIDE;y++)for(let c=0;c<4;c++){
 assert.equal(a.pixels[(y*PAGE_STRIDE+PAGE_SIZE+1)*4+c],b.pixels[(y*PAGE_STRIDE+1)*4+c],'Adjacent page halos share identical world samples');
 assert.equal(last.pixels[(y*PAGE_STRIDE+PAGE_SIZE+1)*4+c],a.pixels[(y*PAGE_STRIDE+1)*4+c],'Longitude page seam');
}
for(const channel of ['color','surface','normal'])for(let y=0;y<PAGE_STRIDE;y++)for(let c=0;c<4;c++)assert.equal(a[channel][(y*PAGE_STRIDE+PAGE_SIZE+1)*4+c],b[channel][(y*PAGE_STRIDE+1)*4+c]);
const dry=composeRegionalSurface({soil:1,exposure:0,flow:0,shelter:1},defaults),wet=composeRegionalSurface({soil:1,exposure:0,flow:1,shelter:1},defaults);assert(wet.roughness<dry.roughness);assert(wet.color.every((v,i)=>v<dry.color[i]));
const cache=new MaterialPageCache(T);cache.reset(data,null);cache.install(a);assert.deepEqual([...cache.pixels.slice((COLOR_Y*ATLAS_WIDTH+COLOR_X)*4,(COLOR_Y*ATLAS_WIDTH+COLOR_X)*4+4)],[...a.color.slice(0,4)]);assert.deepEqual([...cache.pixels.slice((SURFACE_Y*ATLAS_WIDTH+SURFACE_X)*4,(SURFACE_Y*ATLAS_WIDTH+SURFACE_X)*4+4)],[...a.surface.slice(0,4)]);cache.reset(data,null);for(let i=0;i<40;i++)cache.install({tx:i%16,ty:Math.floor(i/16),pixels:a.pixels,color:a.color,surface:a.surface,normal:a.normal});assert.equal(cache.pages.size,CACHE_COLUMNS*CACHE_ROWS);assert.equal(cache.pixels[TABLE_X*4+3],0,'Evicted page mapping is invalidated');
for(const page of cache.pages.values()){const k=((TABLE_Y+page.ty)*ATLAS_WIDTH+TABLE_X+page.tx)*4;assert.equal(cache.pixels[k+3],255);assert.equal(cache.pixels[k]+CACHE_COLUMNS*cache.pixels[k+1],page.slot);}
cache.reset({...data,key:'new'},null);assert.equal(cache.pages.size,0);assert(cache.pixels.slice(513*ATLAS_WIDTH*4).every(x=>x===0));assert.deepEqual([...cache.pixels.slice(PARENT_X*4,PARENT_X*4+data.width*4)],[...data.masks.slice(0,data.width*4)]);assert.equal(cache.state().gpuBytes,ATLAS_WIDTH*ATLAS_HEIGHT*4);
console.log('Material pages: shared halos, longitude continuity, bounded residency, eviction invalidation and world reset pass');

assert(ATLAS_WIDTH<=2048&&ATLAS_HEIGHT<=2048,'Atlas fits WebGL2 minimum maximum texture dimensions');
const rects=[[0,0,513,513],[TABLE_X,TABLE_Y,PAGE_COLUMNS,PAGE_ROWS],[PARENT_X,PARENT_Y,256,129],[0,513,780,650],[COLOR_X,COLOR_Y,780,650],[SURFACE_X,SURFACE_Y,780,650],[NORMAL_X,NORMAL_Y,780,650]];
for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const [x,y,w,h]=rects[i],[a,b,c,d]=rects[j];assert(x+w<=a||a+c<=x||y+h<=b||b+d<=y,'Atlas banks do not overlap');}
cache.reset(data,null);const textureVersion=cache.texture.version;cache.install(a);assert.equal(cache.texture.version,textureVersion,'Page arrival avoids a full atlas upload');let calls=0,bytes=0;const uploaded=new Uint8Array(cache.pixels.length);
cache.flush({copyTextureToTexture(source,destination,region,position){calls++;bytes+=source.image.data.byteLength;assert.equal(destination,cache.texture);for(let y=0;y<source.image.height;y++)uploaded.set(source.image.data.subarray(y*source.image.width*4,(y+1)*source.image.width*4),((position.y+y)*ATLAS_WIDTH+position.x)*4);}});
assert.equal(calls,5);assert.equal(bytes,4*PAGE_STRIDE*PAGE_STRIDE*4+4);assert(bytes<cache.pixels.byteLength/20);assert.equal(cache.dirty.size,0);const resident=cache.pages.values().next().value;assert.equal(uploaded[((TABLE_Y+resident.ty)*ATLAS_WIDTH+TABLE_X+resident.tx)*4+3],255);
console.log('Material uploads: four page rectangles and one mapping, with no full-atlas page refresh pass');
const landingLength=Math.hypot(.27,.46,.846),direction={x:.27/landingLength,y:.46/landingLength,z:.846/landingLength},u=.5+Math.atan2(direction.x,direction.z)/(2*Math.PI),v=.5-Math.asin(direction.y)/Math.PI,tx=Math.floor(u*PAGE_COLUMNS),ty=Math.floor(v*PAGE_ROWS),reference={size:2,extent:8192,height:new Float32Array(4),masks:new Uint8Array([255,0,0,255,255,0,0,255,255,0,0,255,255,0,0,255])};
const localPage=composeMaterialPage(data,tx,ty,reference),ix=Math.floor((u*PAGE_COLUMNS-tx)*PAGE_SIZE)+1,iy=Math.floor((v*PAGE_ROWS-ty)*PAGE_SIZE)+1,index=(iy*PAGE_STRIDE+ix)*4;assert.deepEqual([...localPage.color.slice(index,index+3)],[.43,.33,.22].map(x=>Math.round(x*255)),'Reference-region masks participate in baked PBR composition');
console.log('Material composition: local eroded reference masks participate alongside the planetary parent pass');
