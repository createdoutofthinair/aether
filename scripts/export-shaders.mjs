import * as T from '../dist/vendor/three.module.js';
import {patchTerrain,atmosphereVertex,atmosphereFragment} from '../dist/shaders.js';
import {waterVertex,waterFragment} from '../dist/water.js';
import {skyEnvironmentVertex,skyEnvironmentFragment} from '../dist/sky-light.js';
import {RockField} from '../dist/grounding.js';
import {OutcropField} from '../dist/outcrops.js';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.argv[2]||'/tmp/aether-shaders';mkdirSync(out,{recursive:true});
function expand(s){
 // glslang 15 reserves average; rename Three's equivalent helper in validation output.
 s=s.replace(/\baverage\b/g,'threeAverage');
 s=s.replace(/#include <(\w+)>/g,(_,n)=>expand(T.ShaderChunk[n]));
 const nums={NUM_SUN_LIGHTS:0,NUM_SUN_LIGHT_SHADOWS:0,NUM_DIR_LIGHTS:1,NUM_HEMI_LIGHTS:1,NUM_DIR_LIGHT_SHADOWS:1,NUM_POINT_LIGHTS:0,NUM_SPOT_LIGHTS:0,NUM_RECT_AREA_LIGHTS:0,NUM_POINT_LIGHT_SHADOWS:0,NUM_SPOT_LIGHT_SHADOWS:0,NUM_SPOT_LIGHT_COORDS:0,NUM_SPOT_LIGHT_MAPS:0,NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS:0,NUM_CLIPPING_PLANES:0,UNION_CLIPPING_PLANES:0,NUM_LIGHT_PROBES:0,NUM_LIGHT_PROBE_GRIDS:0};
 for(const [k,v]of Object.entries(nums))s=s.replace(new RegExp('\\b'+k+'\\b','g'),String(v));
 return s.replace(/#pragma unroll_loop_start\s+for\s*\(\s*int i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g,(_,a,b,body)=>Array.from({length:b-a},(_,j)=>body.replace(/\[\s*i\s*\]/g,`[ ${+a+j} ]`).replace(/UNROLLED_LOOP_INDEX/g,String(+a+j))).join(''));
}
const common='#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2DShadow;\n#define HIGH_PRECISION\n#define SHADER_TYPE MeshStandardMaterial\n#define SHADER_NAME validation\n#define texture2D texture\n#define textureCube texture\n#define texture2DCompare texture\n#define texture2DProj textureProj\n#define texture2DLodEXT textureLod\n#define textureCubeLodEXT textureLod\n';
const uniforms='uniform mat4 viewMatrix;uniform vec3 cameraPosition;uniform bool isOrthographic;\n';
function emit(name,s,defines=''){
 const vs=common+defines+'#define attribute in\n#define varying out\n'+uniforms+'uniform mat4 modelMatrix,modelViewMatrix,projectionMatrix;uniform mat3 normalMatrix;in vec3 position,normal;in vec2 uv;\n#ifdef USE_INSTANCING\nin mat4 instanceMatrix;\n#endif\n'+expand(s.vertexShader);
 const fs=common+defines+'#define varying in\n#define gl_FragColor pc_fragColor\nlayout(location=0) out vec4 pc_fragColor;\n'+uniforms+T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 v){return v;}\nfloat luminance(vec3 rgb){return dot(rgb,vec3(.2126,.7152,.0722));}\n'+expand(s.fragmentShader);
 writeFileSync(`${out}/${name}.vert`,vs);writeFileSync(`${out}/${name}.frag`,fs);
}
const shader=()=>({vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}}),m=new T.MeshStandardMaterial();patchTerrain(m,{});let s=shader();m.onBeforeCompile(s);emit('terrain',s,'#define USE_SHADOWMAP\n#define SHADOWMAP_TYPE_PCF\n');
emit('terrain-environment',s,'#define USE_SHADOWMAP\n#define SHADOWMAP_TYPE_PCF\n#define USE_ENVMAP\n#define ENVMAP_TYPE_CUBE_UV\n#define ENVMAP_MODE_REFLECTION\n#define CUBEUV_TEXEL_WIDTH .0013020833\n#define CUBEUV_TEXEL_HEIGHT .001953125\n#define CUBEUV_MAX_MIP 6.0\n');
const field=new RockField(new T.Group(),{rock:null,rn:null,rr:null},{});s=shader();field.mesh.material.onBeforeCompile(s);emit('rocks',s,'#define USE_INSTANCING\n#define USE_SHADOWMAP\n#define SHADOWMAP_TYPE_PCF\n');
const outcrops=new OutcropField(new T.Group(),{}, {},{sediment:{value:.65}});s=shader();outcrops.meshes[0].material.onBeforeCompile(s);emit('outcrops',s,'#define USE_INSTANCING\n#define USE_SHADOWMAP\n#define SHADOWMAP_TYPE_PCF\n#define USE_ENVMAP\n#define ENVMAP_TYPE_CUBE_UV\n#define ENVMAP_MODE_REFLECTION\n#define CUBEUV_TEXEL_WIDTH .0013020833\n#define CUBEUV_TEXEL_HEIGHT .001953125\n#define CUBEUV_MAX_MIP 6.0\n');
s={...T.ShaderLib.depth};outcrops.meshes[0].customDepthMaterial.onBeforeCompile(s);emit('outcrop-depth',s,'#define USE_INSTANCING\n#define DEPTH_PACKING 3201\n');
s={...T.ShaderLib.depth};field.mesh.customDepthMaterial.onBeforeCompile(s);emit('rock-depth',s,'#define USE_INSTANCING\n#define DEPTH_PACKING 3201\n');
emit('water',{vertexShader:waterVertex,fragmentShader:waterFragment});
emit('atmosphere',{vertexShader:atmosphereVertex,fragmentShader:atmosphereFragment});
emit('sky-environment',{vertexShader:skyEnvironmentVertex,fragmentShader:skyEnvironmentFragment});
console.log('Exported terrain, environment, rock, shadow, water and atmosphere shaders');
