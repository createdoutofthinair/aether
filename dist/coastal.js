// Shared coastal bathymetry, atlas sampling and worker-unavailable fallback.
export const COAST_SIZE=128,COAST_STEP=4,COAST_X=1296,COAST_Y=0;
export function encodeCoast(heights,size=COAST_SIZE,step=COAST_STEP){
 const distance=new Float32Array(size*size).fill(1e6),pixels=new Uint8Array(size*size*4);
 let crossings=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,h=heights[i];
  for(const j of [x+1<size?i+1:-1,y+1<size?i+size:-1])if(j>=0&&((h<=0)!==(heights[j]<=0))){const a=Math.abs(h)/(Math.abs(h)+Math.abs(heights[j]));distance[i]=Math.min(distance[i],a*step);distance[j]=Math.min(distance[j],(1-a)*step);crossings++;}
 }
 for(const forward of [true,false])for(let yy=0;yy<size;yy++)for(let xx=0;xx<size;xx++){
  const x=forward?xx:size-1-xx,y=forward?yy:size-1-yy,i=y*size+x,d=forward?-1:1;
  for(const [dx,dy]of [[d,0],[0,d],[d,d],[-d,d]]){const a=x+dx,b=y+dy;if(a>=0&&a<size&&b>=0&&b<size)distance[i]=Math.min(distance[i],distance[b*size+a]+step*Math.hypot(dx,dy));}
 }
 for(let i=0;i<heights.length;i++){const h=Math.max(-64,Math.min(64,heights[i])),v=Math.round((h+64)/128*65535);pixels[i*4]=v>>8;pixels[i*4+1]=v&255;pixels[i*4+2]=Math.round((Math.max(-128,Math.min(128,distance[i]*(heights[i]>0?1:-1)))+128)/256*255);pixels[i*4+3]=255;}
 return{pixels,distance,crossings};
}
export function coastalWash(distance,time){
 const phase=time*.8-distance*.08,level=.72*Math.sin(phase)+.16*Math.sin(phase*2),age=((phase-Math.PI/2)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)/.8;
 return{level,wetness:Math.exp(-age/8)};
}
export const coastalGLSL=`
uniform vec3 coastalCenter,coastalEast,coastalNorth;
uniform float coastalActive,coastalTime,coastalReady,coastalMix;
vec3 coastalSample(vec3 p){
 vec3 n=normalize(p);vec2 q=vec2(dot(n-coastalCenter,coastalEast),dot(n-coastalCenter,coastalNorth))*60000./4.+63.5;
 float edge=min(min(q.x,q.y),min(127.-q.x,127.-q.y));
 if(coastalActive<.5||dot(n,coastalCenter)<.99||edge<=0.)return vec3(0.);
 vec4 data=texture2D(referenceMask,(vec2(1296.,0.)+q+.5)/vec2(1560.,1813.));
 float bed=(data.r*65280.+data.g*255.)/65535.*128.-64.,distance=data.b*256.-128.;
 return vec3(bed,distance,coastalActive*smoothstep(0.,16.,edge)*(1.-smoothstep(65.,100.,abs(distance))));
}
float coastalLevel(float distance){float phase=coastalTime*.8-distance*.08;return .72*sin(phase)+.16*sin(phase*2.);}
vec3 coastalWater(vec3 p){
 vec3 field=coastalSample(p);if(coastalReady<.5)return vec3(coastalLevel(field.y),0.,0.);
 vec3 n=normalize(p);vec2 q=vec2(dot(n-coastalCenter,coastalEast),dot(n-coastalCenter,coastalNorth))*60000./4.+63.5;
 q=clamp(q,vec2(0.),vec2(127.));
 vec2 uv=(vec2(1296.,128.)+q+.5)/vec2(1560.,1813.);
 vec4 a=texture2D(referenceMask,uv),b=texture2D(referenceMask,uv+vec2(0.,128./1813.));
 vec4 data=mix(a,b,coastalMix);return vec3((data.r*65280.+data.g*255.)/65535.*16.-8.,data.b,data.a);
}
float coastalWet(vec3 p,vec3 field,float elevation){
 if(coastalReady>.5){vec3 water=coastalWater(p);return field.z*max(water.z*(1.-smoothstep(.1,.4,elevation-field.x)),1.-smoothstep(-.04,.08,elevation-water.x));}
 float phase=coastalTime*.8-field.y*.08,age=mod(phase-1.570796327,6.283185307)/.8;
 float memory=exp(-age/8.)*(1.-smoothstep(.55,.9,elevation));
 return field.z*max(1.-smoothstep(-.04,.08,elevation-coastalLevel(field.y)),memory);
}
`;
