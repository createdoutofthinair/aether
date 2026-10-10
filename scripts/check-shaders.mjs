import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const directory=process.argv[2]||'/tmp/aether-shaders';
for(const file of readdirSync(directory).filter(f=>f.endsWith('.vert'))){
 const reflection=execFileSync('glslangValidator',['-l','-q',`${directory}/${file}`,`${directory}/${file.replace('.vert','.frag')}`],{encoding:'utf8'});
 // Reflection includes only linked active uniforms. Count each fragment-stage
 // sampler array element, including Three.js's environment and DFG resources.
 const samplerTypes=new Set(['8b5e','8b60','8b62','8dc1','8dc4','8dc5']);
 let count=0;for(const line of reflection.split('\n')){const m=line.match(/type ([0-9a-f]+), size (\d+).*stages (\d+)/);if(m&&samplerTypes.has(m[1])&&(Number(m[3])&16))count+=Number(m[2]);}
 assert(count<=16,`${file}: ${count} fragment samplers exceeds the WebGL2 minimum of 16`);
 console.log(`${file.replace('.vert','')}: linked, ${count}/16 fragment samplers`);
}
