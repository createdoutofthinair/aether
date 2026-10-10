import {geologicalProfile} from './planet-profiles.js?v=terrain-17';
export const MATERIAL_PROFILES=['temperate','dry','volcanic','glacial','airless'];
export const materialProfileIndex=(config,environment)=>MATERIAL_PROFILES.indexOf(geologicalProfile(config,environment));
const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const palettes=[[[.43,.33,.22],[.30,.28,.25]],[[.44,.285,.145],[.35,.20,.105]],[[.19,.155,.125],[.105,.115,.13]],[[.34,.36,.36],[.28,.30,.33]],[[.25,.24,.23],[.24,.24,.25]]];
// Integer hashing keeps worker and shader cells identical even at large positions.
function hash(x,y,z,seed){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^Math.imul(seed,1442695041);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;}
export function regionalNoise(p,seed){
 const i=p.map(Math.floor),f=p.map((v,k)=>v-i[k]),w=f.map(v=>v*v*(3-2*v)),dw=f.map(v=>6*v*(1-v)),result=[0,0,0,0];
 for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){
  const v=hash(i[0]+x,i[1]+y,i[2]+z,seed),a=x?w[0]:1-w[0],b=y?w[1]:1-w[1],c=z?w[2]:1-w[2];
  result[0]+=v*a*b*c;result[1]+=v*(x?1:-1)*dw[0]*b*c;result[2]+=v*a*(y?1:-1)*dw[1]*c;result[3]+=v*a*b*(z?1:-1)*dw[2];
 }return result;
}
export function composeRegionalSurface(g,config={},environment={},direction={x:0,y:0,z:1},detail=true){
 const profile=materialProfileIndex(config,environment),[soil,stone]=palettes[profile],p=[direction.x*60000,direction.y*60000,direction.z*60000];
 const n=detail?regionalNoise(p.map(v=>v*.025),config.seed??6):[.5,0,0,0];
 const rawRock=g.exposure-g.soil*.3+(n[0]-.5)*.18,rock=clamp(rawRock),liquid=environment.waterEnabled!==false&&config.pressure>=.05&&config.temperature>0&&config.temperature<100;
 const wet=liquid?clamp(g.flow*g.soil):0,vein=detail?clamp((.12-Math.abs(n[0]-.5))/.12)*g.exposure*.16:0,silt=detail?g.flow*g.soil*clamp((n[0]-.35)/.4)*.25:0;
 let color=soil.map((v,i)=>mix(v,stone[i],rock)*(1-wet*.18));color=color.map((v,i)=>mix(mix(v,[.46,.44,.40][i],vein),soil[i]*1.08,silt));
 let h=(n[0]-.5)*(.16*rock+.04*g.soil),gradient=n.slice(1).map(v=>v*.025*(.16*rock+.04*g.soil+(rawRock>0&&rawRock<1?(n[0]-.5)*.0288:0)));
 if(detail&&profile===2){h+=(.5-Math.abs(n[0]*2-1))*.28;gradient=gradient.map((v,i)=>v-n[i+1]*.014*Math.sign(n[0]*2-1));}
 if(detail&&profile===3){const phase=(p[0]*.83+p[1]*.12+p[2]*.54)*.06+n[0]*.6;h+=Math.sin(phase)*.06;gradient=gradient.map((v,i)=>v+Math.cos(phase)*.06*([.83,.12,.54][i]*.06+n[i+1]*.015));}
 const radial=[direction.x,direction.y,direction.z],dot=gradient.reduce((v,x,i)=>v+x*radial[i],0);gradient=gradient.map((v,i)=>v-dot*radial[i]);
 return{color,roughness:mix(mix(mix(.94,.84,rock),.62,wet),.76,vein),occlusion:mix(.82,1,g.shelter),height:clamp(.5+h),gradient,decal:clamp(vein+silt)};
}
export const regionalMaterialGLSL=`
float regionalHash(ivec3 p,uint seed){uint h=uint(p.x)*374761393u^uint(p.y)*668265263u^uint(p.z)*2147483647u^seed*1442695041u;h=(h^(h>>13))*1274126177u;return float(h^(h>>16))/4294967295.;}
vec4 regionalNoise(vec3 p,uint seed){ivec3 cell=ivec3(floor(p));vec3 f=fract(p),w=f*f*(3.-2.*f),dw=6.*f*(1.-f);vec4 r=vec4(0.);
 for(int z=0;z<2;z++)for(int y=0;y<2;y++)for(int x=0;x<2;x++){float v=regionalHash(cell+ivec3(x,y,z),seed);vec3 a=mix(1.-w,w,vec3(x,y,z)),d=mix(-dw,dw,vec3(x,y,z));r+=v*vec4(a.x*a.y*a.z,d.x*a.y*a.z,a.x*d.y*a.z,a.x*a.y*d.z);}return r;}
void regionalMaterial(vec3 radial,vec4 geology,vec4 profile,vec4 climate,bool detail,out vec3 color,out vec3 surface,out vec3 gradient,out float decal){
 vec3 soil=vec3(.43,.33,.22),stone=vec3(.30,.28,.25);
 if(profile.x>.5&&profile.x<1.5){soil=vec3(.44,.285,.145);stone=vec3(.35,.20,.105);}
 if(profile.x>1.5&&profile.x<2.5){soil=vec3(.19,.155,.125);stone=vec3(.105,.115,.13);}
 if(profile.x>2.5&&profile.x<3.5){soil=vec3(.34,.36,.36);stone=vec3(.28,.30,.33);}
 if(profile.x>3.5){soil=vec3(.25,.24,.23);stone=vec3(.24,.24,.25);}
 vec3 p=radial*60000.;vec4 n=detail?regionalNoise(p*.025,uint(profile.y)):vec4(.5,0.,0.,0.);
 float rawRock=geology.g-geology.r*.3+(n.x-.5)*.18,rock=clamp(rawRock,0.,1.);
 float wet=profile.z>.5&&climate.y>=.05&&climate.x>0.&&climate.x<100.?clamp(geology.b*geology.r,0.,1.):0.;
 float vein=detail?clamp((.12-abs(n.x-.5))/.12,0.,1.)*geology.g*.16:0.,silt=detail?geology.b*geology.r*clamp((n.x-.35)/.4,0.,1.)*.25:0.;
 color=mix(soil,stone,rock)*(1.-wet*.18);color=mix(mix(color,vec3(.46,.44,.40),vein),soil*1.08,silt);
 float h=(n.x-.5)*(.16*rock+.04*geology.r);gradient=n.yzw*.025*(.16*rock+.04*geology.r+(rawRock>0.&&rawRock<1.?(n.x-.5)*.0288:0.));
 if(detail&&profile.x>1.5&&profile.x<2.5){h+=(.5-abs(n.x*2.-1.))*.28;gradient-=n.yzw*.014*sign(n.x*2.-1.);}
 if(detail&&profile.x>2.5&&profile.x<3.5){float phase=dot(p,vec3(.83,.12,.54))*.06+n.x*.6;h+=sin(phase)*.06;gradient+=cos(phase)*.06*(vec3(.83,.12,.54)*.06+n.yzw*.015);}
 gradient-=radial*dot(gradient,radial);surface=vec3(mix(mix(mix(.94,.84,rock),.62,wet),.76,vein),mix(.82,1.,geology.a),clamp(.5+h,0.,1.));decal=clamp(vein+silt,0.,1.);
}
`;
