// Native architectural control grammar. No renderer, DCC, imported meshes or
// training data. The IR owns every semantic choice; mesh LOD cannot reroll it.
import {random} from '../ships/blueprint.js';
import {CURVED_MASSES,curvedAssembly} from './grammar-surfaces.js';
import {facadeLayers} from './grammar-layers.js';

export const MASS_RULES=[
 ['court','Enclosed court'],['horseshoe','Open horseshoe'],['elbow','Offset elbow'],
 ['cross','Cross wings'],['hplan','Linked parallel wings'],['comb','Service spine'],
 ['terraces','Stepped terraces'],['ziggurat','Terraced pyramid'],['twin','Twin towers / podium'],
 ['triad','Three towers / podium'],['perimeter','Perimeter / raised corner'],['blade','Blade / service core']
].map(([id,label])=>({id,label})).concat(CURVED_MASSES);
export const FACADE_RULES=[
 ['frame','Deep structural frame'],['ribbon','Horizontal ribbon'],['paired','Paired window bays'],
 ['fins','Vertical solar fins'],['gallery','Recessed loggias'],['service','Technical service bands']
].map(([id,label])=>({id,label}));
export const CONSTRUCTION_WORLDS={
 garden:{label:'Temperate · ceramic / open',floor:4.1,window:.65,recess:.38,shade:.35,wall:.22,roof:'garden',kit:'aurelia'},
 arid:{label:'Arid · shaded / thermal',floor:4.4,window:.42,recess:.65,shade:1.05,wall:.48,roof:'solar',kit:'stratum'},
 glacial:{label:'Glacial · insulated / compact',floor:3.9,window:.39,recess:.58,shade:.12,wall:.5,roof:'sealed',kit:'monolith'},
 ocean:{label:'Ocean · deep frames / raised',floor:4.3,window:.62,recess:.46,shade:.6,wall:.3,roof:'solar',kit:'aurelia'},
 lunar:{label:'Airless · shielded / pressure',floor:3.8,window:.24,recess:.72,shade:.15,wall:.65,roof:'shield',kit:'forge'},
 lowgravity:{label:'Low gravity · slender / open',floor:4.6,window:.75,recess:.3,shade:.48,wall:.18,roof:'crown',kit:'verdant'}
};
const bounded=(v,f,a,b)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):f;
const member=(v,list,f)=>list.some(e=>e.id===v)?v:f;
export function grammarOptions(input={}){
 return {seed:String(input.seed??'CONCORD-01').slice(0,100),
  mass:member(input.mass,[{id:'auto'},...MASS_RULES],'auto'),facade:member(input.facade,[{id:'auto'},...FACADE_RULES],'auto'),
  world:Object.hasOwn(CONSTRUCTION_WORLDS,input.world)?input.world:'garden',
  floors:Math.round(bounded(input.floors,12,4,24)),baysX:Math.round(bounded(input.baysX,8,6,12)),baysZ:Math.round(bounded(input.baysZ,7,6,12)),
  bay:bounded(input.bay,4.5,3.6,6),taper:bounded(input.taper,1,.2,1.5),twist:bounded(input.twist,1,0,1.7),
  grouping:Math.round(bounded(input.grouping,3,1,4)),coverage:bounded(input.coverage,.58,.15,.9),layout:['clustered','ribbons','shielded','atrium'].includes(input.layout)?input.layout:'clustered',massingSeed:String(input.massingSeed??input.seed??'CONCORD-01').slice(0,100),
  facadeSeed:String(input.facadeSeed??input.seed??'CONCORD-01').slice(0,100)};
}
// A union of integer columns is deliberately used for this construction family.
// Shared boundaries disappear before geometry is made, not through fragile CSG.
// Curved/twisted architecture remains in architecture.js and is not replaced.
export function compileGrammar(input={}){
 const o=grammarOptions(input),massR=random('mass:'+o.massingSeed),faceR=random('facade:'+o.facadeSeed),
  mass=o.mass==='auto'?MASS_RULES[Math.floor(massR()*MASS_RULES.length)].id:o.mass,
  facade=o.facade==='auto'?FACADE_RULES[Math.floor(faceR()*FACADE_RULES.length)].id:o.facade,
  world=CONSTRUCTION_WORLDS[o.world],nx=o.baysX,nz=o.baysZ,F=o.floors,
  wing=2+(massR()>.65?1:0),podium=2+Math.floor(massR()*2),
  ax=2+Math.floor(massR()*2),az=2+Math.floor(massR()*2),
  heights=Array(nx*nz).fill(0),massingRotation=Math.floor(massR()*4),
  shoulder=.52+massR()*.24,terraceRun=1+Math.floor(massR()*3),
  terraceDrop=Math.max(1,Math.ceil((F-2)/(Math.ceil(nz/terraceRun)+1)));
 if(CURVED_MASSES.some(r=>r.id===mass))return facadeLayers(curvedAssembly(o,mass,facade,world));
 const ix=(x,z)=>z*nx+x,get=(x,z)=>x<0||z<0||x>=nx||z>=nz?0:heights[ix(x,z)],
  set=(x,z,h)=>heights[ix(x,z)]=Math.max(0,Math.min(F,Math.round(h))),
  strip=(x,z)=>x<wing||x>=nx-wing||z<wing||z>=nz-wing;
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
  let h=0;
  if(mass==='court')h=strip(x,z)?F-(x>=nx-wing?Math.floor(F*.2):0):0;
  if(mass==='horseshoe')h=x<wing||x>=nx-wing||z<wing?F-(x>=nx-wing?Math.floor(F*.3):0):0;
  if(mass==='elbow')h=x<wing||z<wing?(x<wing?F:F*shoulder):0;
  if(mass==='cross')h=Math.abs(x-(nx-1)/2)<wing/2||Math.abs(z-(nz-1)/2)<wing/2?F-Math.floor(z/(nz/3)):0;
  if(mass==='hplan')h=x<wing||x>=nx-wing||Math.abs(z-(nz-1)/2)<1?F*(x>=nx-wing?shoulder:1):0;
  if(mass==='comb')h=z<wing||x%4<2?F*(z<wing?1:shoulder):0;
  if(mass==='terraces')h=F-Math.floor(z/terraceRun)*terraceDrop;
  if(mass==='ziggurat')h=podium+Math.min(x,nx-1-x,z,nz-1-z)*Math.ceil((F-podium)/Math.floor(Math.min(nx,nz)/2));
  if(mass==='twin')h=x<ax||x>=nx-ax?(x<ax?F:F*shoulder):podium;
  if(mass==='triad')h=(x<ax&&z<az)||(x>=nx-ax&&z<az)||(Math.abs(x-(nx-1)/2)<ax/2&&z>=nz-az)?F*(z>=nz-az?1:shoulder):podium;
  if(mass==='perimeter')h=strip(x,z)?(x<wing&&z<wing?F:F*shoulder):0;
  if(mass==='blade')h=x<wing?F*.65:z>=Math.floor(nz/2)-1&&z<=Math.floor(nz/2)+1?F:podium;
  set(x,z,h?Math.max(2,h):0);
 }
 // Seeded height accents change actual floor occupancy without filling voids.
 // Quantize whole wings, never add ungrounded random cubes to the envelope.
 if(['court','horseshoe','elbow','hplan','comb','perimeter'].includes(mass)){
  const cut=2+Math.floor(massR()*(nz-3)),drop=1+Math.floor(massR()*Math.max(1,F*.2));
  for(let z=cut;z<nz;z++)for(let x=0;x<nx;x++)if(get(x,z))set(x,z,Math.max(2,get(x,z)-drop));
 }
 const columns=[],facades=[],roofs=[],basis=[
  {dx:0,dz:1,u:[1,0,0],n:[0,0,1],label:'north'},
  {dx:1,dz:0,u:[0,0,-1],n:[1,0,0],label:'east'},
  {dx:0,dz:-1,u:[-1,0,0],n:[0,0,-1],label:'south'},
  {dx:-1,dz:0,u:[0,0,1],n:[-1,0,0],label:'west'}
 ],foundation=o.world==='ocean'?2.4:.45,
  phase=Math.floor(faceR()*4),rhythm=faceR()>.5?3:4,mechanical=5+Math.floor(faceR()*3),
  totalHeight=Math.max(...heights)*world.floor+foundation;
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
  const floors=get(x,z);if(!floors)continue;
  const cx=(x-(nx-1)/2)*o.bay,cz=(z-(nz-1)/2)*o.bay;
  columns.push({id:`c:${x}:${z}`,x,z,cx,cz,floors});
  const roofR=random(`roof:${o.seed}:${x}:${z}`),edge=basis.map(b=>get(x+b.dx,z+b.dz)<floors);
  roofs.push({id:`r:${x}:${z}`,x,z,cx,cz,y:foundation+floors*world.floor,edges:edge,
   equipment:roofR()<.19,roof:world.roof});
  for(const [side,b]of basis.entries()){
   const neighbor=get(x+b.dx,z+b.dz),column=side%2?z:x;
   for(let floor=neighbor;floor<floors;floor++){
    const id=`f:${x}:${z}:${side}:${floor}`,zone=floor===0?'base':floor===floors-1?'crown':floor%mechanical===mechanical-1?'mechanical':'body',
     accent=(column+phase)%rhythm===0,local=random(o.facadeSeed+':'+id),
     type=zone==='mechanical'?'vent':facade==='service'&&accent?'service':
      (facade==='paired'&&accent)||(facade==='frame'&&accent&&floor>0&&floor%3!==0)?'solid':facade==='gallery'&&floor%3===1?'loggia':'window';
    facades.push({id,x,z,side,floor,zone,type,accent,
     position:[cx+b.dx*o.bay/2,foundation+floor*world.floor,cz+b.dz*o.bay/2],u:b.u,n:b.n,
     width:o.bay,height:world.floor,occupied:local()>.72,variant:Math.floor(local()*3)});
   }
  }
 }
 // The entrance is chosen from the exterior, on the ground, with street-facing
 // clearance. Courtyard walls never accidentally become the main street door.
 const candidates=facades.filter(f=>f.floor===0&&f.side===0&&f.z===nz-1);
 const fallback=facades.filter(f=>f.floor===0&&f.side===0).sort((a,b)=>b.z-a.z||Math.abs(a.position[0])-Math.abs(b.position[0]));
 const entry=(candidates.length?candidates:fallback).sort((a,b)=>Math.abs(a.position[0])-Math.abs(b.position[0]))[0];
 if(entry){entry.type='entry';entry.zone='base';}
 const roofLevels=[...new Set(roofs.map(r=>r.y))].sort((a,b)=>a-b),
  signature=JSON.stringify({mass,nx,nz,heights,rotation:massingRotation}),
  result={schema:'aether.native-grammar/2',options:o,mass,facade,world,heights,columns,facades,roofs,
   entry:entry?.id,rotation:massingRotation*Math.PI/2,
   bounds:{width:nx*o.bay,depth:nz*o.bay,height:totalHeight},foundation,
   signature,trace:[`mass/${mass}`,`footprint/${nx}×${nz}`,`terrace-levels/${roofLevels.length}`,`facade/${facade}`,`climate/${o.world}`,`exterior-bays/${facades.length}`]};
 return facadeLayers(result);
}

