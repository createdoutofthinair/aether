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

const varianceBand=new OceanBand(64,23,.2);let previous=0;for(const footprint of [.01,.1,.5,1,2,4,8,16,64,256]){const variance=varianceBand.missingSlopeVariance(footprint);assert(variance>=previous-1e-12);previous=variance;}assert(previous>0);
varianceBand.evaluate(0);varianceBand.foam.fill(.4);const foam=varianceBand.evaluate(1/15);assert(foam.filter((_,i)=>i%4===3).every(v=>v>=.4*Math.exp(-1/45)-1e-6&&v<=1));
console.log('Ocean slope variance: monotonic unresolved energy; foam: bounded persistence/decay pass');
const {deformationJacobian,advectFoam}=await import('../dist/ocean-spectrum.js');
assert.equal(deformationJacobian(0,0,0,0),1);assert.equal(deformationJacobian(-.5,0,0,-.5),.25);assert(Math.abs(deformationJacobian(-1.1,0,0,0)+.1)<1e-12);
const field=new Float32Array(8*8);field[3*8+7]=1;const vx=new Float32Array(64).fill(1),vz=new Float32Array(64),transport=advectFoam(field,vx,vz,8,1,1);assert(Math.abs(transport[3*8]-Math.exp(-1/3))<1e-7,'Foam wraps across periodic edges');assert.equal(transport.filter(x=>x>0).length,1);
const diagonal=advectFoam(new Float32Array(64).fill(.4),vx,new Float32Array(64).fill(-.3),8,.5,.2);assert(diagonal.every(x=>Math.abs(x-.4*Math.exp(-.2/3))<1e-7),'Uniform foam decays without transport artifacts');
const chop=new OceanBand(64,23,.2);chop.evaluate(0);assert(Math.max(...chop.dxi.map(Math.abs))<1e-8);assert(Math.max(...chop.dzi.map(Math.abs))<1e-8);assert(chop.chop.some((x,i)=>i%4<2&&Math.abs(x)>.01));let compression=0;for(let i=2;i<chop.chop.length;i+=4)compression=Math.max(compression,1-chop.chop[i]);assert(compression>.05,'Horizontal displacement produces measurable convergence');
for(let t=1;t<=30;t++)chop.evaluate(t/15);assert(chop.foam.some(x=>x>0),'Compression generates persistent foam');assert(chop.foam.every(x=>x>=0&&x<=1));assert(chop.output.every(Number.isFinite));chop.evaluate(-1);assert(chop.foam.every(x=>x===0),'Rewinding resets foam history');
console.log('Ocean deformation: real horizontal fields, compression Jacobian, periodic transport, bounded foam and rewind isolation pass');
const T=await import('../dist/vendor/three.module.js'),{createOceanSpectrum}=await import('../dist/ocean-spectrum.js'),spectrum=createOceanSpectrum(T);spectrum.update(0);const expected=spectrum.uniforms.chopNext0.value.image.data.slice(),expectedWave=spectrum.uniforms.waveNext0.value.image.data.slice();spectrum.update(1/15);assert.deepEqual(spectrum.uniforms.chop0.value.image.data,expected);assert.deepEqual(spectrum.uniforms.wave0.value.image.data,expectedWave);spectrum.update(4);for(let i=0;i<3;i++)for(const prefix of ['wave','waveNext','chop','chopNext'])assert(spectrum.uniforms[prefix+i].value.image.data.every(Number.isFinite));assert.equal(spectrum.state().textures,12);console.log('Ocean texture scheduling: current/next displacement and foam stay synchronized, including skipped ticks pass');
