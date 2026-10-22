import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OCT_GRID,octDirection,octEncode,octFrames,captureBasis,reprojectPoint} from '../dist/forest/octahedral.js';
import {advanceLOD,lodVisibility,snappedShadowAnchor,LOD_FADE_SECONDS} from '../dist/forest/lod-policy.js';
for(let x=0;x<OCT_GRID;x++)for(let y=0;y<OCT_GRID;y++){const d=octDirection(x,y),p=octEncode(d),b=captureBasis(d);assert.ok(Math.abs(Math.hypot(...d)-1)<1e-10);assert.ok(d[1]>=0);assert.ok(Math.abs(p[0]-x)<1e-10&&Math.abs(p[1]-y)<1e-10);for(const a of [b.right,b.up]){assert.ok(Math.abs(Math.hypot(...a)-1)<1e-10);assert.ok(Math.abs(a.reduce((s,v,i)=>s+v*d[i],0))<1e-10);}}
for(let i=0;i<1000;i++){const d=[Math.sin(i*.3),Math.abs(Math.sin(i*.13)),Math.cos(i*.3)],f=octFrames(d);assert.ok(f.weights.every(w=>w>=-1e-12));assert.ok(Math.abs(f.weights.reduce((a,b)=>a+b,0)-1)<1e-10);assert.ok(f.frames.flat().every(v=>v>=0&&v<OCT_GRID));}
const projected=reprojectPoint([.5,.2,0],[0,0,1],[0,0,1],-.4);assert.deepEqual(projected.point,[.5,.2,.4]);assert.equal(projected.distance,-.4);const oblique=reprojectPoint([.5,.2,0],[0,0,1],[.6,0,.8],-.4);assert.ok(Math.abs(.6*oblique.point[0]+.8*oblique.point[2]-.4)<1e-12);
for(let blend=0;blend<=1;blend+=.01)for(let pixel=0;pixel<100;pixel++){const threshold=pixel/100+.0001;assert.notEqual(lodVisibility(threshold,blend),lodVisibility(threshold,1-blend,true),'Outgoing and incoming screen masks must be exact complements');}
const t={lod:-1};assert.equal(advanceLOD(t,2,0),1);advanceLOD(t,3,.01);advanceLOD(t,2,.11);advanceLOD(t,3,.21);assert.equal(t.lod,2,'Demand jitter must not start transitions');advanceLOD(t,3,.45);assert.equal(t.lod,3);assert.equal(t.from,2);assert.ok(advanceLOD(t,2,.65)>0&&advanceLOD(t,2,.65)<1);assert.equal(t.lod,3,'Do not reverse a running crossfade');assert.equal(advanceLOD(t,3,.45+LOD_FADE_SECONDS),1);
const anchor=snappedShadowAnchor([10,2,3],[50,80,30]);assert.deepEqual(anchor,snappedShadowAnchor([10,2,3],[50,80,30]));assert.ok(anchor.every(Number.isFinite));const d=[50,80,30],n=Math.hypot(...d),right=[d[2],0,-d[0]],rl=Math.hypot(...right);for(let i=0;i<3;i++)right[i]/=rl;const target=anchor.reduce((s,v,i)=>s+v*right[i],0)/(60/2048);assert.ok(Math.abs(target-Math.round(target))<1e-9,'Shadow anchor lies on light-space texel grid');
const source=readFileSync('dist/forest/main.js','utf8');assert.ok(source.includes('mesh.layers.set(1)'));assert.ok(source.includes('light.shadow.camera.layers.set(1)'));assert.ok(source.includes('b.castShadow=l.castShadow=false'));const shader=readFileSync('dist/forest/impostor.js','utf8');assert.ok(shader.includes('cameraWorldMatrix'));assert.ok(shader.includes('m.vertexNode='));assert.ok(shader.includes('depth.mul(parallax)'));
console.log('Forest stability: hemi-octahedral directions, 3-view weights, pole bases, depth-ray reprojection, complementary coverage, dwell/locked LOD transitions, snapped shadow coordinates and LOD-independent shadow layers passed.');

// Sparse silhouettes must retain coverage at equal view weights, including
// when a leaf exists in just one capture. No discontinuity at a zero weight.
const silhouette=(alpha,w)=>Math.max(...alpha.map((a,i)=>a*w[i]))/Math.max(...w);
assert.equal(silhouette([1,0,0],[1/3,1/3,1/3]),1);
assert.equal(silhouette([.3,.3,.3],[.2,.3,.5]),.3);
assert.equal(silhouette([1,0,0],[0,.5,.5]),0);
assert.ok(silhouette([1,0,0],[.00001,.5,.49999])<.0001);
assert.ok(shader.includes('generateMipmaps:false'));
assert.ok(shader.includes('useWarp.select(warped,c0.mul(baseValid))'));
assert.ok(shader.includes('t:useWarp.select(t,t0)'));
assert.ok(shader.includes('alphaTest:.01'));

const {validateAtlasCoverage}=await import('../dist/forest/octahedral.js');
const tile=2,side=tile*OCT_GRID,pixels=new Uint8Array(side*side*4);
for(let row=0;row<OCT_GRID;row++)for(let col=0;col<OCT_GRID;col++)pixels[((row*tile)*side+col*tile)*4+3]=255;
assert.deepEqual(validateAtlasCoverage(pixels,tile),Array(25).fill(.25));
pixels[((4*tile)*side+4*tile)*4+3]=0;
assert.throws(()=>validateAtlasCoverage(pixels,tile),/Empty forest atlas capture 4,4/);
assert.throws(()=>validateAtlasCoverage(pixels.subarray(4),tile),/Incomplete/);
assert.ok(shader.includes('depth.div(coverage).mul(parallax).mul(rayZ)'),'Disabling parallax must also disable capture depth');
assert.ok(shader.includes('add(.5),uv())'),'Disabling parallax uses billboard UVs');
