// Shared deterministic world parameters. Climate is an artistic approximation.
export const defaults=Object.freeze({seed:6,relief:1,temperature:18,water:-180,pressure:1,activity:.45});
export const world={...defaults};
export const environment={waterEnabled:true,iceEnabled:true,basin:true,gravity:1};
export function configureEnvironment(input={}){Object.assign(environment,{waterEnabled:input.waterEnabled!==false,iceEnabled:input.iceEnabled!==false,basin:input.basin!==false,gravity:Number.isFinite(input.gravity)?Math.max(.1,Math.min(3,input.gravity)):1});}
export function configureWorld(input={}){
 const ranges={seed:[0,999999],relief:[.25,3],temperature:[-240,450],water:[-1000,1000],pressure:[0,2],activity:[0,1]};
 for(const [key,[lo,hi]] of Object.entries(ranges)){const v=Number(input[key]??defaults[key]);world[key]=Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):defaults[key];}
 world.seed=Math.round(world.seed);return {...world};
}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const hash=(x,y,z)=>{const v=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return v-Math.floor(v);};
export function field(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);x-=ix;y-=iy;z-=iz;x=x*x*(3-2*x);y=y*y*(3-2*y);z=z*z*(3-2*z);let result=0;for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++)result+=hash(ix+i,iy+j,iz+k)*(i?x:1-x)*(j?y:1-y)*(k?z:1-z);return result;}
export function province(n){const s=world.seed*.137;return .7*field(n.x*4+s,n.y*4+17,n.z*4-s*.7)+.3*field(n.x*11+7,n.y*11+s*.3,n.z*11+31);}
export function climate(n,elevation){
 const moisture=smooth(.27,.72,province({x:n.z,y:n.x,z:n.y}));
 const temperature=world.temperature-58*n.y*n.y-Math.max(0,elevation-world.water)*.0065;
 const ice=environment.iceEnabled?1-smooth(-14,2,temperature):0;
 const volcanic=smooth(.57,.78,province(n))*world.activity*(1-ice);
 const dunes=smooth(3,24,temperature)*(1-moisture)*(1-ice)*(1-volcanic);
 const ocean=environment.waterEnabled&&elevation<world.water;
 const biome=ocean?(temperature< -4?'Frozen sea':'Ocean'):ice>.55?'Polar ice':volcanic>.23?'Volcanic uplands':dunes>.38?'Dune desert':elevation>350*world.relief?'Rocky highlands':'Sediment plains';
 return{temperature,moisture,ice,volcanic,dunes,ocean,biome};
}
export function mapDirection(u,v){const lat=(.5-v)*Math.PI,lon=(u-.5)*Math.PI*2;return{x:Math.cos(lat)*Math.sin(lon),y:Math.sin(lat),z:Math.cos(lat)*Math.cos(lon)};}
export function mapUV(n){return{u:.5+Math.atan2(n.x,n.z)/(2*Math.PI),v:.5-Math.asin(Math.max(-1,Math.min(1,n.y)))/Math.PI};}
export const biomeColors={'Ocean':[35,80,109],'Frozen sea':[133,179,191],'Polar ice':[217,231,226],'Volcanic uplands':[99,91,88],'Dune desert':[197,163,103],'Rocky highlands':[139,119,97],'Sediment plains':[162,143,115]};
