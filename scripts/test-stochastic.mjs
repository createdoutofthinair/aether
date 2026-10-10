import assert from 'node:assert/strict';
import {gaussianize} from '../dist/stochastic-material.js';
let seed=31;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pixels=new Uint8Array(65536*4);for(let i=0;i<pixels.length;i+=4){const value=Math.floor(random()*256);pixels.set([value,value,value,255],i);}
const {encoded,inverse}=gaussianize(pixels),linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
const reconstruct=g=>{const f=Math.max(0,Math.min(255,g*255)),i=Math.floor(f),t=f-i;return inverse[i*4]*(1-t)+inverse[Math.min(255,i+1)*4]*t;};
let error=0;const source=[],ordinary=[],preserved=[];for(let i=0;i<65536;i++){const c=linear(pixels[i*4]/255);error+=(reconstruct(encoded[i*4]/255)-c)**2;source.push(c);}
assert(Math.sqrt(error/65536)<.015,'Inverse histogram reconstructs the scanned color');
for(let i=0;i<20000;i++){let g=0,c=0;for(let j=0;j<3;j++){const k=Math.floor(random()*65536);g+=encoded[k*4]/255/3;c+=linear(pixels[k*4]/255)/3;}ordinary.push(c);preserved.push(reconstruct(.5+(g-.5)*Math.sqrt(3)));}
const std=a=>{const m=a.reduce((a,b)=>a+b)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length);};const actual=std(source),plain=std(ordinary),fixed=std(preserved);assert(Math.abs(fixed-actual)<Math.abs(plain-actual)*.25,'Random blending preserves contrast substantially better than ordinary averaging');
console.log(JSON.stringify({sourceContrast:actual,ordinaryBlend:plain,preservedBlend:fixed,reconstructionRMSE:Math.sqrt(error/65536)}));
