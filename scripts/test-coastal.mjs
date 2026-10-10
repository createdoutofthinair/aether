import assert from 'node:assert/strict';
import {encodeCoast,coastalWash,COAST_SIZE,COAST_X,COAST_Y} from '../dist/coastal.js';
import {ATLAS_WIDTH,ATLAS_HEIGHT,PARENT_X,TABLE_X,MaterialPageCache} from '../dist/material-pages.js';
import * as T from '../dist/vendor/three.module.js';
const size=32,step=4,h=Float32Array.from({length:size*size},(_,i)=>(i%size-15.5)*step*.1),field=encodeCoast(h,size,step);
assert.equal(field.crossings,size);
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const i=y*size+x,v=(field.pixels[i*4]*256+field.pixels[i*4+1])/65535*128-64;
 assert(Math.abs(v-h[i])<.0011);
 assert(Math.abs(field.distance[i]-Math.abs(x-15.5)*step)<1e-4);
}
assert.equal(encodeCoast(new Float32Array(1024).fill(2),32).crossings,0);
assert(COAST_X+COAST_SIZE<=ATLAS_WIDTH&&COAST_Y+COAST_SIZE<=ATLAS_HEIGHT);
assert(COAST_X>=PARENT_X+256&&COAST_X>=TABLE_X+512);
let wet=0,dry=0;for(let t=0;t<30;t+=.02){const a=coastalWash(0,t),b=coastalWash(0,t+Math.PI*2/.8);assert(Math.abs(a.level-b.level)<1e-12);assert(a.wetness>=0&&a.wetness<=1);assert(Math.abs(a.level)<=.88);if(a.level>.4)wet++;if(a.level<0)dry++;}
assert(wet&&dry);assert(coastalWash(0,Math.PI/2/.8+.5).wetness>coastalWash(0,Math.PI/2/.8+3).wetness);
const cache=new MaterialPageCache(T),version=cache.texture.version;cache.installRegion(field.pixels,size,size,COAST_X,COAST_Y);assert.equal(cache.texture.version,version);let uploads=0;cache.flush({copyTextureToTexture(src,dst,rect,pos){uploads++;assert.equal(src.image.data.byteLength,size*size*4);assert.equal(pos.x,COAST_X);assert.equal(pos.y,COAST_Y);}});assert.equal(uploads,1);for(let y=0;y<size;y++)assert.deepEqual(cache.pixels.slice(((COAST_Y+y)*ATLAS_WIDTH+COAST_X)*4,((COAST_Y+y)*ATLAS_WIDTH+COAST_X+size)*4),field.pixels.slice(y*size*4,(y+1)*size*4));cache.reset(null,null);assert(cache.pixels.every(x=>x===0));
console.log('Coastal bathymetry, signed distance, atlas allocation, advancing/receding wash and drying passed');
