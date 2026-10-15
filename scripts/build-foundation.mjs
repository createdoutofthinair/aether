import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('scripts/vendor-manifest.json','utf8'));
for(const [path,expected]of Object.entries(manifest.files)){
 const actual=createHash('sha256').update(await readFile(path)).digest('hex');
 if(actual!==expected)throw Error(`Vendored dependency integrity mismatch: ${path}`);
}
await mkdir('dist/domain',{recursive:true});
for(const name of ['vector','world','terrain','contact'])await copyFile(`src/domain/${name}.js`,`dist/domain/${name}.js`);
await writeFile('dist/foundation-manifest.json',JSON.stringify({schema:1,threeRevision:manifest.threeRevision,backend:'webgl',domainSource:'src/domain',vendorManifest:manifest.files},null,2)+'\n');
console.log('Foundation source synchronized; pinned vendor integrity passed');
