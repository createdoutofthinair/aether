import assert from 'node:assert/strict';
import {normalMomentMipmaps} from '../dist/normal-moments.js';
const flat=new Uint8Array(4*4*4);for(let k=0;k<16;k++)flat.set([128,128,255,255],k*4);
const f=normalMomentMipmaps(flat,4,4);assert.equal(f.length,3);assert(f.every(l=>l.data.filter((_,k)=>k%4===3).every(a=>a===0)));
const alternating=flat.slice();for(let k=0;k<16;k++)alternating.set([k%2?192:63,128,238,255],k*4);
const m=normalMomentMipmaps(alternating,4,4);assert.equal(m[0].data[3],0);assert(m[1].data[3]>30,'Unresolved opposing slopes must broaden highlights');assert(Math.abs(m[2].data[0]-128)<=1);assert.equal(m[2].data[3],m[1].data[3],'Variance survives coarser filtering');
console.log('Normal moments: flat surfaces, opposing slopes, variance persistence and mean normal pass');
