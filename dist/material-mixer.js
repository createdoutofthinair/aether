import {defaultMask,maskTypes,maskGLSL} from './material-masks.js?v=editor-2';
// The editor uses the same source scans and packed R=roughness/G=AO/B=height
// textures as the explorer. Mixing is a separate preview, not a planet preset.
export const materialCatalog=[
 {id:'rock',name:'Dry boulder',kind:'Scanned rock',base:'rock_boulder_dry',source:'https://polyhaven.com/a/rock_boulder_dry'},
 {id:'sand',name:'Sandy gravel',kind:'Scanned sediment',base:'sandy_gravel',source:'https://polyhaven.com/a/sandy_gravel'},
 {id:'mud',name:'Cracked mud',kind:'Scanned soil',base:'mud_cracked_dry_03',source:'https://polyhaven.com/a/mud_cracked_dry_03'},
 {id:'moss',name:'Moss',kind:'Procedural growth + fibres',base:null,source:null},
 {id:'lichen',name:'Lichen',kind:'Procedural mineral crust',base:null,source:null},
 {id:'snow',name:'Snow / firn',kind:'Procedural grain + crust',base:null,source:null}
];
export const defaultRecipe=()=>({version:2,name:'Moss on boulder',mode:'stack',layers:[{material:'rock',weight:100,scale:2,mask:defaultMask()},{material:'moss',weight:85,scale:3,mask:{...defaultMask(),type:'upward',coverage:.6}},{material:'lichen',weight:35,scale:4,mask:{...defaultMask(),type:'cavity',coverage:.4,seed:41}}],heightBlend:.35,normalStrength:1,roughness:1,tint:'#ffffff'});
export function validateRecipe(value){
 if(!value||![1,2].includes(value.version)||!Array.isArray(value.layers)||value.layers.length!==3)throw Error('Choose an Aether recipe with three layers (version 1 or 2).');
 const number=(v,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Recipe settings are outside the supported range.');return v;};
 const legacy=value.version===1,mode=legacy?'weighted':value.mode;
 if(!['weighted','stack'].includes(mode))throw Error('Unknown composition mode.');
 const layers=value.layers.map(l=>{
  if(!materialCatalog.some(m=>m.id===l.material))throw Error('Recipe contains an unknown material.');
  const m=legacy?defaultMask():l.mask;if(!m||!maskTypes.includes(m.type)||typeof m.invert!=='boolean')throw Error('Unknown or invalid layer mask.');
  return{material:l.material,weight:number(l.weight,0,100),scale:number(l.scale,.25,12),mask:{type:m.type,coverage:number(m.coverage,0,1),scale:number(m.scale,.25,16),softness:number(m.softness,.01,.5),seed:number(m.seed,0,999),invert:m.invert}};
 });
 if(!layers.some(l=>l.weight>0))throw Error('At least one material needs a nonzero weight.');
 if(typeof value.tint!=='string'||!/^#[0-9a-f]{6}$/i.test(value.tint))throw Error('Tint must be a six-digit hex colour.');
 return{version:2,name:String(value.name||'Untitled mix').slice(0,80),mode,layers,heightBlend:number(value.heightBlend,0,1),normalStrength:number(value.normalStrength,0,2),roughness:number(value.roughness,.2,1.5),tint:value.tint};
}
export function patchMixer(material,uniforms){
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 mixerUV;\nvarying vec3 mixerPosition,mixerUp;').replace('#include <uv_vertex>','#include <uv_vertex>\nmixerUV=uv;\nmixerPosition=(modelMatrix*vec4(position,1.)).xyz;\nmixerUp=normalize(mat3(modelMatrix)*normal);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec2 mixerUV;
 uniform sampler2D mixColor0,mixColor1,mixColor2,mixNormal0,mixNormal1,mixNormal2,mixSurface0,mixSurface1,mixSurface2;
 uniform vec3 mixWeights,mixScale;uniform float mixHeight,mixNormalStrength,mixRoughness;
 ${maskGLSL}
 vec3 mixerWeights(vec3 h,vec3 masks){
  vec3 raw=mixWeights*masks;float sum=dot(raw,vec3(1.));vec3 base=sum>.00001?raw/sum:vec3(1.,0.,0.);
  vec3 score=h+base;float peak=max(max(base.x>0.?score.x:-10.,base.y>0.?score.y:-10.),base.z>0.?score.z:-10.);
  vec3 heightWeights=base*max(score-peak+.22,vec3(0.));
  heightWeights/=max(dot(heightWeights,vec3(1.)),.00001);
  return mix(base,heightWeights,mixHeight);
 }
 `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
 vec2 uv0=mixerUV*mixScale.x,uv1=mixerUV*mixScale.y,uv2=mixerUV*mixScale.z;
 vec3 s0=texture2D(mixSurface0,uv0).rgb,s1=texture2D(mixSurface1,uv1).rgb,s2=texture2D(mixSurface2,uv2).rgb;
 float sampleHeight=clamp(mixerPosition.y*.5+.5,0.,1.);
 vec3 masks=vec3(layerMask(layerMask0,layerSeeds.x,layerInvert.x,sampleHeight,s0.b),layerMask(layerMask1,layerSeeds.y,layerInvert.y,sampleHeight,s0.b),layerMask(layerMask2,layerSeeds.z,layerInvert.z,sampleHeight,s0.b));
 vec3 weights=mixStack>.5?orderedWeights(masks,vec3(s0.b,s1.b,s2.b)):mixerWeights(vec3(s0.b,s1.b,s2.b),masks);
 vec3 mixedSurface=s0*weights.x+s1*weights.y+s2*weights.z;
 diffuseColor.rgb*=texture2D(mixColor0,uv0).rgb*weights.x+texture2D(mixColor1,uv1).rgb*weights.y+texture2D(mixColor2,uv2).rgb*weights.z;
 `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor=clamp(mixedSurface.r*mixRoughness,.04,1.);');
  // Three supplies its standard tangent-space normal transform and lighting.
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#ifdef USE_NORMALMAP_TANGENTSPACE
 vec3 n0=texture2D(mixNormal0,uv0).xyz*2.-1.,n1=texture2D(mixNormal1,uv1).xyz*2.-1.,n2=texture2D(mixNormal2,uv2).xyz*2.-1.;
 vec3 mapN=normalize(n0*weights.x+n1*weights.y+n2*weights.z);mapN.xy*=mixNormalStrength;
 normal=normalize(tbn*mapN);
 #endif`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>\nif(mixMaskView>.5){vec3 diagnostic=mixMaskView>3.5?weights:vec3(mixMaskView<1.5?masks.x:mixMaskView<2.5?masks.y:masks.z);gl_FragColor=vec4(diagnostic,1.);}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>','reflectedLight.indirectDiffuse*=mixedSurface.g;');
 };
 material.customProgramCacheKey=()=> 'aether-material-mixer-2';
}
