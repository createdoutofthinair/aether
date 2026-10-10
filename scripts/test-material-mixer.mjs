import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {materialCatalog,defaultRecipe,validateRecipe} from '../dist/material-mixer.js';
for(const m of materialCatalog.filter(m=>m.base))for(const suffix of ['_diff.jpg','_nor_gl.jpg','_surface.png'])assert(existsSync(new URL('../dist/'+m.base+suffix,import.meta.url)),m.id+' source map missing');
const input=defaultRecipe(),valid=validateRecipe(JSON.parse(JSON.stringify(input)));assert.deepEqual(valid,input);valid.layers[0].weight=0;assert.equal(input.layers[0].weight,65,'Imported recipes must not alias stored recipes');
for(const mutate of [r=>r.layers.forEach(l=>l.weight=0),r=>r.layers[0].material='unknown',r=>r.layers[0].scale=0,r=>r.layers[1].weight=NaN,r=>r.heightBlend=2,r=>r.tint='url(x)',r=>r.layers.pop(),r=>r.version=2]){const r=defaultRecipe();mutate(r);assert.throws(()=>validateRecipe(r));}
const single=defaultRecipe();single.layers.forEach((l,i)=>l.weight=i===0?100:0);assert.doesNotThrow(()=>validateRecipe(single));
console.log('Bundled material maps, recipe roundtrip, isolated imports, zero weights and malformed recipe rejection: pass');
