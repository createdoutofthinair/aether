import {writeFile} from 'node:fs/promises';
import {detailPixels} from '../dist/city/detail-recipe.js';
await writeFile('dist/city/detail-data.js',`// Generated neutral surface detail; decoded once, never synthesized by clients.\nexport const detailSize=256;\nexport const detailBase64='${Buffer.from(detailPixels()).toString('base64')}';\n`);
console.log('City surface detail: reproducible 256² shared signal');
