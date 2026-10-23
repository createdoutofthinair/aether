import {random} from '../ships/blueprint.js';
export const CURVED_MASSES=[['taper','Tapered orbital tower'],['spindle','Ovoid spindle'],['petal-shell','Lobed research shell'],['crescent-shell','Swept crescent'],['atrium-shell','Open organic atrium'],['sail-shell','Leaning sail'],['canopy-shell','Flared canopy'],['helix-shell','Twisted trilobe']].map(([id,label])=>({id,label,curved:true}));
const tau=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function basePoint(s,u,loop=0){
 const a=(loop?u:1-u)*tau,inner=loop?s.court:1;
 if(s.kind==='crescent-shell'){
  // Thick swept arc with semicircular end caps. Tangents remain continuous
  // at the joins, so recessed modules never fold around a hard C-corner.
  const arc=tau-1.35,start=.675,v=(1-u)*2.4,middle=(1+s.court)/2,thickness=(1-s.court)/2;
  if(v<1){const a=start+arc*v;return [Math.cos(a)*s.rx,Math.sin(a)*s.rz];}
  if(v<1.2){const a=start+arc,phi=(v-1)/.2*Math.PI;return [(Math.cos(a)*middle+Math.cos(a+phi)*thickness)*s.rx,(Math.sin(a)*middle+Math.sin(a+phi)*thickness)*s.rz];}
  if(v<2.2){const a=start+arc*(2.2-v);return [Math.cos(a)*s.rx*s.court,Math.sin(a)*s.rz*s.court];}
  const phi=Math.PI+(v-2.2)/.2*Math.PI;return [(Math.cos(start)*middle+Math.cos(start+phi)*thickness)*s.rx,(Math.sin(start)*middle+Math.sin(start+phi)*thickness)*s.rz];
 }
 const mod=['petal-shell','helix-shell'].includes(s.kind)?1+s.lobing*Math.cos(s.lobes*a):1;
 return [Math.cos(a)*s.rx*inner*mod,Math.sin(a)*s.rz*inner*mod];
}
export function surfaceScale(s,t){
 t=clamp(t,0,1);
 if(s.kind==='spindle')return .75+.42*Math.sin(Math.PI*t)-s.taper*.55*t;
 if(s.kind==='canopy-shell'){
  const controls=[[0,.4],[.32,.43],[.56,1],[.83,.92],[1,.63]],i=Math.min(3,controls.findIndex((p,i)=>i<4&&t>=p[0]&&t<=controls[i+1][0]));
  const a=controls[Math.max(0,i)],b=controls[Math.max(0,i)+1],f=(t-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*f*f*(3-2*f);
 }
 return 1-s.taper*t+(s.kind==='petal-shell'?.12*Math.sin(Math.PI*t):0);
}
// u follows an arc-length table, rather than polar angle. Elliptical and lobed
// facades therefore do not squeeze many modules onto their shortest edges.
export function surfacePoint(s,u,t,loop=0){
 const table=s.metrics[loop],distance=(u===1?1:u-Math.floor(u))*table.length;let lo=0,hi=table.samples.length-1;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(table.samples[mid]<distance)lo=mid;else hi=mid;}
 const f=(distance-table.samples[lo])/Math.max(1e-8,table.samples[hi]-table.samples[lo]),angle=(lo+f)/(table.samples.length-1),[bx,bz]=basePoint(s,angle,loop),scale=surfaceScale(s,t),twist=s.twist*t,c=Math.cos(twist),sn=Math.sin(twist);
 return [(bx*c-bz*sn)*scale+s.lean*t*t,s.base+s.height*t,(bx*sn+bz*c)*scale];
}
export function surfaceNormal(s,u,t,loop=0){
 const e=.00005,a=surfacePoint(s,u-e,t,loop),b=surfacePoint(s,u+e,t,loop),c=surfacePoint(s,u,clamp(t-e,0,1),loop),d=surfacePoint(s,u,clamp(t+e,0,1),loop),
  du=b.map((v,i)=>v-a[i]),dv=d.map((v,i)=>v-c[i]),n=[du[1]*dv[2]-du[2]*dv[1],du[2]*dv[0]-du[0]*dv[2],du[0]*dv[1]-du[1]*dv[0]],l=Math.hypot(...n);
 return n.map(v=>v/l);
}
export function facadePoint(f,x,y,depth=0){
 if(!f.surface)return f.position.map((v,i)=>v+f.u[i]*x+(i===1?y:0)+f.n[i]*depth);
 const s=f.surface,u=f.domain[0]+(x/f.width+.5)*(f.domain[1]-f.domain[0]),t=(f.position[1]-s.base+y)/s.height,p=surfacePoint(s,u,t,f.loop);if(depth===0)return p;const n=surfaceNormal(s,u,clamp(t,0,1),f.loop);
 // Allow coping and entrance attachments to rise a little beyond the roof.
 return p.map((v,i)=>v+n[i]*depth);
}
export function facadeNormal(f,x,y){
 if(!f.surface)return f.n;
 return surfaceNormal(f.surface,f.domain[0]+(x/f.width+.5)*(f.domain[1]-f.domain[0]),clamp((f.position[1]-f.surface.base+y)/f.surface.height,0,1),f.loop);
}
export function recessLimit(f,requested){
 if(!f.surface)return requested;
 const s=f.surface,t=clamp((f.position[1]-s.base+f.height*.5)/s.height,0,1);let limit=requested;
 for(let i=0;i<5;i++){
  const u=f.domain[0]+(f.domain[1]-f.domain[0])*(i+.5)/5,e=.001,
   a=surfacePoint(s,u-e,t,f.loop),b=surfacePoint(s,u,t,f.loop),c=surfacePoint(s,u+e,t,f.loop),
   ab=Math.hypot(b[0]-a[0],b[2]-a[2]),bc=Math.hypot(c[0]-b[0],c[2]-b[2]),ac=Math.hypot(c[0]-a[0],c[2]-a[2]),
   area2=Math.abs((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]));
  if(area2>1e-10)limit=Math.min(limit,ab*bc*ac/(2*area2)*.38);
 }
 return Math.max(.12,limit);
}
export function curvedAssembly(o,mass,facade,world){
 const r=random('curve:'+o.massingSeed),base=o.world==='ocean'?2.4:.45,
  s={kind:mass,rx:o.baysX*o.bay*.48,rz:o.baysZ*o.bay*(mass==='sail-shell'?.3:.48),height:o.floors*world.floor*(mass==='canopy-shell'?.75:1),base,
   taper:clamp(o.taper*(.35+r()*.25),.1,.7),twist:o.twist*(mass==='helix-shell'?1.1:.22)*(r()>.5?1:-1),lean:mass==='sail-shell'?o.baysX*o.bay*.35:0,
   lobes:3+Math.floor(r()*3),lobing:.1+r()*.09,court:.5+r()*.12,metrics:[]};
 const loops=mass==='atrium-shell'?2:1;
 for(let loop=0;loop<loops;loop++){const samples=[0];let p=basePoint(s,0,loop);for(let i=1;i<=768;i++){const q=basePoint(s,i/768,loop);samples.push(samples.at(-1)+Math.hypot(q[0]-p[0],q[1]-p[1]));p=q;}s.metrics.push({samples,length:samples.at(-1)});}
 const facades=[],roofLoops=[],floorHeight=s.height/o.floors;
 for(let loop=0;loop<loops;loop++){
  const count=Math.max(12,Math.round(s.metrics[loop].length/o.bay));s.metrics[loop].bays=count;
  roofLoops.push(Array.from({length:count*3},(_,i)=>surfacePoint(s,i/(count*3),1,loop)));
  for(let floor=0;floor<o.floors;floor++)for(let col=0;col<count;col++){
   const u0=col/count,u1=(col+1)/count,t=floor/o.floors,p=surfacePoint(s,(u0+u1)/2,t,loop),n=surfaceNormal(s,(u0+u1)/2,t,loop),u=[n[2],0,-n[0]],ul=Math.hypot(...u);
   facades.push({id:`curve:${loop}:${col}:${floor}`,x:col,z:loop,side:loop,floor,zone:floor===0?'base':floor===o.floors-1?'crown':'body',type:'window',accent:col%5===0,position:p,u:u.map(v=>v/ul),n,
    width:s.metrics[loop].length/count,height:floorHeight,surface:s,loop,domain:[u0,u1],span:1,column:col,wall:`curve:${loop}`,occupied:false,variant:col%3});
  }
 }
 const entry=facades.filter(f=>f.loop===0&&f.floor===0).sort((a,b)=>b.position[2]-a.position[2])[0];entry.type='entry';
 return {schema:'aether.native-grammar/2',options:o,mass,facade,world,surface:s,facades,foundation:base,rotation:r()*Math.PI*.4,
  heights:[],columns:[],roofs:[],roofLoops,entry:entry.id,bounds:{width:s.rx*2+Math.abs(s.lean),depth:s.rz*2,height:base+s.height},
  signature:JSON.stringify(s),trace:[`surface/${mass}`,`loops/${loops}`,`taper/${s.taper.toFixed(2)}`,`twist/${s.twist.toFixed(2)}`]};
}
