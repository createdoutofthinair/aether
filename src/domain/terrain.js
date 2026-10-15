import {Vector3,clamp,smoothstep,numericVector} from './vector.js';
// Cached fields are injected readers; this module owns no workers or GPU state.
export function createTerrainDomain({world,environment,climate,province,planetAt,referenceAt,regionAt,regionHeight,regionDirection}){
const R=60000;
const landing=new Vector3(.27,.46,.846).normalize();
const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
function hash(x,y,z){return fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);}
function noise(x,y,z){let a=Math.floor(x),b=Math.floor(y),c=Math.floor(z);x-=a;y-=b;z-=c;x=x*x*(3-2*x);y=y*y*(3-2*y);z=z*z*(3-2*z);return mix(mix(mix(hash(a,b,c),hash(a+1,b,c),x),mix(hash(a,b+1,c),hash(a+1,b+1,c),x),y),mix(mix(hash(a,b,c+1),hash(a+1,b,c+1),x),mix(hash(a,b+1,c+1),hash(a+1,b+1,c+1),x),y),z);}
const craters=Array.from({length:24},(_,i)=>{let z=hash(i,8,2)*2-1,a=hash(i,2,9)*Math.PI*2;return{n:new Vector3(Math.sqrt(1-z*z)*Math.cos(a),z,Math.sqrt(1-z*z)*Math.sin(a)),r:.018+hash(i,4,1)*.075};});
function baseHeight(n){const localDistance=environment.basin?R*Math.sqrt(Math.max(0,2-2*n.dot(landing))):Infinity;if(localDistance<4200){const p=basinCoordinates(n);return basinHeight(p.x,p.z);}let offset=(world.seed-6)*.173;let x=n.x+offset,y=n.y-offset*.7,z=n.z+offset*.3;// Broad domain warping bends ridge systems and coastlines without changing
// authored landing regions or their shared collision height field.
const wx=noise(x*2.1+43,y*2.1+11,z*2.1+7)-.5,wy=noise(x*2.1+5,y*2.1+37,z*2.1+19)-.5,wz=noise(x*2.1+23,y*2.1+3,z*2.1+47)-.5;
x+=wx*.22;y+=wy*.22;z+=wz*.22;let h=0,amp=1100,f=3;for(let i=0;i<8;i++){let v=noise(x*f+17,y*f+9,z*f+31);h+=amp*(i<2?v-.44:(1-Math.abs(v*2-1))-.48);amp*=.47;f*=2.17;}for(const c of craters){const d2=2-2*n.dot(c.n);if(d2<c.r*c.r*2.8){let q=Math.sqrt(Math.max(0,d2))/c.r;h+=c.r*R*.16*(Math.exp(-Math.pow((q-.99)*7,2))*.7-Math.max(0,1-q*q)*.8);}}
 const d=environment.basin?R*Math.sqrt(Math.max(0,2-2*n.dot(landing))):Infinity;
 if(d>6500)return h;
 const coords=basinCoordinates(n),regional=basinHeight(coords.x,coords.z);
 return mix(regional,h,smoothstep(d,4200,6500));}
