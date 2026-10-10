import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {read, KHR_SUPERCOMPRESSION_ZSTD} from '../dist/vendor/ktx-parse.module.js';
const manifest=JSON.parse(readFileSync('dist/compressed/manifest.json','utf8'));let downloadBytes=0;
for(const [key,asset]of Object.entries(manifest)){
 const bytes=readFileSync('dist/'+asset.path.slice(2)),container=read(new Uint8Array(bytes));assert(container.pixelWidth>=1024&&container.pixelHeight>=1024,key);assert(container.levels.length>=11,key);assert.equal(container.faceCount,1);assert(container.levels.every(l=>l.levelData.byteLength>0));
 if(asset.normalMoments){assert.equal(container.supercompressionScheme,KHR_SUPERCOMPRESSION_ZSTD);assert.equal(container.levels.length,12);}
 downloadBytes+=bytes.length;
}
const histogram=JSON.parse(readFileSync('dist/material-histogram.json'));assert.equal(histogram.length,3072);assert(histogram.every(Number.isFinite));
await import('../dist/vendor/KTX2Loader.js');console.log(JSON.stringify({compressedMaterials:Object.keys(manifest).length,downloadBytes,mipChains:'pass',normalMomentMipChains:'pass',dependencyImports:'pass'}));
