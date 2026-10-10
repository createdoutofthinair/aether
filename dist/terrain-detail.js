import {referenceSample} from './terrain-data.js?v=terrain-9';

export const DETAIL_STEP=2,DETAIL_EXTENT=128,DETAIL_CELLS=DETAIL_EXTENT/DETAIL_STEP,DETAIL_SIZE=DETAIL_CELLS+3;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
function hash(x,z,seed){let v=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(seed,1442695041);v=Math.imul(v^(v>>>13),1274126177);return((v^(v>>>16))>>>0)/4294967295;}
function noise(x,z,seed){const i=Math.floor(x),j=Math.floor(z);let u=x-i,v=z-j;u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(hash(i,j,seed),hash(i+1,j,seed),u),mix(hash(i,j+1,seed),hash(i+1,j+1,seed),u),v);}
const indices=new WeakMap();

// Subordinate channels connect actual parent-grid drainage nodes. Each endpoint
// has one world-space jitter, so channels remain joined across tile boundaries.
export function prepareDetail(data){
 if(data.detailChannels&&data.outcrops)return data;
 const n=data.size,s=data.step,channels=[],outcrops=[];
 const node=(i,j)=>[(i/(n-1)-.5)*data.extent+(hash(i,j,data.seed+101)-.5)*2.4,(j/(n-1)-.5)*data.extent+(hash(i,j,data.seed+103)-.5)*2.4];
 for(let j=1;j<n-1;j++)for(let i=1;i<n-1;i++){
  const k=j*n+i,flow=data.masks[k*4+2]/255;if(flow<.36||Math.hypot((i/(n-1)-.5)*data.extent,(j/(n-1)-.5)*data.extent)>2740)continue;
  let best=0,ti=i,tj=j;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const drop=(data.height[k]-data.height[(j+dz)*n+i+dx])/(s*Math.hypot(dx,dz));if(drop>best){best=drop;ti=i+dx;tj=j+dz;}}
  if(best<.055)continue;
  const a=node(i,j),b=node(ti,tj);channels.push(...a,...b,1.8+flow*3.2,(.35+flow*2.1)*smooth(.04,.35,best));
 }
 // Fractured formations follow local contour strike, with their toes downhill.
 for(let cz=-16;cz<=16;cz++)for(let cx=-16;cx<=16;cx++){
  const x=(cx+hash(cx,cz,data.seed+211))*160,z=(cz+hash(cx,cz,data.seed+223))*160,r=Math.hypot(x,z);
  if(r<220||r>2550||hash(cx,cz,data.seed+227)>.68)continue;
  const g=referenceSample(data,x,z);if(!g||g.exposure<.22||g.soil>.72||g.flow>.58)continue;
  const dx=(referenceSample(data,x+8,z).height-referenceSample(data,x-8,z).height)/16,dz=(referenceSample(data,x,z+8).height-referenceSample(data,x,z-8).height)/16,slope=Math.hypot(dx,dz);
  if(slope<.12||slope>1.25)continue;
  outcrops.push({id:`${data.seed}/${cx}/${cz}`,x,z,baseHeight:g.height,slope,angle:Math.atan2(-dx,dz),width:18+hash(cx,cz,data.seed+229)*30,depth:7+hash(cx,cz,data.seed+233)*11,height:3+hash(cx,cz,data.seed+239)*6,variant:Math.floor(hash(cx,cz,data.seed+241)*8),seed:Math.floor(hash(cx,cz,data.seed+251)*1e6)});
 }
 data.detailChannels=new Float32Array(channels);data.outcrops=outcrops;
 data.stats.detailStep=DETAIL_STEP;data.stats.subchannels=channels.length/6;data.stats.outcrops=outcrops.length;return data;
}
function channelIndex(data){
 if(indices.has(data))return indices.get(data);
 prepareDetail(data);const cells=new Map(),c=data.detailChannels;
 for(let k=0;k<c.length;k+=6){const pad=c[k+4]*3;for(let z=Math.floor((Math.min(c[k+1],c[k+3])-pad)/32);z<=Math.floor((Math.max(c[k+1],c[k+3])+pad)/32);z++)for(let x=Math.floor((Math.min(c[k],c[k+2])-pad)/32);x<=Math.floor((Math.max(c[k],c[k+2])+pad)/32);x++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(k);}}
 indices.set(data,cells);return cells;
}
export function prepareDetailIndex(data){channelIndex(data);return data;}
export function detailResidual(data,x,z){
 const radius=Math.hypot(x,z),influence=smooth(100,200,radius)*(1-smooth(2450,2700,radius));if(influence===0)return 0;
 const g=referenceSample(data,x,z);if(!g)return 0;
 const exposure=g.exposure,soil=g.soil,c=data.detailChannels,cells=channelIndex(data);let incision=0,deposit=0;
 for(const k of cells.get(Math.floor(x/32)+','+Math.floor(z/32))||[]){const dx=c[k+2]-c[k],dz=c[k+3]-c[k+1],t=clamp(((x-c[k])*dx+(z-c[k+1])*dz)/(dx*dx+dz*dz)),distance=Math.hypot(x-c[k]-t*dx,z-c[k+1]-t*dz)/c[k+4];incision=Math.max(incision,c[k+5]*Math.exp(-distance*distance*1.8));deposit=Math.max(deposit,c[k+5]*.24*Math.exp(-(((distance-1.8)/.65)**2))*soil);}
 // A resistant bed steepens selected exposed shoulders, rather than painting
 // periodic stripes over the whole landscape. Both endpoints of the phase join.
 const patch=smooth(.42,.7,noise(x/130+17,z/160+31,data.seed+307));
 const layer=(g.height+(noise(x/170,z/190,data.seed+311)-.5)*12)/8.5,phase=layer-Math.floor(layer);
 const ledge=(smooth(.12,.76,phase)-phase)*6.5*exposure*patch;
 const broken=(noise(x/5+3,z/7+7,data.seed+313)-.5)*.60*exposure;
 const gravel=(noise(x/3,z/4,data.seed+317)-.5)*.14*soil;
 return influence*(ledge+broken+gravel-incision+deposit);
}
// A tile is a cache of one continuous 2 m lattice, with a halo for Catmull-Rom.
// Resident and fallback samples are identically rounded Float32 values.
export function generateDetailTile(data,tx,tz){
 prepareDetail(data);const values=new Float32Array(DETAIL_SIZE*DETAIL_SIZE);
 for(let j=0;j<DETAIL_SIZE;j++)for(let i=0;i<DETAIL_SIZE;i++)values[j*DETAIL_SIZE+i]=detailResidual(data,tx*DETAIL_EXTENT+(i-1)*DETAIL_STEP,tz*DETAIL_EXTENT+(j-1)*DETAIL_STEP);
 return{seed:data.seed,tx,tz,values,complete:true};
}
export function emptyDetailTile(seed,tx,tz){const values=new Float32Array(DETAIL_SIZE*DETAIL_SIZE);values.fill(NaN);return{seed,tx,tz,values};}
const cubic=(a,b,c,d,t)=>b+.5*t*(c-a+t*(2*a-5*b+4*c-d+t*(3*(b-c)+d-a)));
export function sampleDetailTile(data,tile,x,z){
 const u=(x-tile.tx*DETAIL_EXTENT)/DETAIL_STEP+1,v=(z-tile.tz*DETAIL_EXTENT)/DETAIL_STEP+1,i=Math.floor(u),j=Math.floor(v),fx=u-i,fz=v-j,rows=[];
 for(let y=-1;y<=2;y++){
  const at=dx=>{const ix=i+dx,iz=j+y,k=iz*DETAIL_SIZE+ix;if(Number.isNaN(tile.values[k]))tile.values[k]=detailResidual(data,tile.tx*DETAIL_EXTENT+(ix-1)*DETAIL_STEP,tile.tz*DETAIL_EXTENT+(iz-1)*DETAIL_STEP);return tile.values[k];};
  rows.push(cubic(at(-1),at(0),at(1),at(2),fx));
 }
 return cubic(...rows,fz);
}
