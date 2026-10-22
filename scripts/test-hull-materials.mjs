import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as T from 'three/webgpu';
import {PRESETS,recipe,bakeSurface,filteredMips} from '../dist/hull/surface.js';
import {hullMaterial,metricUV} from '../dist/hull/material.js';
const fingerprint=maps=>Buffer.from(maps.color).toString('base64');
const seen=new Set();
for(const preset of Object.keys(PRESETS))for(let seed=0;seed<8;seed++){
 const r=recipe({preset,seed:String(seed)}),a=bakeSurface(r,64),b=bakeSurface(JSON.parse(JSON.stringify(r)),64);
 assert.deepEqual(a,b,'Exported recipes must reconstruct every material channel');seen.add(fingerprint(a));
 assert.equal(a.color.length,64*64*4);let coated=0,metal=0;
 for(let i=0;i<a.color.length;i+=4){assert.equal(a.color[i+3],255);assert.ok(a.surface[i+1]>=45);if(a.masks[i]===255){coated++;assert.equal(a.surface[i+2],0,'Paint is dielectric');}if(a.surface[i+2]>200)metal++;
 const len=Math.hypot(...Array.from(a.normal.slice(i,i+3),v=>v/127.5-1));assert.ok(Math.abs(len-1)<.025,'Tangent normals must remain unit length');}
 if(preset==='armor')assert.ok(coated>0);if(preset==='alloy'||preset==='insulation')assert.ok(metal>0);
 const levels=filteredMips(a);assert.equal(levels.length,7);assert.equal(levels.at(-1).width,1);for(const l of levels)for(const k of ['color','normal','surface','masks'])assert.equal(l[k].length,l.width*l.height*4);
}
assert.equal(seen.size,40,'Every preset / seed pair must differ');
const clean=bakeSurface({seed:'history',wear:0,environment:'factory'},128),worn=bakeSurface({seed:'history',wear:1,environment:'combat'},128);assert.notDeepEqual(clean.surface,worn.surface);assert.notDeepEqual(clean.masks,worn.masks);
const map=(rgba)=>({width:1,height:1,data:Uint8Array.from(rgba)}),plain=bakeSurface({bitmapMix:0},64),hybrid=bakeSurface({bitmapMix:1},64,{color:map([100,50,25,255]),roughness:map([200,0,0,255]),metallic:map([0,0,0,255]),normal:map([128,128,255,255])});
for(let i=0;i<hybrid.color.length;i+=4){assert.deepEqual([...hybrid.color.slice(i,i+3)],[100,50,25]);assert.equal(hybrid.surface[i+1],200);assert.equal(hybrid.surface[i+2],0);}
const masked=bakeSurface({bitmapMix:1},64,{color:map([255,0,0,255]),mask:map([0,0,0,255])});assert.deepEqual(masked.color,plain.color,'Bitmap mask must cover all imported channels consistently');
const heightBitmap={width:2,height:2,data:Uint8Array.from([0,0,0,255,255,255,255,255,0,0,0,255,255,255,255,255])};assert.notDeepEqual(bakeSurface({bitmapMix:1},64,{height:heightBitmap}).normal,plain.normal,'Imported height contributes actual normal relief');
assert.throws(()=>bakeSurface({},64,{color:{width:1024,height:1,data:new Uint8Array(4)}}),/Invalid bitmap/);
const norm=bakeSurface({},32);for(let i=0;i<norm.normal.length;i+=4)norm.normal.set([i%8===0?255:0,128,128,255],i);const mips=filteredMips(norm);assert.ok(mips[1].surface[1]>norm.surface[1],'Unresolved normal variance increases roughness');
const mat=hullMaterial(plain);assert.equal(mat.metalness,1);assert.equal(mat.map.colorSpace,T.SRGBColorSpace);assert.equal(mat.normalMap.colorSpace,T.NoColorSpace);assert.equal(mat.roughnessMap,mat.metalnessMap);assert.equal(mat.map.generateMipmaps,false);assert.equal(mat.map.mipmaps.at(-1).width,1);assert.equal(mat.transparent,false);
let disposed=0;for(const t of mat.userData.textures)t.addEventListener('dispose',()=>disposed++);mat.dispose();assert.equal(disposed,4,'Material disposal must release every GPU texture');
const g=metricUV(new T.CylinderGeometry(1,1,4,16),2);assert.ok(Math.abs(Math.max(...Array.from({length:g.attributes.uv.count},(_,i)=>g.attributes.uv.getX(i)))-Math.PI)<1e-5);assert.deepEqual(g.attributes.uv1.array,g.attributes.uv.array);g.dispose();
const r=recipe({roughness:NaN,paint:'<bad>',panels:999,environment:'unknown',seed:123});assert.equal(r.roughness,.48);assert.equal(r.panels,12);assert.equal(r.seed,'123');assert.equal(r.environment,'deep-space');assert.equal(r.paint,PRESETS.armor.paint);
// Static deployed dependencies (including worker URLs and the new addon) resolve.
for(const file of ['hull/editor.js','hull/material.js','hull/worker.js','hull/applied.js']){const source=readFileSync('dist/'+file,'utf8');for(const m of source.matchAll(/(?:from\s*|new URL\s*\()(['"])(\.[^'"]+)\1/g)){const url=new URL(m[2],new URL(file,'file:///dist/'));assert.ok(existsSync('.'+url.pathname),url.pathname);}}
assert.ok(existsSync('dist/vendor-gpu/addons/geometries/RoundedBoxGeometry.js'));
console.log('Hull materials: 40 deterministic preset/seed pairs, PBR channel coherence, service wear, hybrid bitmap masking, RNM, height relief, filtered mip variance, metre UVs, GPU disposal and deployed module paths passed.');
