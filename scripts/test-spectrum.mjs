import assert from 'node:assert/strict';
import {fft,OceanBand} from '../dist/ocean-spectrum.js';
const a=Float64Array.from([1,2,3,4,5,6,7,8]),b=new Float64Array(8),copy=a.slice();fft(a,b);fft(a,b,true);for(let i=0;i<8;i++)assert(Math.abs(a[i]-copy[i])<1e-10);
for(const length of [768,137,23]){
 const band=new OceanBand(64,length,.2),other=new OceanBand(64,length,.2);
 const first=band.evaluate(0).slice();assert.deepEqual(first,other.evaluate(0));
 const later=band.evaluate(1).slice();assert(later.some((v,i)=>Math.abs(v-first[i])>.001),'Spectrum must evolve');
 assert(later.every(Number.isFinite));
 const heights=band.real,mean=heights.reduce((a,b)=>a+b,0)/heights.length,rms=Math.sqrt(heights.reduce((a,b)=>a+b*b,0)/heights.length);
 assert(Math.abs(mean)<1e-8,'No sea-level drift');assert(rms>.05&&rms<.5,'Bounded wave energy');
 assert(Math.max(...band.imag.map(Math.abs))<1e-8,'Hermitian spectrum must produce real heights');
}
console.log('FFT roundtrip, deterministic waves, real-valued output, wave energy and mean sea level: pass');