export function validateGrammar(ir){
 const errors=[],{baysX:nx,baysZ:nz,floors}=ir.options,get=(x,z)=>x<0||z<0||x>=nx||z>=nz?0:ir.heights[z*nx+x];
 const ids=new Set();for(const f of ir.facades){
  if(f.width<=0||f.height<=0||!f.position.every(Number.isFinite))errors.push(`Invalid panel ${f.id}`);
  for(const c of f.cells){if(ids.has(c.id))errors.push(`Duplicate source cell ${c.id}`);ids.add(c.id);
   if(!ir.surface&&(c.floor<get(c.x+c.n[0],c.z+c.n[2])||c.floor>=get(c.x,c.z)))errors.push(`Buried facade ${c.id}`);
  }
  if(f.type==='entry'&&f.floor!==0)errors.push(`Ungrounded entry ${f.id}`);
 }
 if(ids.size!==ir.cellCount)errors.push('Missing exposed boundary cells');
 if(!ir.surface){
  for(const c of ir.columns)if(c.floors<1||c.floors>floors||!Number.isInteger(c.floors))errors.push(`Invalid column ${c.id}`);
  const occupied=new Set(ir.columns.map(c=>c.x+','+c.z)),visited=new Set(),pending=[ir.columns[0]];
  while(pending.length){const c=pending.pop();if(!c)continue;const key=c.x+','+c.z;if(visited.has(key))continue;visited.add(key);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const next={x:c.x+dx,z:c.z+dz};if(occupied.has(next.x+','+next.z)&&!visited.has(next.x+','+next.z))pending.push(next);}}
  if(visited.size!==occupied.size)errors.push('Disconnected ground footprint');
 }
 if(ir.facades.filter(f=>f.type==='entry').length!==1)errors.push('Expected one main street entrance');
 return errors;
}
