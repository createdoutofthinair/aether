import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {buildingMaterialPreset,buildingMaterialRecipe} from '../dist/city/building-material.js';
import {decodeMaterialPack} from '../dist/material-production/pack.js';
import {bakeCPU} from '../dist/material-production/cpu.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function buildMaterialCatalog(){
 const root='dist/material-production',definition=JSON.parse(await readFile(root+'/catalog-recipes.json','utf8')),sources=await Promise.all(['dist/city/building-material.js','dist/hull/surface.js',root+'/cpu.js',root+'/pack.js'].map(p=>readFile(p))),generatorHash=hash(Buffer.concat(sources));
 if(definition.schema!=='aether.material-catalog-recipes/1'||!Array.isArray(definition.materials)||!definition.materials.length||definition.materials.some(x=>!x||!/^[-a-z0-9]{1,64}$/.test(x.id))||new Set(definition.materials.map(x=>x.id)).size!==definition.materials.length)throw Error('Invalid material catalog definition');
 let previous=[];try{previous=JSON.parse(await readFile(root+'/catalog.json','utf8')).entries;}catch{}await mkdir(root+'/packs',{recursive:true});const entries=[];
 for(const item of definition.materials){const recipe=item.recipe?buildingMaterialRecipe(item.recipe):buildingMaterialPreset(item.preset,item.seed),recipeKey=hash(JSON.stringify({recipe,size:definition.size,generatorHash})),cached=previous.find(e=>e.recipeKey===recipeKey);let raw,compressed;
  try{if(!cached)throw Error('Uncached recipe');compressed=await readFile(root+'/'+cached.url);raw=gunzipSync(compressed);if(hash(raw)!==cached.sha256)throw Error('Invalid cached artifact');decodeMaterialPack(raw);}catch{raw=bakeCPU(recipe,definition.size).bytes;compressed=gzipSync(raw,{level:9});}
  const digest=hash(raw),url=`packs/${item.id}-${digest.slice(0,20)}.amp.gz`;await writeFile(root+'/'+url,compressed);entries.push({...item,recipe,tileSize:definition.size,url,key:digest,recipeKey,sha256:digest,compressedBytes:compressed.byteLength,decodedBytes:raw.byteLength,gpuBytes:Object.values(decodeMaterialPack(raw).maps).flat().reduce((n,m)=>n+m.data.byteLength,0)});
 }
 const catalog={schema:'aether.material-catalog/1',generatorHash,entries};await writeFile(root+'/catalog.json',JSON.stringify(catalog,null,2)+'\n');console.log(`Material catalog: ${entries.length} pregenerated, content-addressed packs / ${definition.size}px / CPU-independent runtime`);return catalog;
}
if(process.argv[1]?.endsWith('build-material-catalog.mjs'))await buildMaterialCatalog();
