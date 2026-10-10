import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {materialCatalog,defaultRecipe,validateRecipe} from '../dist/material-mixer.js';
for(const m of materialCatalog.filter(m=>m.base))for(const suffix of ['_diff.jpg','_nor_gl.jpg','_surface.png'])assert(existsSync(new URL('../dist/'+m.base+suffix,import.meta.url)),m.id+' source map missing');
const input=defaultRecipe(),valid=validateRecipe(JSON.parse(JSON.stringify(input)));assert.deepEqual(valid,input);valid.layers[0].weight=0;assert.equal(input.layers[0].weight,100,'Imported recipes must not alias stored recipes');
for(const mutate of [r=>r.layers.forEach(l=>l.weight=0),r=>r.layers[0].material='unknown',r=>r.layers[0].scale=0,r=>r.layers[1].weight=NaN,r=>r.heightBlend=2,r=>r.tint='url(x)',r=>r.layers.pop(),r=>r.version=3]){const r=defaultRecipe();mutate(r);assert.throws(()=>validateRecipe(r));}
const single=defaultRecipe();single.layers.forEach((l,i)=>l.weight=i===0?100:0);assert.doesNotThrow(()=>validateRecipe(single));
console.log('Bundled material maps, recipe roundtrip, isolated imports, zero weights and malformed recipe rejection: pass');

const legacy={version:1,name:'Old mix',layers:[{material:'rock',weight:65,scale:2},{material:'sand',weight:25,scale:2},{material:'mud',weight:10,scale:2}],heightBlend:.35,normalStrength:1,roughness:1,tint:'#ffffff'};
const upgraded=validateRecipe(legacy);assert.equal(upgraded.mode,'weighted');assert.equal(upgraded.version,2);assert.deepEqual(upgraded.layers.map(l=>l.weight),[65,25,10]);assert(upgraded.layers.every(l=>l.mask.type==='uniform'));
for(const mutate of [r=>r.layers[1].mask.type='invalid',r=>r.layers[1].mask.softness=0,r=>r.layers[1].mask.seed=Infinity,r=>r.mode='invalid']){const r=defaultRecipe();mutate(r);assert.throws(()=>validateRecipe(r));}
