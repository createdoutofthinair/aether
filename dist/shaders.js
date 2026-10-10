import {coastalGLSL} from './coastal.js?v=terrain-16';
import {regionalMaterialGLSL} from './regional-material.js?v=terrain-16';
import {ATLAS_WIDTH,ATLAS_HEIGHT,PAGE_COLUMNS,PAGE_ROWS,PAGE_SIZE,PAGE_STRIDE,TABLE_X,TABLE_Y,PARENT_X,PARENT_Y,REFERENCE_Y,CACHE_Y,COLOR_X,COLOR_Y,SURFACE_X,SURFACE_Y,NORMAL_X,NORMAL_Y} from './material-pages.js?v=terrain-16';
import {skyGLSL} from './sky-light.js?v=terrain-16';
export const noiseGLSL=`
float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float ns(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
export function patchTerrain(material,textures,controls={sediment:{value:.65}}){material.onBeforeCompile=s=>{
 const outcrop=!!controls.outcropAnchor;if(outcrop)s.uniforms.outcropAnchor=controls.outcropAnchor;
 Object.assign(s.uniforms,controls.coastalUniforms||{coastalCenter:{value:[0,1,0]},coastalEast:{value:[1,0,0]},coastalNorth:{value:[0,0,1]},coastalActive:{value:0},coastalTime:{value:0},coastalReady:{value:0},coastalMix:{value:0}},{rockMap:{value:textures.rockGaussian||textures.rock},sandMap:{value:textures.sandGaussian||textures.sand},mudMap:{value:textures.mudGaussian||textures.mud},histogramLUT:{value:textures.histogram},histogramEnabled:{value:textures.histogram?1:0},normalMomentsEnabled:{value:textures.normalMoments?1:0},snowNormalMap:{value:textures.snowNormal},snowSurfaceMap:{value:textures.snowSurface},rockNormal:{value:textures.rn},sandNormal:{value:textures.sn},mudNormal:{value:textures.mn},rockSurface:{value:textures.rs},sandSurface:{value:textures.ss},mudSurface:{value:textures.ms},sedimentCover:controls.sediment,seaLevel:controls.seaLevel||{value:-180},surfaceWater:controls.surfaceWater||{value:0},surfaceOrganic:controls.surfaceOrganic||{value:0},planetMaskSize:controls.planetMaskSize||{value:[0,0]},materialProfile:controls.materialProfile||{value:[0,6,1,1]},planetClimate:controls.planetClimate||{value:[18,1,1,1]},referenceMask:controls.referenceMask||{value:null},referenceEast:controls.referenceEast||{value:[1,0,0]},referenceNorth:controls.referenceNorth||{value:[0,0,1]},referenceActive:controls.referenceActive||{value:0},materialAtlas:controls.materialAtlas||{value:0},surfaceDebug:controls.surfaceDebug||{value:0}});
 s.vertexShader='attribute vec3 hydraulicData;varying vec3 vHydraulic;attribute vec3 biomeData;varying vec3 vBiome;attribute vec3 planetPosition;attribute vec3 surfaceData;varying vec3 vSurfaceData;varying vec3 vPlanet;varying vec3 vGeoNormal;\n'+s.vertexShader;
 s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHydraulic=hydraulicData;vBiome=biomeData;vPlanet=planetPosition;vGeoNormal=normal;vSurfaceData=surfaceData;');
 if(outcrop){s.vertexShader='uniform vec3 outcropAnchor;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('vPlanet=planetPosition;vGeoNormal=normal;','vPlanet=(instanceMatrix*vec4(position,1.)).xyz+outcropAnchor;mat3 cropMatrix=mat3(instanceMatrix);vec3 cropScale=vec3(dot(cropMatrix[0],cropMatrix[0]),dot(cropMatrix[1],cropMatrix[1]),dot(cropMatrix[2],cropMatrix[2]));vGeoNormal=normalize(cropMatrix*(normal/cropScale));');}
 s.fragmentShader=`varying vec3 vHydraulic;varying vec3 vBiome;varying vec3 vSurfaceData;varying vec3 vPlanet;varying vec3 vGeoNormal;
 uniform sampler2D rockMap,sandMap,mudMap,rockNormal,sandNormal,mudNormal,rockSurface,sandSurface,mudSurface;
 uniform sampler2D histogramLUT,snowNormalMap,snowSurfaceMap,referenceMask;
 uniform float normalMomentsEnabled,materialAtlas,surfaceOrganic;
 uniform float sedimentCover,seaLevel,surfaceWater,histogramEnabled,referenceActive,surfaceDebug;
 uniform vec3 referenceEast,referenceNorth;
 uniform vec4 planetClimate,materialProfile;uniform vec2 planetMaskSize;
 vec3 terrainDx,terrainDy;
 ${coastalGLSL}
 ${noiseGLSL}
 ${regionalMaterialGLSL}
 vec4 maskCubic(vec4 a,vec4 b,vec4 c,vec4 d,float t){return b+.5*t*(c-a+t*(2.*a-5.*b+4.*c-d+t*(3.*(b-c)+d-a)));}
 vec4 parentMaskTexel(ivec2 p){ivec2 size=ivec2(planetMaskSize);if(p.y<0){p.y=-p.y;p.x+=size.x/2;}else if(p.y>=size.y){p.y=2*(size.y-1)-p.y;p.x+=size.x/2;}p.x=(p.x%size.x+size.x)%size.x;return texelFetch(referenceMask,p+ivec2(${PARENT_X},${PARENT_Y}),0);}
 vec4 parentGeology(vec2 uv){vec2 q=uv*vec2(planetMaskSize.x,planetMaskSize.y-1.),f=fract(q);ivec2 cell=ivec2(floor(q));vec4 rows[4];for(int y=0;y<4;y++)rows[y]=maskCubic(parentMaskTexel(cell+ivec2(-1,y-1)),parentMaskTexel(cell+ivec2(0,y-1)),parentMaskTexel(cell+ivec2(1,y-1)),parentMaskTexel(cell+ivec2(2,y-1)),f.x);return clamp(maskCubic(rows[0],rows[1],rows[2],rows[3],f.y),0.,1.);}
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
 // Gaussian inputs are normalized by the blending weights' variance, then
 // reconstructed through a per-material inverse histogram in linear color.
 vec3 sampleGaussian(sampler2D tex,vec2 uv,vec2 dx,vec2 dy){
  vec2 grid=mat2(1.,0.,-.57735027,1.15470054)*uv*1.1,cell=floor(grid),f=fract(grid);vec3 bw;vec2 b,c;
  if(f.x+f.y<1.){bw=vec3(1.-f.x-f.y,f.x,f.y);b=cell+vec2(1,0);c=cell+vec2(0,1);}
  else{bw=vec3(f.x+f.y-1.,1.-f.x,1.-f.y);cell+=vec2(1,1);b=cell-vec2(1,0);c=cell-vec2(0,1);}
  bw=pow(bw,vec3(3.));bw/=dot(bw,vec3(1.));
  vec3 g=tileSample(tex,uv,cell,dx,dy,false).rgb*bw.x+tileSample(tex,uv,b,dx,dy,false).rgb*bw.y+tileSample(tex,uv,c,dx,dy,false).rgb*bw.z;
  return .5+(g-.5)*inversesqrt(max(dot(bw,bw),.0001));
 }
 vec3 triColor(sampler2D tex,vec3 p,vec3 w,float scale,float row){
  if(histogramEnabled<.5)return tri(tex,p,w,scale).rgb;
  vec3 g=vec3(0.);
  if(w.x>0.)g+=sampleGaussian(tex,p.yz,terrainDx.yz*scale,terrainDy.yz*scale)*w.x;
  if(w.y>0.)g+=sampleGaussian(tex,p.zx,terrainDx.zx*scale,terrainDy.zx*scale)*w.y;
  if(w.z>0.)g+=sampleGaussian(tex,p.xy,terrainDx.xy*scale,terrainDy.xy*scale)*w.z;
  g=clamp(.5+(g-.5)*inversesqrt(max(dot(w,w),.0001)),0.,1.);float y=(row+.5)/3.;
  return vec3(texture2D(histogramLUT,vec2(g.r,y)).r,texture2D(histogramLUT,vec2(g.g,y)).g,texture2D(histogramLUT,vec2(g.b,y)).b);
 }
 float normalVariance(sampler2D tex,vec3 p,vec3 w,float scale){
  float variance=0.;
  if(w.x>0.){float sigma=sampleTile(tex,p.yz,terrainDx.yz*scale,terrainDy.yz*scale,false).a*4.;variance+=sigma*sigma*w.x;}
  if(w.y>0.){float sigma=sampleTile(tex,p.zx,terrainDx.zx*scale,terrainDy.zx*scale,false).a*4.;variance+=sigma*sigma*w.y;}
  if(w.z>0.){float sigma=sampleTile(tex,p.xy,terrainDx.xy*scale,terrainDy.xy*scale,false).a*4.;variance+=sigma*sigma*w.z;}
  return variance;
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
 float dist=length(vViewPosition),detailed=1.-smoothstep(.65,3.5,max(length(terrainDx),length(terrainDy)));
 float footprint=max(length(terrainDx),length(terrainDy));
 float province=mix(ns(vPlanet*.002),.5,smoothstep(.5,2.,footprint*.002)),deposits=mix(ns(vPlanet*.018),.5,smoothstep(.5,2.,footprint*.018)),grain=mix(ns(vPlanet*.19),.5,smoothstep(.5,2.,footprint*.19));
 vec2 referenceXY=vec2(dot(radial,referenceEast),dot(radial,referenceNorth))*60000.;
 float referenceBlend=referenceActive*step(0.,dot(radial,cross(referenceEast,referenceNorth)))*(1.-smoothstep(2700.,3900.,length(referenceXY)));
 // Grid samples sit at cell vertices; align GPU texel centres with CPU masks.
 vec2 referenceUV=(referenceXY/8192.+.5)*(512./513.)+vec2(.5/513.);
 vec2 localMaskUV=clamp(referenceUV,vec2(0.),vec2(1.));
 if(materialAtlas>.5)localMaskUV=(localMaskUV*513.+vec2(0.,${REFERENCE_Y}.))/vec2(${ATLAS_WIDTH}.,${ATLAS_HEIGHT}.);
 vec4 geology=texture2D(referenceMask,localMaskUV);
 vec4 globalGeology=vec4(vSurfaceData.r,vSurfaceData.g,vHydraulic.x,vHydraulic.y);
 float materialResident=0.,pageDecal=0.;vec3 pageColor,parentColor,pageSurface,parentSurface,pageGradient=vec3(0.),unusedGradient;float unusedDecal;
 vec2 pagePixel=vec2(0.);
 if(materialAtlas>.5){
  vec2 globalUV=vec2(fract(.5+atan(radial.x,radial.z)/6.283185307),clamp(.5-asin(clamp(radial.y,-1.,1.))/3.141592654,0.,.999999));
  vec2 pagePosition=globalUV*vec2(${PAGE_COLUMNS}.,${PAGE_ROWS}.);ivec2 page=ivec2(floor(pagePosition));
  vec4 table=texelFetch(referenceMask,page+ivec2(${TABLE_X},${TABLE_Y}),0);materialResident=table.a;
  if(materialResident>.5){vec2 slot=floor(table.rg*255.+.5);pagePixel=slot*${PAGE_STRIDE}.+vec2(1.)+fract(pagePosition)*${PAGE_SIZE}.;globalGeology=texture2D(referenceMask,(pagePixel+vec2(0.,${CACHE_Y}.))/vec2(${ATLAS_WIDTH}.,${ATLAS_HEIGHT}.));}
  else if(planetMaskSize.x>0.)globalGeology=parentGeology(globalUV);
 }
 vec4 composedGeology=mix(globalGeology,geology,referenceBlend);
 regionalMaterial(radial,composedGeology,materialProfile,planetClimate,false,parentColor,parentSurface,unusedGradient,unusedDecal);
 pageColor=parentColor;pageSurface=parentSurface;
 if(footprint<32.){
  if(materialResident>.5){vec4 bakedColor=texture2D(referenceMask,(pagePixel+vec2(${COLOR_X}.,${COLOR_Y}.))/vec2(${ATLAS_WIDTH}.,${ATLAS_HEIGHT}.));pageColor=bakedColor.rgb;pageDecal=bakedColor.a;pageSurface=texture2D(referenceMask,(pagePixel+vec2(${SURFACE_X}.,${SURFACE_Y}.))/vec2(${ATLAS_WIDTH}.,${ATLAS_HEIGHT}.)).rgb;pageGradient=(texture2D(referenceMask,(pagePixel+vec2(${NORMAL_X}.,${NORMAL_Y}.))/vec2(${ATLAS_WIDTH}.,${ATLAS_HEIGHT}.)).rgb*255.-128.)*(.125/127.);}
  else regionalMaterial(radial,composedGeology,materialProfile,planetClimate,true,pageColor,pageSurface,pageGradient,pageDecal);
 }
 float mesoDetail=1.-smoothstep(8.,32.,footprint);pageColor=mix(parentColor,pageColor,mesoDetail);pageSurface=mix(parentSurface,pageSurface,mesoDetail);pageGradient*=mesoDetail;
 float deposition=mix(globalGeology.r*vSurfaceData.b,geology.r,referenceBlend),bedrock=mix(globalGeology.g*vSurfaceData.b,geology.g,referenceBlend);
 float drainage=mix(globalGeology.b,geology.b,referenceBlend);
 float horizonVisibility=mix(globalGeology.a,geology.a,referenceBlend);
 float badlands=vHydraulic.z*vSurfaceData.b*(1.-referenceBlend)*(1.-vBiome.y)*(1.-vBiome.z)*(1.-vBiome.x);
 float exposed=smoothstep(.035,.22,slope)+(province-.5)*.22+bedrock*.28-deposition*sedimentCover*.30+(1.-sedimentCover)*.5;
 float rockWeight=clamp(exposed+(pageSurface.b-.5)*.24,0.,1.);
 rockWeight=mix(rockWeight,1.,vBiome.y);rockWeight*=1.-vBiome.z*.75;
 float mudWeight=(1.-rockWeight)*smoothstep(.30,.70,deposits)*mix(.3,.85,deposition)*(1.-smoothstep(.01,.08,slope));
 ${outcrop?'rockWeight=1.;mudWeight=0.;deposition=0.;bedrock=1.;':''}
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
  if(weights.x>0.)base+=triColor(rockMap,rp,w,1./1.8,0.)*weights.x;
  if(weights.y>0.)base+=triColor(sandMap,sp,w,.5,1.)*weights.y;
  if(weights.z>0.)base+=triColor(mudMap,mp,w,1./1.5,2.)*weights.z;
 }
 float strata=ns(vec3(elevation*.033+ns(vPlanet*.004)*1.5,province*3.,11.));
 float localVariation=mix(ns(vPlanet*.13),.5,smoothstep(.5,2.,footprint*.13));
 vec3 weathering=mix(vec3(.81,.78,.72),vec3(1.06,1.0,.90),mix(ns(vPlanet*.008),.5,smoothstep(.5,2.,footprint*.008)));
 // Regional appearance comes from geology, not enlarged close-up scans.
 vec3 regionalRock=mix(vec3(.27,.25,.225),vec3(.38,.32,.25),smoothstep(.22,.75,bedrock));
 vec3 regionalSoil=mix(vec3(.39,.285,.175),vec3(.48,.39,.27),deposition);
 vec3 broad=mix(regionalSoil,regionalRock,rockWeight);
 broad=pageColor;
 base*=mix(vec3(1.),clamp(pageColor/max(parentColor,vec3(.02)),vec3(.65),vec3(1.4)),mesoDetail);
 diffuseColor.rgb=mix(broad,base,detailed)*weathering*(.96+.05*grain);
 // Mesoscale exposed beds and talus remain visible between scan and orbital scales.
 float meso=ns(vPlanet*.012+vec3(7.,3.,19.));
 float bedPhase=elevation*.018+ns(vPlanet*.0014)*2.;
 float bedsVisible=1.-smoothstep(.4,2.,footprint*.018);
 float strataBand=.5+.5*sin(bedPhase);
 vec3 mesoColor=mix(vec3(.23,.205,.175),vec3(.43,.35,.25),meso);
 diffuseColor.rgb=mix(diffuseColor.rgb,mesoColor,.10*(1.-detailed)*(1.-referenceBlend));
 diffuseColor.rgb*=1.+(strataBand-.5)*.13*bedsVisible*smoothstep(.03,.24,slope);
 // Kilometre-scale mineral provinces retain structure after scan textures fade.
 float macroRock=ns(vPlanet*.00037+vec3(31.,-17.,9.));
 float macroDust=ns(vPlanet*.0012+vec3(-13.,27.,5.));
 vec3 mineralTint=mix(vec3(.78,.83,.88),vec3(1.13,.99,.80),smoothstep(.25,.75,macroRock));
 diffuseColor.rgb*=mix(mineralTint*mix(.88,1.10,macroDust),vec3(1.),referenceBlend);
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
 // Climate-driven elevation belts: lapse rate, latitude, rainfall and atmosphere.
 float altitude=max(0.,elevation-seaLevel);
 float localTemp=planetClimate.x-58.*radial.y*radial.y-altitude*.0065;
 float rainfall=smoothstep(.27,.72,ns(radial.zxy*4.+vec3(17.,31.,7.)));
 float moisture=clamp(rainfall+.22*exp(-altitude/450.)-.22*smoothstep(500.,1700.,altitude)+drainage*.24,0.,1.);
 float life=surfaceOrganic*smoothstep(.12,.55,planetClimate.y)*smoothstep(-6.,6.,localTemp)*(1.-smoothstep(30.,48.,localTemp));
 float lowlands=1.-smoothstep(250.*planetClimate.z,1000.*planetClimate.z,altitude);
 float meadow=life*smoothstep(.23,.65,moisture)*lowlands*(1.-smoothstep(.06,.25,slope))*(1.-vBiome.y)*(1.-vBiome.z);
 float coverPatch=ns(vPlanet*.007+vec3(13.,5.,23.));
 meadow*=mix(.55,1.,smoothstep(.25,.7,coverPatch));
 ${outcrop?'meadow=0.;':''}
 vec3 grassColor=mix(vec3(.20,.19,.055),vec3(.065,.18,.045),moisture);
 grassColor=mix(grassColor,vec3(.27,.25,.09),smoothstep(19.,32.,localTemp)*.6);
 diffuseColor.rgb=mix(diffuseColor.rgb,grassColor*(.72+surfaceLuma*.8)*(.85+.3*grain),meadow*.94);
 float alpine=smoothstep(350.*planetClimate.z,1150.*planetClimate.z,altitude)*(1.-meadow)*(1.-vBiome.y)*(1.-vBiome.z);
 vec3 alpineRock=mix(vec3(.24,.25,.27),vec3(.42,.40,.35),macroRock);
 diffuseColor.rgb=mix(diffuseColor.rgb,alpineRock*(.75+surfaceLuma*.8),alpine*.68);
 // Wind strips steep faces; cold shaded gullies retain snow below the snowline.
 float snowTemperature=localTemp+slope*5.;
 float snowCover=planetClimate.w*(1.-smoothstep(-5.,2.,snowTemperature))*(1.-smoothstep(.14,.48,slope));
 float glacier=planetClimate.w*(1.-smoothstep(-24.,-12.,localTemp))*(1.-smoothstep(.025,.13,slope))*smoothstep(.55,.9,deposition);
 // Snow is an opaque blanket. Blue ice is confined to glacial accumulation
 // hollows rather than painted with magnified rock-scan luminance.
 float snowGrain=mix(ns(vPlanet*2.7),.5,smoothstep(.12,.7,footprint));
 float snowDrift=ns(vPlanet*.035+vec3(3.,17.,5.));
 float icePhase=dot(vPlanet,normalize(vec3(.31,.17,.93)))*.32+ns(vPlanet*.009)*1.8;
 float iceCrack=(1.-smoothstep(.015,.065,abs(sin(icePhase))))*(1.-smoothstep(.6,3.,footprint));
 vec3 snowColor=vec3(.86,.89,.91)*(.98+.025*(snowDrift-.5));
 vec3 snowData=vec3(.91,1.,.5);
 // Snow grain and roughness share one map, retaining the WebGL2 16-sampler
 // budget including Three's DFG LUT, environment map and directional shadow.
 if(detailed>0.&&snowCover>.01){snowData=tri(snowSurfaceMap,vPlanet/4.,w,.25).rgb;float grainSnow=clamp((snowData.r-.78)/.18,0.,1.);snowColor=mix(snowColor,vec3(.82,.86,.90)+vec3(.05,.04,.03)*grainSnow,detailed);}
 vec3 iceColor=mix(vec3(.66,.78,.82),vec3(.26,.43,.50),iceCrack*.65);
 diffuseColor.rgb=mix(diffuseColor.rgb,mix(snowColor,iceColor,glacier*.55),snowCover);

 vec3 shoreField=coastalSample(vPlanet);
 float wetShore=surfaceWater*max(1.-smoothstep(0.,2.2,elevation-seaLevel),drainage*deposition*.40)*(1.-snowCover);
 vec3 debugColor=diffuseColor.rgb;
 if(surfaceDebug>.5&&surfaceDebug<1.5)debugColor=mix(vec3(.68,.38,.14),vec3(.29,.31,.34),rockWeight);
 if(surfaceDebug>1.5&&surfaceDebug<2.5)debugColor=vec3(drainage);
 if(surfaceDebug>2.5&&surfaceDebug<3.5)debugColor=vec3(deposition,bedrock,0.);
 if(surfaceDebug>3.5&&surfaceDebug<4.5)debugColor=gn*.5+.5;
 if(surfaceDebug>4.5&&surfaceDebug<5.5)debugColor=mix(vec3(.02,.4,.06),vec3(.8,.04,.02),smoothstep(.15,4.,footprint));
 if(surfaceDebug>5.5&&surfaceDebug<6.5)debugColor=vec3(snowCover);
 if(surfaceDebug>6.5&&surfaceDebug<7.5)debugColor=vec3(horizonVisibility);
 if(surfaceDebug>7.5&&surfaceDebug<8.5)debugColor=mix(vec3(.8,.12,.03),vec3(.05,.65,.20),materialResident);
 if(surfaceDebug>8.5)debugColor=vec3(pageDecal);
 float shoreLiquid=planetClimate.w>.5?smoothstep(-8.,0.,planetClimate.x-58.*pow(normalize(vPlanet).y,2.)):1.;
 wetShore=mix(wetShore,surfaceWater*max(coastalWet(vPlanet,shoreField,elevation-seaLevel)/max(shoreField.z,.001),drainage*deposition*.40)*(1.-snowCover),shoreField.z*shoreLiquid);
 diffuseColor.rgb*=mix(1.,.52,wetShore);
 `);
 s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=clamp(dot(vec3(rockData.r,sandData.r,mudData.r),weights),.55,1.);roughnessFactor=mix(roughnessFactor,pageSurface.r,1.-detailed+detailed*pageDecal*.5);roughnessFactor=mix(roughnessFactor,.84,vBiome.y);roughnessFactor=mix(roughnessFactor,.97,vBiome.z);roughnessFactor=mix(roughnessFactor,.98,meadow);roughnessFactor=mix(roughnessFactor,mix(snowData.r,.30,glacier),snowCover);roughnessFactor=mix(roughnessFactor,.26,wetShore);
 if(normalMomentsEnabled>.5){
  float variance=0.;
  if(weights.x>.01)variance+=normalVariance(rockNormal,rp,w,1./1.8)*weights.x;
  if(weights.y>.01)variance+=normalVariance(sandNormal,sp,w,.5)*weights.y;
  if(weights.z>.01)variance+=normalVariance(mudNormal,mp,w,1./1.5)*weights.z;
  variance*=1.-snowCover;
  roughnessFactor=clamp(pow(pow(roughnessFactor,4.)+variance*.12,.25),.04,1.);
 }`);
 s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec3 gradient=vec3(0.);
 if(detailed>0.){
  if(weights.x>.01)gradient+=triGradient(rockNormal,rp,w,1./1.8)*weights.x;
  if(weights.y>.01)gradient+=triGradient(sandNormal,sp,w,.5)*weights.y;
  if(weights.z>.01)gradient+=triGradient(mudNormal,mp,w,1./1.5)*weights.z;
 }
 gradient*=detailed;
 gradient-=pageGradient*${outcrop?'0.':'1.'};

 gradient*=1.-vBiome.z*.88;gradient*=1.-snowCover*.97;
 if(detailed>0.&&snowCover>.01)gradient+=triGradient(snowNormalMap,vPlanet/4.,w,.25)*snowCover*detailed;
 vec3 driftDirection=normalize(vec3(.83,.12,.54));
 float driftPhase=dot(vPlanet,driftDirection)*1.6+ns(vPlanet*.018)*3.;
 gradient+=driftDirection*cos(driftPhase)*.018*snowCover*(1.-smoothstep(.25,1.5,footprint));
 vec3 wind=normalize(vec3(.88,.12,.47));
 float ripplePhase=dot(vPlanet,wind)*18.+ns(vPlanet*.06)*2.;
 wind-=gn*dot(wind,gn);
 gradient+=wind*cos(ripplePhase)*.09*vBiome.z*(1.-smoothstep(.03,.18,footprint));
 gradient-=gn*dot(gn,gradient);
 normal=normalize(mat3(viewMatrix)*normalize(gn+gradient*.7*(1.-vBiome.x*.8)));
 `);
 s.fragmentShader=s.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
 float scannedAO=mix(dot(vec3(rockData.g,sandData.g,mudData.g),weights),1.,snowCover);
 reflectedLight.indirectDiffuse*=mix(1.,scannedAO,.70*detailed)*horizonVisibility*mix(1.,pageSurface.g,1.-detailed);
 `);
 s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','if(surfaceDebug>.5)outgoingLight=debugColor;\n#include <opaque_fragment>');
 };}