function authoredHeight(n){
 const region=regionAt(n);if(region?.weight===1)return regionHeight(region)*world.relief;
 const h=baseHeight(n)*world.relief;
 const distance=R*Math.sqrt(Math.max(0,2-2*n.dot(landing))),outside=environment.basin?smoothstep(distance,4200,6500):1;
 const c=climate(n,h),p=province(n);
 const dunes=Math.sin(n.x*R/55+n.z*R/95+noise(n.x*130,n.y*130,n.z*130)*5);
 const original=h+outside*(c.dunes*dunes*7+Math.pow(Math.max(0,p-.55),2)*world.activity*1500)*world.relief;
 return region?mix(original,regionHeight(region)*world.relief,region.weight):original;
}
function height(n){
 const original=authoredHeight(n),global=planetAt(world,environment,n);
 if(!global)return original;
 const distance=R*Math.sqrt(Math.max(0,2-2*n.dot(landing)));
 const preserveReference=environment.basin?smoothstep(distance,4200,6500):1;
 return original+global.height*preserveReference;
}
function surfaceHydrology(n){const global=planetAt(world,environment,n),local=referenceGeology(n);const blend=local?.weight||0;return [mix(global?.flow||0,local?.flow||0,blend),mix(global?.shelter??1,local?.shelter??1,blend),regionAt(n)?.id==='badlands'?1:0];}
const landingEast=new Vector3(0,1,0).cross(landing).normalize();
const landingNorth=new Vector3().crossVectors(landing,landingEast).normalize();
function basinCoordinates(d){return{x:d.dot(landingEast)*R,z:d.dot(landingNorth)*R};}
function basinDirection(x,z){return landing.clone().multiplyScalar(Math.sqrt(Math.max(0,1-(x*x+z*z)/(R*R)))).addScaledVector(landingEast,x/R).addScaledVector(landingNorth,z/R).normalize();}
function channelCenter(z){return 180*(noise(z/850+7,3,11)-.5)+65*(noise(z/230+9,8,2)-.5);}
// Sparse, fixed tributary graph; a spatial index keeps per-vertex queries local.
const drainageCells=new Map();
function addDrain(a,b,width){
 const segment={a,b,width};
 for(let x=Math.floor((Math.min(a.x,b.x)-width*3)/300);x<=Math.floor((Math.max(a.x,b.x)+width*3)/300);x++)
 for(let z=Math.floor((Math.min(a.z,b.z)-width*3)/300);z<=Math.floor((Math.max(a.z,b.z)+width*3)/300);z++){
  const key=x+','+z;if(!drainageCells.has(key))drainageCells.set(key,[]);drainageCells.get(key).push(segment);
 }
}
for(let i=-7;i<=7;i++)for(const side of [-1,1]){
 const join=i*440+hash(i,side,1)*240,origin={x:channelCenter(join),z:join};let last=origin;
 for(let j=1;j<=4;j++){
  const next={x:origin.x+side*j*(180+hash(i,side,3)*80),z:join-j*90+120*(hash(i,j,side+4)-.5)};
  addDrain(last,next,12+(5-j)*5);
  if(j>1){const tip={x:next.x+side*(120+hash(i,j,8)*130),z:next.z-170-hash(i,j,9)*170};addDrain(next,tip,10);}
  last=next;
 }
}
function basinProfile(x,z){
 const channel=channelCenter(z),distance=Math.abs(x-channel);
 const width=45+45*noise(z/360+4,2,6),bank=smoothstep(distance,width,width+80+70*noise(x/310+4,z/270+8,1));
 const wx=x+110*(noise(x/700+4,z/580+9,3)-.5),wz=z+90*(noise(x/510+7,z/620+4,5)-.5);
 const mesa=smoothstep(noise(wx/440+11,wz/570+6,7),.46,.66);
 let drainage=0;
 for(const segment of drainageCells.get(Math.floor(x/300)+','+Math.floor(z/300))||[]){
  const {a,b,width}=segment,dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
  const d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t)/width;
  drainage=Math.max(drainage,Math.exp(-d*d)*(1-smoothstep(d,2.4,3)));
 }
 return{bank,mesa,distance,drainage,wx,wz};
}
function legacyBasinHeight(x,z){
 const {bank,mesa,drainage,wx,wz}=basinProfile(x,z);
 const uplift=30+80*noise(wx/760+8,wz/690+4,9);
 const shoulders=bank*(uplift+mesa*105);
 // No periodic elevation steps: isolated resistant beds break up selected slopes.
 const bed=noise(wx/190+12,wz/240+8,4),resistant=smoothstep(bed,.55,.73);
 const broken=(noise(wx*.034+9,wz*.028+8,3)-.5)*4.5*bank;
 const gullies=drainage*bank*(18+mesa*38);
 const talus=(noise(x/55+3,z/68+5,7)-.5)*3.5*bank*(1-mesa);
 const floor=120+z*.008+1.4*(noise(x/95+2,z/140+3,2)-.5);
 const gravel=(noise(x*.12+7,z*.12+3,5)-.5)*.14;
 return floor+shoulders+resistant*bank*17-gullies+broken+talus+gravel;
}
function basinHeight(x,z){
 const data=referenceAt(world.seed,x,z);
 if(!data||data.weight<=0)return legacyBasinHeight(x,z);
 // The same bounded centimetre/meter relief participates in rendering and contact.
 const fine=(noise(x*.14+world.seed,z*.14,17)-.5)*.12*(1-data.flow)
  +(noise(x*.032,z*.032+world.seed,29)-.5)*.65*data.exposure;
 return data.weight>=1?data.height+fine:mix(legacyBasinHeight(x,z),data.height+fine,data.weight);
}
function referenceGeology(d){if(d.dot(landing)<=0)return null;const {x,z}=basinCoordinates(d);return environment.basin?referenceAt(world.seed,x,z,false):null;}
function surfaceGeology(d){
 const region=regionAt(d);if(region?.id==='badlands'){const h=regionHeight(region),deposition=1-smoothstep(h,190,550);return[deposition,1-deposition,region.weight];}
 const global=planetAt(world,environment,d),globalGeology=global?[global.soil,global.exposure,1]:[0,0,0];
 if(!environment.basin)return globalGeology;
 const distance=R*Math.sqrt(Math.max(0,2-2*d.dot(landing))),regional=1-smoothstep(distance,4200,6500);
 if(regional===0)return globalGeology;
 const {x,z}=basinCoordinates(d),p=basinProfile(x,z),eroded=referenceAt(world.seed,x,z,false);
 const original=[Math.min(1,1-p.bank+p.drainage*p.bank*.85),p.bank*p.mesa*(1-p.drainage),regional];
 const local=eroded?original.map((v,i)=>mix(v,[eroded.soil,eroded.exposure,regional][i],eroded.weight)):original;
 return local.map((v,i)=>mix(globalGeology[i],v,regional));
}

