// Shared single-scattering coefficients and density profiles, in kilometres.
// Both the atmospheric pass and ocean reflection use this radiance model.
export const skyGLSL=`
const vec3 skyRayleigh=vec3(.045,.095,.205),skyMie=vec3(.035);
vec2 skySphere(vec3 o,vec3 d,float r){float b=dot(o,d),c=dot(o,o)-r*r,h=b*b-c;if(h<0.)return vec2(1e9,-1e9);return vec2(-b-sqrt(h),-b+sqrt(h));}
vec2 skyDensity(vec3 p){float h=max(0.,length(p)-60.);return vec2(exp(-h/1.25),exp(-h/.24))*air;}
vec3 reflectedSky(vec3 point,vec3 direction){
 vec3 o=point*.001;vec2 hit=skySphere(o,direction,66.);float start=max(0.,hit.x),end=hit.y;
 vec2 ground=skySphere(o,direction,59.999);if(ground.x>0.)end=min(end,ground.x);
 if(end<=start||air<.001)return vec3(.001);
 float mu=dot(direction,sunDir),pr=3./(16.*3.141593)*(1.+mu*mu),g=.76;
 float pm=3./(8.*3.141593)*((1.-g*g)*(1.+mu*mu))/((2.+g*g)*pow(1.+g*g-2.*g*mu,1.5));
 vec2 optical=vec2(0.);vec3 sr=vec3(0.),sm=vec3(0.);float stepSize=(end-start)/8.;
 for(int i=0;i<8;i++){
  vec3 p=o+direction*(start+(float(i)+.5)*stepSize);vec2 local=skyDensity(p)*stepSize;optical+=local*.5;
  vec2 shadow=skySphere(p,sunDir,60.);
  if(!(shadow.x>0.&&shadow.y>0.)){
   float distance=max(0.,skySphere(p,sunDir,66.).y);vec2 sunOpt=vec2(0.);
   for(int j=0;j<4;j++)sunOpt+=skyDensity(p+sunDir*((float(j)+.5)*distance/4.))*distance/4.;
   vec3 transmission=exp(-(skyRayleigh*(optical.x+sunOpt.x)+skyMie*(optical.y+sunOpt.y)));
   sr+=transmission*local.x;sm+=transmission*local.y;
  }optical+=local*.5;
 }
 return(sr*skyRayleigh*pr+sm*skyMie*pm)*17.+vec3(.001);
}
`;

export const skyEnvironmentVertex=`
varying vec3 direction;
void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
export const skyEnvironmentFragment=`
precision highp float;
varying vec3 direction;
uniform float air;
uniform vec3 sunDir,skyPoint;
${skyGLSL}
void main(){gl_FragColor=vec4(reflectedSky(skyPoint,normalize(direction)),1.);}
`;