export const atmosphereVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export const atmosphereFragment=`precision highp float;
varying vec2 vUv;uniform sampler2D sceneColor,sceneDepth;uniform mat4 invProjection,camWorld;uniform vec3 origin,sunDir;uniform float cameraNear,cameraFar,air,exposure,surfaceDebug;uniform vec2 resolution;uniform int quality;
${skyGLSL}
vec2 sphere(vec3 o,vec3 d,float r){return skySphere(o,d,r);}
vec2 density(vec3 p){return skyDensity(p);}
vec3 tonemap(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec4 view=invProjection*vec4(vUv*2.-1.,1.,1.);vec3 vr=normalize(view.xyz/view.w),ray=normalize(mat3(camWorld)*vr);vec3 o=origin*.001;
 float z=texture2D(sceneDepth,vUv).x;float viewZ=(cameraNear*cameraFar)/((cameraFar-cameraNear)*z-cameraFar);float limit=z<.999999?-viewZ/max(-vr.z,.00001)*.001:1e8;
 vec3 color=texture2D(sceneColor,vUv).rgb;
 if(surfaceDebug>.5){gl_FragColor=vec4(pow(max(color,vec3(0.)),vec3(1./2.2)),1.);return;}
 // Short-range contact occlusion, reconstructed from the final surface depth.
 // Distant terrain and sky skip it; neither mesh detail nor water is displaced.
 vec3 viewPoint=vr*(-viewZ/max(-vr.z,.00001));
 if(quality==1&&z<.999999&&-viewZ<800.){
  vec3 contactNormal=normalize(cross(dFdx(viewPoint),dFdy(viewPoint)));
  if(dot(contactNormal,viewPoint)>0.)contactNormal=-contactNormal;
  float radiusPixels=clamp(resolution.y*2.2/max(-viewZ,1.),2.,26.),occlusion=0.;
  for(int ao=0;ao<8;ao++){
   float angle=float(ao)*2.39996323;
   vec2 sampleUV=clamp(vUv+vec2(cos(angle),sin(angle))*radiusPixels*(.4+float(ao)*.075)/resolution,vec2(.001),vec2(.999));
   float sampleZ=texture2D(sceneDepth,sampleUV).r;
   float sampleViewZ=(cameraNear*cameraFar)/((cameraFar-cameraNear)*sampleZ-cameraFar);
   vec4 sampleRay=invProjection*vec4(sampleUV*2.-1.,1.,1.);vec3 rd=normalize(sampleRay.xyz/sampleRay.w);
   vec3 delta=rd*(-sampleViewZ/max(-rd.z,.00001))-viewPoint;float separation=length(delta);
   if(sampleZ<.999999&&separation>.01)occlusion+=max(0.,dot(contactNormal,delta/separation)-.07)*(1.-smoothstep(.35,3.,separation));
  }
  color*=1.-clamp(occlusion/8.*1.5,0.,.28);
 }

 // Sparse procedural stars remain behind the atmosphere and planet.
 if(z>=.999999){vec3 cell=floor(ray*1600.);float seed=fract(sin(dot(cell,vec3(12.9898,78.233,39.425)))*43758.5453);color+=vec3(.55,.66,.82)*pow(seed,950.)*.7;float solar=dot(ray,sunDir);color+=vec3(12.,10.,7.)*smoothstep(.999974,.999987,solar);}
 vec2 hit=sphere(o,ray,66.);float a=max(0.,hit.x),b=min(hit.y,limit);
 if(b>a&&air>.001){vec3 br=skyRayleigh,bm=skyMie;float mu=dot(ray,sunDir),pr=3./(16.*3.141593)*(1.+mu*mu),g=.76,pm=3./(8.*3.141593)*((1.-g*g)*(1.+mu*mu))/((2.+g*g)*pow(1.+g*g-2.*g*mu,1.5));
 vec2 optical=vec2(0.);vec3 sr=vec3(0.),sm=vec3(0.);int steps=quality==1?16:10;float stepSize=(b-a)/float(steps);
 for(int i=0;i<16;i++){if(i>=steps)break;vec3 p=o+ray*(a+(float(i)+.5)*stepSize);vec2 local=density(p)*stepSize;optical+=local*.5;vec2 planet=sphere(p,sunDir,60.);bool shadow=planet.y>0.&&planet.x>0.;if(!shadow){float sunLength=max(0.,sphere(p,sunDir,66.).y);vec2 sunOpt=vec2(0.);for(int j=0;j<5;j++){sunOpt+=density(p+sunDir*((float(j)+.5)*sunLength/5.))*sunLength/5.;}vec3 attenuation=exp(-(br*(optical.x+sunOpt.x)+bm*(optical.y+sunOpt.y)));sr+=attenuation*local.x;sm+=attenuation*local.y;}optical+=local*.5;}
 color=color*exp(-(br*optical.x+bm*optical.y))+(sr*br*pr+sm*bm*pm)*17.;}
 color=tonemap(color*exposure);color=pow(color,vec3(1./2.2));float vignette=1.-.12*pow(length(vUv-.5)*1.4,2.);gl_FragColor=vec4(color*vignette,1.);}
`;