function surfaceClimate(d,elevation){const c=climate(d,elevation),r=regionAt(d);if(!r||c.ocean)return c;const cover=r.weight*(1-c.ice);if(r.id==='volcanic'){c.volcanic=mix(c.volcanic,.92,cover);c.dunes*=1-cover;}else if(r.id==='dunes'){c.dunes=mix(c.dunes,.98,cover);c.volcanic*=1-cover;}else{c.volcanic*=1-cover;c.dunes*=1-cover;}if(r.weight>.5&&c.ice<.55)c.biome=r.name;return c;}
function regionLanding(region){
 let best=null,score=Infinity;for(let ring=0;ring<5;ring++)for(let i=0;i<(ring?8:1);i++){
  const angle=i*Math.PI/4,d=new Vector3().copy(regionDirection(region,region.site[0]+Math.cos(angle)*ring*110,region.site[1]+Math.sin(angle)*ring*110)),h=height(d);if(climate(d,h).ocean)continue;
  const slope=1-surfaceNormal(d).dot(d),cost=slope+ring*.0003;if(slope<.04&&cost<score){best=d;score=cost;}
 }return best;
}
function surface(p){return R+height(p.clone().normalize());}
function basis(up){let east=new Vector3(0,1,0).cross(up);if(east.lengthSq()<.001)east.set(1,0,0);east.normalize();let north=new Vector3().crossVectors(up,east).normalize();return{east,north};}
// Sample the continuous height field, independent of patch boundaries or LOD.
function surfaceNormal(d,eps=.75){const {east,north}=basis(d),at=R+height(d);
 const dhE=(height(d.clone().addScaledVector(east,eps/R).normalize())-height(d.clone().addScaledVector(east,-eps/R).normalize()))/(2*eps);
 const dhN=(height(d.clone().addScaledVector(north,eps/R).normalize())-height(d.clone().addScaledVector(north,-eps/R).normalize()))/(2*eps);
 return d.clone().addScaledVector(east,-dhE*R/at).addScaledVector(north,-dhN*R/at).normalize();}
const faces=[[[1,0,0],[0,0,-1],[0,1,0]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[1,0,0],[0,0,-1]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]].map(f=>f.map(v=>new Vector3(...v)));
function direction(face,u,v){return faces[face][0].clone().addScaledVector(faces[face][1],u).addScaledVector(faces[face][2],v).normalize();}
return { R,landing,noise,authoredHeight,height,surfaceHydrology,basinCoordinates,basinDirection,basinProfile,basinHeight,referenceGeology,surfaceGeology,surfaceClimate,regionLanding,surface,basis,surfaceNormal,faces,direction };
}
