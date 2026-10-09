export const noiseGLSL=`
float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float ns(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
export function patchTerrain(material,textures,controls={sediment:{value:.65}}){material.onBeforeCompile=s=>{
 Object.assign(s.uniforms,{rockMap:{value:textures.rock},sandMap:{value:textures.sand},mudMap:{value:textures.mud},rockNormal:{value:textures.rn},sandNormal:{value:textures.sn},mudNormal:{value:textures.mn},rockSurface:{value:textures.rs},sandSurface:{value:textures.ss},mudSurface:{value:textures.ms},sedimentCover:controls.sediment});
 s.vertexShader='attribute vec3 biomeData;varying vec3 vBiome;attribute vec3 planetPosition;attribute vec3 surfaceData;varying vec3 vSurfaceData;varying vec3 vPlanet;varying vec3 vGeoNormal;\n'+s.vertexShader;
 s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBiome=biomeData;vPlanet=planetPosition;vGeoNormal=normal;vSurfaceData=surfaceData;');
 s.fragmentShader=`varying vec3 vBiome;varying vec3 vSurfaceData;varying vec3 vPlanet;varying vec3 vGeoNormal;
 uniform sampler2D rockMap,sandMap,mudMap,rockNormal,sandNormal,mudNormal,rockSurface,sandSurface,mudSurface;
 uniform float sedimentCover;
 vec3 terrainDx,terrainDy;
 ${noiseGLSL}
 vec2 tileHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
 // Triangular stochastic tiling: shared offsets/weights across every PBR channel.
 // Explicit gradients keep mip selection stable across random tile boundaries.
 vec4 tileSample(sampler2D tex,vec2 uv,vec2 cell,vec2 dx,vec2 dy,bool normalMap){
  vec2 seed=tileHash(cell);float angle=seed.x*6.283185307;
  float frequency=mix(.72,1.32,tileHash(cell+vec2(41.,17.)).y);
  float c=cos(angle),s=sin(angle);mat2 rotation=mat2(c,s,-s,c);
  // Re-anchor to the stochastic cell to avoid large-coordinate precision loss.
  vec2 anchor=mat2(1.,0.,.5,.8660254)*cell/1.1;
  vec4 value=textureGrad(tex,rotation*(uv-anchor)*frequency+seed*17.,rotation*dx*frequency,rotation*dy*frequency);
  if(normalMap){vec3 n=value.xyz*2.-1.;n=normalize(vec3(transpose(rotation)*n.xy*frequency,n.z));value.xyz=n*.5+.5;}
  return value;
 }
 vec4 sampleTile(sampler2D tex,vec2 uv,vec2 dx,vec2 dy,bool normalMap){
  vec2 grid=mat2(1.,0.,-.57735027,1.15470054)*uv*1.1;
  vec2 cell=floor(grid),f=fract(grid);vec3 bw;vec2 b,c;
  if(f.x+f.y<1.){bw=vec3(1.-f.x-f.y,f.x,f.y);b=cell+vec2(1,0);c=cell+vec2(0,1);}
  else{bw=vec3(f.x+f.y-1.,1.-f.x,1.-f.y);cell+=vec2(1,1);b=cell-vec2(1,0);c=cell-vec2(0,1);}
  bw=pow(bw,vec3(3.));bw/=dot(bw,vec3(1.));
  return tileSample(tex,uv,cell,dx,dy,normalMap)*bw.x+tileSample(tex,uv,b,dx,dy,normalMap)*bw.y+tileSample(tex,uv,c,dx,dy,normalMap)*bw.z;
 }
 vec4 tri(sampler2D tex,vec3 p,vec3 w,float scale){
  vec4 result=vec4(0.);
  if(w.x>0.)result+=sampleTile(tex,p.yz,terrainDx.yz*scale,terrainDy.yz*scale,false)*w.x;
  if(w.y>0.)result+=sampleTile(tex,p.zx,terrainDx.zx*scale,terrainDy.zx*scale,false)*w.y;
  if(w.z>0.)result+=sampleTile(tex,p.xy,terrainDx.xy*scale,terrainDy.xy*scale,false)*w.z;
  return result;
 }
 vec2 normalSlope(sampler2D tex,vec2 uv,vec2 dx,vec2 dy){vec3 n=sampleTile(tex,uv,dx,dy,true).xyz*2.-1.;return n.xy/max(n.z,.3);}
 vec3 triGradient(sampler2D tex,vec3 p,vec3 w,float scale){
  vec3 g=vec3(0.);
  if(w.x>0.){vec2 n=normalSlope(tex,p.yz,terrainDx.yz*scale,terrainDy.yz*scale);g+=vec3(0.,n.x,n.y)*w.x;}
  if(w.y>0.){vec2 n=normalSlope(tex,p.zx,terrainDx.zx*scale,terrainDy.zx*scale);g+=vec3(n.y,0.,n.x)*w.y;}
  if(w.z>0.){vec2 n=normalSlope(tex,p.xy,terrainDx.xy*scale,terrainDy.xy*scale);g+=vec3(n.x,n.y,0.)*w.z;}return g;
 }

 `+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 terrainDx=dFdx(vPlanet);terrainDy=dFdy(vPlanet);
 vec3 radial=normalize(vPlanet),gn=normalize(vGeoNormal),w=pow(abs(gn),vec3(8.));w/=max(dot(w,vec3(1.)),.0001);w=max(w-.025,0.);w/=max(dot(w,vec3(1.)),.0001);
 float slope=1.-abs(dot(radial,gn)),elevation=length(vPlanet)-60000.;
 float dist=length(vViewPosition),detailed=1.-smoothstep(350.,2200.,dist);
 float footprint=max(length(terrainDx),length(terrainDy));
 float province=mix(ns(vPlanet*.002),.5,smoothstep(.5,2.,footprint*.002)),deposits=mix(ns(vPlanet*.018),.5,smoothstep(.5,2.,footprint*.018)),grain=mix(ns(vPlanet*.19),.5,smoothstep(.5,2.,footprint*.19));
 float deposition=vSurfaceData.r*vSurfaceData.b,bedrock=vSurfaceData.g*vSurfaceData.b;
 float badlands=vSurfaceData.b*(1.-vBiome.y)*(1.-vBiome.z)*(1.-vBiome.x);
 float exposed=smoothstep(.035,.22,slope)+(province-.5)*.22+bedrock*.28-deposition*sedimentCover*.30+(1.-sedimentCover)*.5;
 float rockWeight=clamp(exposed,0.,1.);
 rockWeight=mix(rockWeight,1.,vBiome.y);rockWeight*=1.-vBiome.z*.75;
 float mudWeight=(1.-rockWeight)*smoothstep(.30,.70,deposits)*mix(.3,.85,deposition)*(1.-smoothstep(.01,.08,slope));
 vec3 weights=vec3(rockWeight,1.-rockWeight-mudWeight,mudWeight);
 vec3 rp=vPlanet/1.8,sp=vPlanet/2.,mp=vPlanet/1.5;
 vec3 rockData=vec3(.86,1.,.5),sandData=vec3(.92,1.,.5),mudData=vec3(.95,1.,.5);
 vec3 base=vec3(.32,.255,.18);
 if(detailed>0.){
  if(weights.x>0.)rockData=tri(rockSurface,rp,w,1./1.8).rgb;
  if(weights.y>0.)sandData=tri(sandSurface,sp,w,.5).rgb;
  if(weights.z>0.)mudData=tri(mudSurface,mp,w,1./1.5).rgb;
  // Scanned height resolves boundaries: sediment fills recesses below exposed rock.
  vec3 heights=vec3(rockData.b,sandData.b,mudData.b)*.28+weights;
  float peak=max(heights.x,max(heights.y,heights.z));weights=max(heights-peak+.20,0.)*weights;weights/=max(dot(weights,vec3(1.)),.0001);
  base=vec3(0.);
  if(weights.x>0.)base+=tri(rockMap,rp,w,1./1.8).rgb*weights.x;
  if(weights.y>0.)base+=tri(sandMap,sp,w,.5).rgb*weights.y;
  if(weights.z>0.)base+=tri(mudMap,mp,w,1./1.5).rgb*weights.z;
 }
 float strata=ns(vec3(elevation*.033+ns(vPlanet*.004)*1.5,province*3.,11.));
 float localVariation=mix(ns(vPlanet*.13),.5,smoothstep(.5,2.,footprint*.13));
 vec3 weathering=mix(vec3(.81,.78,.72),vec3(1.06,1.0,.90),mix(ns(vPlanet*.008),.5,smoothstep(.5,2.,footprint*.008)));
 vec3 broad=mix(vec3(.24,.205,.165),vec3(.40,.325,.235),province);
 diffuseColor.rgb=mix(broad,base,detailed)*weathering*mix(1.,.95+.10*strata,weights.x)*(.92+.12*localVariation)*(.97+.06*grain);
 // Macro mineral colours survive the detail fade; scanned luminance supplies close texture.
 float surfaceLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
 float beds=ns(vec3(elevation*.012+province*1.5,11.,7.));
 vec3 sandstone=mix(vec3(.28,.105,.045),vec3(.62,.43,.25),beds);
 sandstone=mix(sandstone,vec3(.53,.44,.31),deposition*.8);
 diffuseColor.rgb=mix(diffuseColor.rgb,sandstone*(.72+clamp(surfaceLuma,0.,.7)),badlands*.86);
 vec3 basalt=mix(vec3(.095,.11,.13),vec3(.19,.14,.10),smoothstep(.55,.82,province));
 diffuseColor.rgb=mix(diffuseColor.rgb,basalt*(.75+clamp(surfaceLuma,0.,.7)),clamp(vBiome.y*1.12,0.,1.));
 vec3 fineSand=mix(vec3(.46,.29,.105),vec3(.64,.47,.24),province);
 diffuseColor.rgb=mix(diffuseColor.rgb,fineSand*(.90+clamp(surfaceLuma,0.,.7)*.32),vBiome.z*.93);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.68,.79,.84)*(.9+.1*grain),vBiome.x*(1.-smoothstep(.2,.65,slope)));
 `);
 s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=clamp(dot(vec3(rockData.r,sandData.r,mudData.r),weights),.55,1.);roughnessFactor=mix(roughnessFactor,.84,vBiome.y);roughnessFactor=mix(roughnessFactor,.97,vBiome.z);`);
 s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec3 gradient=vec3(0.);
 if(detailed>0.){
  if(weights.x>.01)gradient+=triGradient(rockNormal,rp,w,1./1.8)*weights.x;
  if(weights.y>.01)gradient+=triGradient(sandNormal,sp,w,.5)*weights.y;
  if(weights.z>.01)gradient+=triGradient(mudNormal,mp,w,1./1.5)*weights.z;
 }
 gradient*=1.-vBiome.z*.88;
 vec3 wind=normalize(vec3(.88,.12,.47));
 float ripplePhase=dot(vPlanet,wind)*18.+ns(vPlanet*.06)*2.;
 wind-=gn*dot(wind,gn);
 gradient+=wind*cos(ripplePhase)*.09*vBiome.z*(1.-smoothstep(.03,.18,footprint));
 gradient-=gn*dot(gn,gradient);
 normal=normalize(mat3(viewMatrix)*normalize(gn+gradient*.7*detailed*(1.-vBiome.x*.8)));
 `);
 s.fragmentShader=s.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
 float scannedAO=dot(vec3(rockData.g,sandData.g,mudData.g),weights);
 reflectedLight.indirectDiffuse*=mix(1.,scannedAO,.85*detailed);
 `);
 };}
export const atmosphereVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export const atmosphereFragment=`precision highp float;
varying vec2 vUv;uniform sampler2D sceneColor,sceneDepth;uniform mat4 invProjection,camWorld;uniform vec3 origin,sunDir;uniform float cameraNear,cameraFar,air,exposure;uniform int quality;
vec2 sphere(vec3 o,vec3 d,float r){float b=dot(o,d),c=dot(o,o)-r*r,h=b*b-c;if(h<0.)return vec2(1e9,-1e9);return vec2(-b-sqrt(h),-b+sqrt(h));}
vec2 density(vec3 p){float h=max(0.,length(p)-60.);return vec2(exp(-h/1.25),exp(-h/.42))*air;}
vec3 tonemap(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec4 view=invProjection*vec4(vUv*2.-1.,1.,1.);vec3 vr=normalize(view.xyz/view.w),ray=normalize(mat3(camWorld)*vr);vec3 o=origin*.001;
 float z=texture2D(sceneDepth,vUv).x;float viewZ=(cameraNear*cameraFar)/((cameraFar-cameraNear)*z-cameraFar);float limit=z<.999999?-viewZ/max(-vr.z,.00001)*.001:1e8;
 vec3 color=texture2D(sceneColor,vUv).rgb;
 // Sparse procedural stars remain behind the atmosphere and planet.
 if(z>=.999999){vec3 cell=floor(ray*1600.);float seed=fract(sin(dot(cell,vec3(12.9898,78.233,39.425)))*43758.5453);color+=vec3(.55,.66,.82)*pow(seed,950.)*.7;float solar=dot(ray,sunDir);color+=vec3(12.,10.,7.)*smoothstep(.999974,.999987,solar);}
 vec2 hit=sphere(o,ray,66.);float a=max(0.,hit.x),b=min(hit.y,limit);
 if(b>a&&air>.001){vec3 br=vec3(.045,.095,.205),bm=vec3(.08);float mu=dot(ray,sunDir),pr=3./(16.*3.141593)*(1.+mu*mu),g=.76,pm=3./(8.*3.141593)*((1.-g*g)*(1.+mu*mu))/((2.+g*g)*pow(1.+g*g-2.*g*mu,1.5));
 vec2 optical=vec2(0.);vec3 sr=vec3(0.),sm=vec3(0.);int steps=quality==1?16:10;float stepSize=(b-a)/float(steps);
 for(int i=0;i<16;i++){if(i>=steps)break;vec3 p=o+ray*(a+(float(i)+.5)*stepSize);vec2 local=density(p)*stepSize;optical+=local*.5;vec2 planet=sphere(p,sunDir,60.);bool shadow=planet.y>0.&&planet.x>0.;if(!shadow){float sunLength=max(0.,sphere(p,sunDir,66.).y);vec2 sunOpt=vec2(0.);for(int j=0;j<5;j++){sunOpt+=density(p+sunDir*((float(j)+.5)*sunLength/5.))*sunLength/5.;}vec3 attenuation=exp(-(br*(optical.x+sunOpt.x)+bm*(optical.y+sunOpt.y)));sr+=attenuation*local.x;sm+=attenuation*local.y;}optical+=local*.5;}
 color=color*exp(-(br*optical.x+bm*optical.y))+(sr*br*pr+sm*bm*pm)*17.;}
 color=tonemap(color*exposure);color=pow(color,vec3(1./2.2));float vignette=1.-.12*pow(length(vUv-.5)*1.4,2.);gl_FragColor=vec4(color*vignette,1.);}
