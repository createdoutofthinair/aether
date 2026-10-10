// The editor uses the same source scans and packed R=roughness/G=AO/B=height
// textures as the explorer. Mixing is a separate preview, not a planet preset.
export const materialCatalog=[
 {id:'rock',name:'Dry boulder',kind:'Scanned rock',base:'rock_boulder_dry',source:'https://polyhaven.com/a/rock_boulder_dry'},
 {id:'sand',name:'Sandy gravel',kind:'Scanned sediment',base:'sandy_gravel',source:'https://polyhaven.com/a/sandy_gravel'},
 {id:'mud',name:'Cracked mud',kind:'Scanned soil',base:'mud_cracked_dry_03',source:'https://polyhaven.com/a/mud_cracked_dry_03'},
 {id:'snow',name:'Snow / firn',kind:'Procedural grain + crust',base:null,source:null}
];
export const defaultRecipe=()=>({version:1,name:'Boulder + sediment',layers:[{material:'rock',weight:65,scale:2},{material:'sand',weight:25,scale:2},{material:'mud',weight:10,scale:2}],heightBlend:.35,normalStrength:1,roughness:1,tint:'#ffffff'});
export function validateRecipe(value){
 if(!value||value.version!==1||!Array.isArray(value.layers)||value.layers.length!==3)throw Error('Choose a version 1 Aether recipe with three layers.');
 const number=(v,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Recipe settings are outside the supported range.');return v;};
 const layers=value.layers.map(l=>{if(!materialCatalog.some(m=>m.id===l.material))throw Error('Recipe contains an unknown material.');return{material:l.material,weight:number(l.weight,0,100),scale:number(l.scale,.25,12)};});
 if(!layers.some(l=>l.weight>0))throw Error('At least one material needs a nonzero weight.');
 if(typeof value.tint!=='string'||!/^#[0-9a-f]{6}$/i.test(value.tint))throw Error('Tint must be a six-digit hex colour.');
 return{version:1,name:String(value.name||'Untitled mix').slice(0,80),layers,heightBlend:number(value.heightBlend,0,1),normalStrength:number(value.normalStrength,0,2),roughness:number(value.roughness,.2,1.5),tint:value.tint};
}
export function patchMixer(material,uniforms){
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 mixerUV;').replace('#include <uv_vertex>','#include <uv_vertex>\nmixerUV=uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec2 mixerUV;
 uniform sampler2D mixColor0,mixColor1,mixColor2,mixNormal0,mixNormal1,mixNormal2,mixSurface0,mixSurface1,mixSurface2;
 uniform vec3 mixWeights,mixScale;uniform float mixHeight,mixNormalStrength,mixRoughness;
 vec3 mixerWeights(vec3 h){
  vec3 base=mixWeights/max(dot(mixWeights,vec3(1.)),.00001);
  vec3 score=h+base;float peak=max(max(base.x>0.?score.x:-10.,base.y>0.?score.y:-10.),base.z>0.?score.z:-10.);
  vec3 heightWeights=base*max(score-peak+.22,vec3(0.));
  heightWeights/=max(dot(heightWeights,vec3(1.)),.00001);
  return mix(base,heightWeights,mixHeight);
 }
 `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
 vec2 uv0=mixerUV*mixScale.x,uv1=mixerUV*mixScale.y,uv2=mixerUV*mixScale.z;
 vec3 s0=texture2D(mixSurface0,uv0).rgb,s1=texture2D(mixSurface1,uv1).rgb,s2=texture2D(mixSurface2,uv2).rgb;
 vec3 weights=mixerWeights(vec3(s0.b,s1.b,s2.b));
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
  shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>','reflectedLight.indirectDiffuse*=mixedSurface.g;');
 };
 material.customProgramCacheKey=()=> 'aether-material-mixer-1';
}
