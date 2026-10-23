/** Independent WebGL inspection uses the same worker maps, metre UVs,
 * deposition masks and explicit gradients as the production WebGPU material. */
export function citySurfaceWebGL(material,chunks){
 const spec=material.userData.citySurface;if(!spec)return material;
 material.onBeforeCompile=shader=>{
  shader.uniforms.cityWear={value:spec.wear};shader.uniforms.cityDirt={value:{x:spec.dirt[0],y:spec.dirt[1],z:spec.dirt[2]}};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 uv1; varying vec4 vCityData; varying vec2 vCityMetres; varying float vCityHeight;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCityData=uv1;vCityMetres=uv;vCityHeight=position.y;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec4 vCityData; varying vec2 vCityMetres; varying float vCityHeight;
 uniform float cityWear; uniform vec3 cityDirt;
 vec2 cityUV,cityDX,cityDY; float cityDeposit,cityPanel;
 vec4 citySample(sampler2D t){return textureGrad(t,cityUV,cityDX,cityDY);}
 `).replace('#include <map_fragment>',`
 vec2 cityMetric=vCityMetres/${Number(spec.tileMeters).toFixed(8)};
 vec2 cityScale=vec2(.75/4.,.75/2.);float cityZone=floor(vCityData.x+.5);
 cityUV=(vec2(mod(cityZone,4.),floor(cityZone/4.))+.125)/vec2(4.,2.)+fract(cityMetric)*cityScale;
 cityDX=dFdx(cityMetric)*cityScale;cityDY=dFdy(cityMetric)*cityScale;
 cityPanel=fract(sin(dot(floor(cityMetric),vec2(12.9898,78.233)))*43758.5453);
 float cityRunoff=smoothstep(.58,.93,sin(cityMetric.x*9.7)*sin(cityMetric.x*3.1));
 cityDeposit=clamp((vCityData.y*.55+(1.-clamp(max(vCityHeight,0.)/2.,0.,1.))*.35+cityRunoff*.1)*cityWear*(cityPanel*.4+.6),0.,1.);
 vec4 sampledDiffuseColor=citySample(map);
 diffuseColor*=vec4(mix(sampledDiffuseColor.rgb*(1.+(cityPanel-.5)*vCityData.w),cityDirt,cityDeposit*.24),sampledDiffuseColor.a);
 `);
  for(const [chunk,field]of [['roughnessmap_fragment','roughnessMap'],['metalnessmap_fragment','metalnessMap'],['aomap_fragment','aoMap'],['normal_fragment_maps','normalMap']]){
   // Expand only the relevant built-in chunk; keep Three's normal/tangent frame.
   const code=chunks[chunk].replace(new RegExp('texture2D\\( '+field+', [^)]* \\)','g'),'citySample( '+field+' )');
   shader.fragmentShader=shader.fragmentShader.replace('#include <'+chunk+'>',code);
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>','roughnessFactor=clamp(roughnessFactor+vCityData.z+cityDeposit*.12,.22,.98);metalnessFactor*=1.-cityDeposit;\n#include <lights_physical_fragment>');
 };
 material.customProgramCacheKey=()=>`city-surface-v1-${spec.tileMeters}-${spec.variation??.025}`;return material;
}
