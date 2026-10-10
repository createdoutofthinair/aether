import assert from 'node:assert/strict';
import {composeRegionalSurface,regionalNoise,materialProfileIndex} from '../dist/regional-material.js';
import {defaults} from '../dist/world.js';
const g={soil:.4,exposure:.65,flow:.6,shelter:.85},n={x:.27,y:.46,z:.846},len=Math.hypot(n.x,n.y,n.z);for(const k of ['x','y','z'])n[k]/=len;
for(const p of [[12.4,-3.6,4.3],[-60.001,20.32,1.6],[0,0,0]]){const value=regionalNoise(p,6);for(let i=0;i<3;i++){const a=[...p],b=[...p],e=.00001;a[i]-=e;b[i]+=e;assert(Math.abs((regionalNoise(b,6)[0]-regionalNoise(a,6)[0])/(2*e)-value[i+1])<.0001,'Noise gradients are analytic derivatives');}}
const profiles=[[{},{}],[{temperature:55,pressure:.3},{waterEnabled:false}],[{activity:.9},{}],[{temperature:-70,pressure:.02},{}],[{pressure:0,temperature:40},{waterEnabled:false,iceEnabled:false}]];
const colors=new Set();
for(let i=0;i<profiles.length;i++){
 const [config,env]=profiles[i],c={...defaults,...config};assert.equal(materialProfileIndex(c,env),i);const m=composeRegionalSurface(g,c,env,n);colors.add(m.color.join(','));assert([...m.color,m.roughness,m.occlusion,m.height,m.decal].every(x=>Number.isFinite(x)&&x>=0&&x<=1));assert(m.gradient.every(x=>Math.abs(x)<.125));assert(Math.abs(m.gradient[0]*n.x+m.gradient[1]*n.y+m.gradient[2]*n.z)<1e-12);
 const tangent=[n.z,0,-n.x],tlen=Math.hypot(...tangent);for(let k=0;k<3;k++)tangent[k]/=tlen;
 const point=sign=>{const p=[n.x,n.y,n.z].map((x,k)=>x+sign*tangent[k]*.001/60000),l=Math.hypot(...p);return{x:p[0]/l,y:p[1]/l,z:p[2]/l};};
 const derivative=(composeRegionalSurface(g,c,env,point(1)).height-composeRegionalSurface(g,c,env,point(-1)).height)/.002;assert(Math.abs(derivative-m.gradient.reduce((v,x,k)=>v+x*tangent[k],0))<.000002,'Baked normal agrees with blended relief derivative');
 const noWater=composeRegionalSurface(g,c,{...env,waterEnabled:false},n);if(i===0)assert(noWater.roughness>m.roughness,'A dry atmosphere cannot create wet sediment');
}
assert.equal(colors.size,5);
console.log('Regional PBR: distinct profiles, analytic relief normals, liquid gating, geological overlays and bounded channels pass');