`;

export function patchOcean(material,seaTemperature,oceanState){material.onBeforeCompile=s=>{
 Object.assign(s.uniforms,{seaTemperature,...oceanState});
 s.fragmentShader=`uniform float seaTemperature,seaRadius,seaTime;uniform vec3 seaCamera,seaSunDir;uniform mat4 seaProjection;
`+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
 // Intersect the actual sphere, not the planar triangles of its draw mesh.
 vec3 seaRay=transpose(mat3(viewMatrix))*normalize(-vViewPosition);
 float seaB=dot(seaCamera,seaRay);
 float seaC=(length(seaCamera)-seaRadius)*(length(seaCamera)+seaRadius);
 float seaDisc=seaB*seaB-seaC;
 if(seaDisc<0.)discard;
 float seaDenom=-seaB+sqrt(max(0.,seaDisc));
 float seaT=seaC/max(seaDenom,.000001);
 if(seaT<=0.)discard;
 vec3 seaPoint=seaCamera+seaRay*seaT;
 vec4 seaClip=seaProjection*vec4(mat3(viewMatrix)*(seaRay*seaT),1.);
 gl_FragDepth=seaClip.z/seaClip.w*.5+.5;
 `);
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float seaLatitude=normalize(seaPoint).y;
 float frozen=1.-smoothstep(-8.,0.,seaTemperature-58.*seaLatitude*seaLatitude);
 vec3 seaNormal=normalize(seaPoint);
 vec3 viewDir=normalize(-vViewPosition);
 vec3 normalView=normalize(mat3(viewMatrix)*seaNormal);
 float fresnel=pow(1.-clamp(dot(normalView,viewDir),0.,1.),5.);
 vec3 waveA=normalize(vec3(.82,0.,.57)),waveB=normalize(vec3(-.31,.88,.35));
 vec3 tangentA=normalize(waveA-seaNormal*dot(waveA,seaNormal));
 vec3 tangentB=normalize(waveB-seaNormal*dot(waveB,seaNormal));
 float phaseA=dot(seaPoint,waveA)*.035+seaTime*.72;
 float phaseB=dot(seaPoint,waveB)*.082-seaTime*.48;
 vec3 waveGradient=tangentA*cos(phaseA)*.055+tangentB*cos(phaseB)*.025;
 vec3 wavyNormal=normalize(seaNormal-waveGradient);
 vec3 wavyView=normalize(mat3(viewMatrix)*wavyNormal);
 vec3 sunView=normalize(mat3(viewMatrix)*seaSunDir);
 float sunGlint=pow(max(dot(reflect(-viewDir,wavyView),sunView),0.),220.);
 vec3 oceanReflection=mix(vec3(.025,.13,.20),vec3(.34,.56,.62),fresnel*.82);
 diffuseColor.rgb=mix(diffuseColor.rgb,oceanReflection,1.-frozen);
 diffuseColor.rgb+=vec3(1.,.88,.68)*sunGlint*.9*(1.-frozen);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.60,.73,.78),frozen);
 `);
 s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=mix(.16,.58,frozen);
 `);
 s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>\n normal=normalize(mat3(viewMatrix)*wavyNormal);\n `);
};}
