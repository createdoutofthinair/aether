import {skyGLSL} from './sky-light.js?v=terrain-6';
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
uniform float cameraNear,cameraFar,seaRadius,seaTemperature,time,air,sunIntensity;
uniform int quality;
uniform bool waterEnabled,iceEnabled;
const float PI=3.14159265359;
float linearDepth(float z){return cameraNear*cameraFar/(cameraFar-z*(cameraFar-cameraNear));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
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
 // Broken foam collects only in a shallow band; the wave modulation is filtered.
 float breakUp=noise(p.xz*.37+vec2(time*.13,-time*.09));
 float foam=(1.-smoothstep(.08,1.35,thickness))*smoothstep(.28,.68,breakUp+.12*sin(time*1.4+thickness*4.));
 foam=max(foam,smoothstep(.20,.38,length(slope))*.35);
 foam*=1.-smoothstep(400.,2400.,waterT);
 color=mix(color,vec3(.58,.65,.65)*(.4+.6*max(0.,dot(up,sunDir))),foam*.72*(1.-frozen));
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
