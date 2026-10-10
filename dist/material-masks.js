export const maskTypes=['uniform','noise','upward','height','cavity'];
export const defaultMask=()=>({type:'uniform',coverage:.65,scale:3,softness:.18,seed:17,invert:false});
const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function hash(x,y,z){return fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);}
function noise(p){const i=p.map(Math.floor),f=p.map(x=>{const a=fract(x);return a*a*(3-2*a);});return mix(mix(mix(hash(i[0],i[1],i[2]),hash(i[0]+1,i[1],i[2]),f[0]),mix(hash(i[0],i[1]+1,i[2]),hash(i[0]+1,i[1]+1,i[2]),f[0]),f[1]),mix(mix(hash(i[0],i[1],i[2]+1),hash(i[0]+1,i[1],i[2]+1),f[0]),mix(hash(i[0],i[1]+1,i[2]+1),hash(i[0]+1,i[1]+1,i[2]+1),f[0]),f[1]),f[2]);}
export function proceduralMask(mask,point,normalY=1,height=.5,cavity=.5){
 if(mask.type==='uniform')return 1;
 const q=point.map(x=>x*mask.scale+mask.seed*.37),warp=noise(q.map(x=>x*.53+11.7));
 let field=0,amplitude=.5,total=0;for(let i=0;i<4;i++){field+=amplitude*noise(q.map(x=>x+warp*.8));total+=amplitude;amplitude*=.5;for(let j=0;j<3;j++)q[j]=q[j]*2.03+7.1;}
 field/=total;
 if(mask.type==='upward')field=field*.4+Math.max(0,normalY)*.6;
 if(mask.type==='height')field=field*.3+height*.7;
 if(mask.type==='cavity')field=field*.35+(1-cavity)*.65;
 let result=smooth(1-mask.coverage-mask.softness,1-mask.coverage+mask.softness,field);
 // Endpoints must permit genuinely no coverage or complete coverage.
 if(mask.coverage===0)result=0;if(mask.coverage===1)result=1;
 return mask.invert?1-result:result;
}
export function stackWeights(amounts,masks,heights,heightInfluence){
 const weights=[1,0,0];let underlyingHeight=heights[0];
 for(let i=1;i<3;i++){
  let alpha=amounts[i]/100*masks[i];
  const priority=smooth(-.25,.25,heights[i]-underlyingHeight+(alpha-.5)*.35);
  alpha=mix(alpha,alpha*priority,heightInfluence);
  for(let j=0;j<i;j++)weights[j]*=1-alpha;weights[i]=alpha;
  underlyingHeight=mix(underlyingHeight,heights[i],alpha);
 }return weights;
}
export const maskGLSL=`
 uniform vec4 layerMask0,layerMask1,layerMask2; // type, coverage, scale, softness
 uniform vec3 layerSeeds,layerInvert;uniform float mixStack,mixMaskView;
 varying vec3 mixerPosition,mixerUp;
 float maskHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float maskNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(maskHash(i),maskHash(i+vec3(1,0,0)),f.x),mix(maskHash(i+vec3(0,1,0)),maskHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(maskHash(i+vec3(0,0,1)),maskHash(i+vec3(1,0,1)),f.x),mix(maskHash(i+vec3(0,1,1)),maskHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float layerMask(vec4 settings,float seed,float invert,float h,float cavity){
  if(settings.x<.5)return 1.;
  vec3 q=mixerPosition*settings.z+seed*.37;float warp=maskNoise(q*.53+11.7),field=0.,amplitude=.5,total=0.;
  for(int i=0;i<4;i++){field+=amplitude*maskNoise(q+warp*.8);total+=amplitude;amplitude*=.5;q=q*2.03+7.1;}field/=total;
  if(settings.x>1.5&&settings.x<2.5)field=field*.4+max(0.,normalize(mixerUp).y)*.6;
  if(settings.x>2.5&&settings.x<3.5)field=field*.3+h*.7;
  if(settings.x>3.5)field=field*.35+(1.-cavity)*.65;
  float soft=max(settings.w,fwidth(field));
  float result=smoothstep(1.-settings.y-soft,1.-settings.y+soft,field);
  if(settings.y<=0.)result=0.;if(settings.y>=1.)result=1.;return mix(result,1.-result,invert);
 }
 vec3 orderedWeights(vec3 masks,vec3 heights){
  vec3 w=vec3(1.,0.,0.);float h=heights.x;
  float a=clamp(mixWeights.y*.01*masks.y,0.,1.);
  a=mix(a,a*smoothstep(-.25,.25,heights.y-h+(a-.5)*.35),mixHeight);
  w*=1.-a;w.y=a;h=mix(h,heights.y,a);
  a=clamp(mixWeights.z*.01*masks.z,0.,1.);
  a=mix(a,a*smoothstep(-.25,.25,heights.z-h+(a-.5)*.35),mixHeight);
  w*=1.-a;w.z=a;return w;
 }
`;
