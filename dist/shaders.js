export const noiseGLSL=`
float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float ns(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
export function patchTerrain(material,textures){material.onBeforeCompile=s=>{
 Object.assign(s.uniforms,{rockMap:{value:textures.rock},sandMap:{value:textures.sand},rockNormal:{value:textures.rn},sandNormal:{value:textures.sn},rockRough:{value:textures.rr},sandRough:{value:textures.sr},rockAO:{value:textures.ra},sandAO:{value:textures.sa}});
 s.vertexShader='attribute vec3 planetPosition;varying vec3 vPlanet;varying vec3 vGeoNormal;\n'+s.vertexShader;
 s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPlanet=planetPosition;vGeoNormal=normal;');
 s.fragmentShader=`varying vec3 vPlanet;varying vec3 vGeoNormal;uniform sampler2D rockMap,sandMap,rockNormal,sandNormal,rockRough,sandRough,rockAO,sandAO;
 ${noiseGLSL}
 // Identical UV blending for all PBR channels, with a rotated secondary sample.
 vec4 sampleTile(sampler2D tex,vec2 uv){return mix(texture2D(tex,uv),texture2D(tex,vec2(-uv.y,uv.x)*.731+vec2(.37,.61)),.32);}
 vec4 tri(sampler2D tex,vec3 p,vec3 w){return sampleTile(tex,p.yz)*w.x+sampleTile(tex,p.zx)*w.y+sampleTile(tex,p.xy)*w.z;}
 vec2 normalSlope(sampler2D tex,vec2 uv){vec3 a=texture2D(tex,uv).xyz*2.-1.;vec3 b=texture2D(tex,vec2(-uv.y,uv.x)*.731+vec2(.37,.61)).xyz*2.-1.;
  vec2 ga=a.xy/max(a.z,.15),gb=vec2(b.y,-b.x)/max(b.z,.15);return mix(ga,gb*.731,.32);}
 vec3 triGradient(sampler2D tex,vec3 p,vec3 w){vec2 x=normalSlope(tex,p.yz),y=normalSlope(tex,p.zx),z=normalSlope(tex,p.xy);
  return vec3(0.,x.x,x.y)*w.x+vec3(y.y,0.,y.x)*w.y+vec3(z.x,z.y,0.)*w.z;}

 `+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec3 radial=normalize(vPlanet),gn=normalize(vGeoNormal),w=pow(abs(gn),vec3(6.));w/=max(dot(w,vec3(1.)),.001);
 float slope=1.-abs(dot(radial,gn));float macro=ns(vPlanet*.0008);float blend=smoothstep(.025,.19,slope+ns(vPlanet*.006)*.10);
 vec3 r=tri(rockMap,vPlanet*.555556,w).rgb;vec3 sand=tri(sandMap,vPlanet*.5,w).rgb;
 vec3 base=mix(sand*vec3(.96,.92,.86),r*vec3(.96,.94,.90),blend);
 float dist=length(vViewPosition);float detailed=1.-smoothstep(600.,5000.,dist);
 vec3 broad=mix(vec3(.21,.16,.115),vec3(.41,.32,.23),macro);
 diffuseColor.rgb=mix(broad,base,detailed)*(.85+.26*ns(vPlanet*.015));
 `);
 s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=clamp(mix(tri(sandRough,vPlanet*.5,w).r,tri(rockRough,vPlanet*.555556,w).r,blend),.04,1.);`);
 s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 // Convert each projection's tangent-space slopes into planet space first.
 // Project onto the actual surface tangent plane, then transform to view space.
 vec3 gradient=mix(triGradient(sandNormal,vPlanet*.5,w),triGradient(rockNormal,vPlanet*.555556,w),blend);
 gradient-=gn*dot(gn,gradient);
 vec3 mappedNormal=normalize(gn+gradient*.65*detailed);
 normal=normalize(mat3(viewMatrix)*mappedNormal);
 `);
 s.fragmentShader=s.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
 float scannedAO=mix(tri(sandAO,vPlanet*.5,w).r,tri(rockAO,vPlanet*.555556,w).r,blend);
 reflectedLight.indirectDiffuse*=mix(1.,scannedAO,.75*detailed);
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
