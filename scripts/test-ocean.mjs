import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const shader=await readFile(new URL('../dist/shaders.js',import.meta.url),'utf8');
const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
const ocean=shader.slice(shader.indexOf('export function patchOcean'));

assert.match(ocean,/seaTemperature,seaRadius,seaTime/,'ocean shader declares its animated surface uniforms');
assert.match(ocean,/seaDisc<0\.\)discard/,'ocean still rejects rays that miss the analytic sphere');
assert.match(ocean,/gl_FragDepth=seaClip\.z\/seaClip\.w\*\.5\+\.5/,'ocean writes depth from the analytic sphere hit');
assert.match(ocean,/fresnel=pow\(/,'ocean has view-angle reflection response');
assert.match(ocean,/phaseA=.*seaTime/,'ocean wave phase animates over time');
assert.match(ocean,/sunGlint=pow\(/,'ocean includes a tight solar reflection highlight');
assert.match(ocean,/roughnessFactor=mix\(\.16,\.58,frozen\)/,'water and ice use distinct roughness');
assert.match(ocean,/wavyNormal/,'water normal uses two low-amplitude wave bands');
assert.match(app,/seaSunDir:\{value:sunDir\}/,'app connects the current sunlight direction');
assert.match(app,/oceanState\.seaTime\.value=now\*\.001/,'app advances the ocean shader clock');

console.log('Ocean shader and integration checks passed.');
