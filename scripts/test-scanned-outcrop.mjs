import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const metadata=JSON.parse(readFileSync('dist/scans/rock-face-01.json')),buffer=readFileSync('dist/scans/rock-face-01.bin'),data=new Float32Array(buffer.buffer,buffer.byteOffset,buffer.byteLength/4);
assert.equal(data.length,metadata.count*8);assert.equal(metadata.triangles,1500);assert(metadata.sourceTriangles>20000);assert(metadata.simplificationRelativeError<.02);assert(data.every(Number.isFinite));
for(let i=0;i<metadata.count;i++)assert(Math.abs(Math.hypot(...data.subarray(i*8+3,i*8+6))-1)<1e-5);
console.log('Scanned outcrop: source provenance, bounded geometry, simplification error and finite unit normals pass');
