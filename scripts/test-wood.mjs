import assert from 'node:assert/strict';
import {woodHeight,bakeWood} from '../dist/nature/wood-model.js';
for(const type of ['oak','pine','birch','cut']){
 const options={type,seed:481,size:64,fissures:.7,grain:1,weather:.3},a=bakeWood(options),b=bakeWood(options);
 for(const channel of ['color','normal','packed']){assert.deepEqual(new Uint8Array(a[channel]),new Uint8Array(b[channel]));assert.equal(a[channel].byteLength,64*64*4);}
 const normal=new Uint8Array(a.normal),packed=new Uint8Array(a.packed);
 for(let i=0;i<normal.length;i+=4){const n=Array.from(normal.slice(i,i+3),v=>v/127.5-1);assert(Math.abs(Math.hypot(...n)-1)<.025);assert(packed[i+1]>=100&&packed[i+1]<=250);}
 assert.notDeepEqual(new Uint8Array(a.color),new Uint8Array(bakeWood({...options,seed:99}).color));
 if(type!=='cut')for(const t of [.1,.4,.75]){assert(Math.abs(woodHeight(0,t,options)-woodHeight(1,t,options))<1e-10);assert(Math.abs(woodHeight(t,0,options)-woodHeight(t,1,options))<1e-10);}
}
assert.notDeepEqual(new Uint8Array(bakeWood({size:32,fissures:0}).packed),new Uint8Array(bakeWood({size:32,fissures:1}).packed));
console.log('Wood: repeatability, seed variation, seamless bark field, normalized normals and fissure response passed');
