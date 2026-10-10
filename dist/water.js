import {skyGLSL} from './sky-light.js?v=terrain-10';
// The opaque scene is resolved first. Water reads that scene, then writes a
// separate colour/depth target for the atmosphere; there is no feedback loop.
export const waterVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;

export const waterFragment=`precision highp float;
varying vec2 vUv;
uniform sampler2D sceneColor,sceneDepth,wave0,wave1,wave2,waveNext0,waveNext1,waveNext2;
uniform float waveMix;
uniform mat4 invProjection,camWorld,seaView,seaProjection;
uniform vec3 origin,sunDir,sunColor;
uniform vec2 resolution;
uniform float cameraNear,cameraFar,seaRadius,seaTemperature,time,air,sunIntensity,surfaceDebug;
uniform int quality;
uniform bool waterEnabled,iceEnabled;
const float PI=3.14159265359;
float linearDepth(float z){return cameraNear*cameraFar/(cameraFar-z*(cameraFar-cameraNear));}
// Arithmetic hash avoids the large-coordinate sine quantisation visible as grids.
vec2 foamHash(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
float hash(vec2 p){return foamHash(p).x;}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
// Nearest and second-nearest jittered sites define a cellular film. Cells are
// centimetres across, never metre-sized white disks. Integrate unresolved cells
// toward their mean area coverage instead of letting them sparkle or disappear.
float bubbleFilm(vec2 q,float footprint){
 vec2 cell=floor(q),f=fract(q);float first=10.,second=10.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 o=vec2(float(x),float(y)),site=o+.15+.7*foamHash(cell+o)-f;
  float d=dot(site,site);if(d<first){second=first;first=d;}else second=min(second,d);
 }
 float gap=sqrt(second)-sqrt(first),aa=max(.015,footprint*.7);
 float film=1.-smoothstep(.035-aa,.095+aa,gap);
 return mix(film,.27,smoothstep(.25,.9,footprint));
}
float foamLayer(vec2 q,float pixel,float depth,float crest){
 vec2 drift=vec2(.11,.065)*time;
 vec2 advected=q-drift;
 vec2 warp=vec2(noise(advected*.43),noise(advected*.43+19.7))-.5;
 vec2 cells=advected+warp*.28;
 float coarse=noise(advected*.19),medium=noise(advected*1.73+warp);
 // Smooth irregular patches; a connected dense wash grades into lace-like film.
 float patchiness=.58*coarse+.42*medium;
 float phase=time*.72-depth*2.1+coarse*2.;
 float wash=.5+.5*sin(phase);
 float shore=(1.-smoothstep(.12,1.65,depth))*(.28+.72*wash);
 float density=clamp(shore+crest,0.,1.);
 float aa=max(.025,min(.22,pixel*.35));
 float coverage=smoothstep(.54-density*.44-aa,.64-density*.44+aa,patchiness);
 float small=.27;
 if(pixel*18.<.9)small=bubbleFilm(cells*18.,pixel*18.);
 float large=.27;
 if(pixel*6.3<.9)large=bubbleFilm(cells*6.3+7.2,pixel*6.3);
 float lace=mix(.18+.82*small,.35+.65*max(small,large),density);
 return coverage*lace*density;
}
float seaFoam(vec3 p,vec3 up,float pixel,float depth,float crest){
 vec3 w=pow(abs(up),vec3(6.));w/=dot(w,vec3(1.));
 // World-space triplanar projection prevents latitude seams and polar stretching.
 float result=0.;
 if(w.x>.001)result+=foamLayer(p.yz,pixel,depth,crest)*w.x;
 if(w.y>.001)result+=foamLayer(p.xz,pixel,depth,crest)*w.y;
 if(w.z>.001)result+=foamLayer(p.xy,pixel,depth,crest)*w.z;
 return result;
}
float seaHit(vec3 o,vec3 d){
 float b=dot(o,d),c=(length(o)-seaRadius)*(length(o)+seaRadius),disc=b*b-c;
 if(disc<0.)return -1.;
 float root=sqrt(max(0.,disc)),den=-b+root;
 float nearHit=abs(den)>.00001?c/den:-b-root;
 return nearHit>0.?nearHit:(-b+root>0.?-b+root:-1.);
}
vec4 band(sampler2D a,sampler2D b,vec3 p,vec3 up,float scale){
 vec3 w=pow(abs(up),vec3(6.));w/=dot(w,vec3(1.));
 vec4 x=mix(texture2D(a,p.yz/scale),texture2D(b,p.yz/scale),waveMix);
 vec4 y=mix(texture2D(a,p.xz/scale),texture2D(b,p.xz/scale),waveMix);
 vec4 z=mix(texture2D(a,p.xy/scale),texture2D(b,p.xy/scale),waveMix);
 vec3 slope=vec3(0.,x.y,x.z)*w.x+vec3(y.y,0.,y.z)*w.y+vec3(z.y,z.z,0.)*w.z;
 return vec4(slope,x.x*w.x+y.x*w.y+z.x*w.z);
}
vec4 seaField(vec3 p,vec3 up){return band(wave0,waveNext0,p,up,768.)+band(wave1,waveNext1,p,up,137.)+band(wave2,waveNext2,p,up,23.);}
${skyGLSL}
// Screen-space reflection of the opaque terrain, with sky fallback when a ray
// leaves the screen. It deliberately does not sample the water output itself.
vec4 terrainReflection(vec3 start,vec3 reflected){
 if(quality!=1)return vec4(0.);
 float previous=0.;
 for(int i=0;i<20;i++){
  float travel=2.+pow(float(i+1),1.8)*2.4;
  vec3 v=(seaView*vec4(start+reflected*travel,0.)).xyz;
  if(v.z>=-.1)break;
  vec4 clip=seaProjection*vec4(v,1.);vec2 uv=clip.xy/clip.w*.5+.5;
  if(any(lessThan(uv,vec2(.015)))||any(greaterThan(uv,vec2(.985))))break;
  float depth=texture2D(sceneDepth,uv).r,difference=-v.z-linearDepth(depth);
  if(depth<.999999&&difference>0.&&difference<max(1.,travel*.045)&&previous<=0.){
   float edge=min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y));
   return vec4(texture2D(sceneColor,uv).rgb,smoothstep(.015,.12,edge)*(1.-smoothstep(450.,650.,travel)));
  }
  previous=difference;
 }
 return vec4(0.);
}
void main(){
 float opaqueZ=texture2D(sceneDepth,vUv).r;vec3 opaque=texture2D(sceneColor,vUv).rgb;
 gl_FragDepth=opaqueZ;gl_FragColor=vec4(opaque,1.);
 if(!waterEnabled)return;
 vec4 v=invProjection*vec4(vUv*2.-1.,1.,1.);
 vec3 viewRay=normalize(v.xyz/v.w),ray=normalize(mat3(camWorld)*viewRay);
 float waterT=seaHit(origin,ray);if(waterT<=0.)return;
 // Radial displacement converges only away from grazing rays and shores.
 float baseT=waterT;vec3 basePoint=origin+ray*baseT,baseUp=normalize(basePoint);
 float baseOpaqueT=opaqueZ<.999999?linearDepth(opaqueZ)/max(-viewRay.z,.00001):1e9;
 float shoreFade=smoothstep(0.,12.,(baseOpaqueT-baseT)*max(.08,abs(dot(baseUp,ray))));
 float incidence=dot(baseUp,ray),displace=shoreFade*smoothstep(.12,.35,-incidence)*(1.-smoothstep(1500.,9000.,baseT));
 float baseFrozen=iceEnabled?1.-smoothstep(-8.,0.,seaTemperature-58.*baseUp.y*baseUp.y):0.;displace*=1.-baseFrozen;
 for(int j=0;j<2;j++){vec3 q=origin+ray*waterT;float residual=length(q)-seaRadius-seaField(q,normalize(q)).w*displace;waterT-=residual/min(-.12,incidence);}

 float opaqueT=opaqueZ<.999999?linearDepth(opaqueZ)/max(-viewRay.z,.00001):1e9;
 float difference=opaqueT-waterT;
 float edgeWidth=max(.012,min(1.5,fwidth(difference)*.6));
 if(difference<-edgeWidth)return;
 vec3 p=origin+ray*waterT,up=normalize(p),view=-ray;
 float footprint=max(length(dFdx(p)),length(dFdy(p)));
 float frozen=iceEnabled?1.-smoothstep(-8.,0.,seaTemperature-58.*up.y*up.y):0.;
 vec4 waves=seaField(p,up);
 vec3 slope=waves.xyz-up*dot(waves.xyz,up);
 vec3 normal=normalize(up-slope*(1.-frozen));
 float ndv=max(.001,dot(normal,view)),ndl=max(0.,dot(normal,sunDir));
 float thickness=opaqueZ<.999999?max(0.,difference)*max(.08,dot(up,view)):120.;
 vec3 absorption=vec3(.22,.070,.032),transmission=exp(-absorption*min(thickness,180.));
 vec3 normalView=mat3(seaView)*normal;
 vec2 refractedUV=clamp(vUv+normalView.xy*.007*(1.-exp(-thickness*.35)),vec2(.001),vec2(.999));
 float refractedZ=texture2D(sceneDepth,refractedUV).r;
 vec4 seaClip=seaProjection*vec4(mat3(seaView)*(ray*waterT),1.);
 float waterZ=seaClip.z/seaClip.w*.5+.5;
 if(surfaceDebug>.5){gl_FragDepth=waterZ;gl_FragColor=vec4(frozen>.5?vec3(.16,.42,.72):vec3(.015,.14,.55),1.);return;}
 vec3 bottom=refractedZ>waterZ?texture2D(sceneColor,refractedUV).rgb:opaque;
 vec3 scatter=vec3(.004,.033,.065)*(.35+.65*max(0.,dot(up,sunDir)));
 vec3 body=bottom*transmission+scatter*(1.-transmission);
 vec3 reflected=reflect(ray,normal),reflection=reflectedSky(p+up*.1,reflected);
 if(waterT<6000.&&frozen<.5){vec4 ssr=terrainReflection(ray*waterT+normal*.15,reflected);reflection=mix(reflection,ssr.rgb,ssr.a);}
 float fresnel=.0204+.9796*pow(1.-ndv,5.);
 vec3 halfVector=normalize(view+sunDir);float ndh=max(0.,dot(normal,halfVector)),vdh=max(0.,dot(view,halfVector));
 // Unresolved wave energy becomes reflection roughness rather than vanishing.
 float roughness=sqrt(.055*.055+.12*.12*smoothstep(.3,12.,footprint)+.20*.20*smoothstep(12.,180.,footprint)),a=roughness*roughness,a2=a*a;
 float denom=ndh*ndh*(a2-1.)+1.,D=a2/max(PI*denom*denom,.000001);
 float k=roughness*roughness*.5,Gv=ndv/(ndv*(1.-k)+k),Gl=ndl/(ndl*(1.-k)+k);
 float F=.0204+.9796*pow(1.-vdh,5.);
 vec3 specular=sunColor*sunIntensity*(D*Gv*Gl*F/(4.*ndv+.0001))*ndl;
 vec3 color=body*(1.-fresnel)+reflection*fresnel+min(specular,vec3(14.));
 // Crest foam is a steepness heuristic, not a physical overturning simulation.
 float crest=smoothstep(.24,.42,length(slope))*smoothstep(.02,.22,waves.w)*.22;
 float foam=0.;
 if((thickness<1.65||crest>.001)&&frozen<.999)foam=seaFoam(p,up,footprint,thickness,crest)*(1.-frozen);
 vec3 foamLight=vec3(.74,.78,.76)*(.32+.68*max(0.,dot(up,sunDir)))+reflectedSky(p+up*.1,up)*.09;
 // Opaque, rough bubble films suppress the sharp water reflection beneath them.
 color=mix(color,foamLight,clamp(foam,0.,.94));
 vec3 ice=vec3(.35,.47,.50)*(.3+.7*max(0.,dot(up,sunDir)))+reflectedSky(p+up*.1,up)*.12;
 color=mix(color,ice,frozen);
 float coverage=smoothstep(-edgeWidth,edgeWidth,difference);
 gl_FragColor=vec4(mix(opaque,color,coverage),1.);
 gl_FragDepth=coverage>.5?waterZ:opaqueZ;
}
`;

// Numerical reference used by regression tests for planetary-scale depth.
export function intersectSea(origin,direction,radius){
 const b=origin.reduce((v,x,i)=>v+x*direction[i],0),length=Math.hypot(...origin),c=(length-radius)*(length+radius),disc=b*b-c;
 if(disc<0)return -1;
 const root=Math.sqrt(disc),den=-b+root,near=Math.abs(den)>1e-10?c/den:-b-root;
 return near>0?near:(-b+root>0?-b+root:-1);
}
