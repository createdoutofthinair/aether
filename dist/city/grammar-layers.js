import {random} from '../ships/blueprint.js';

// Resolve semantic facade layers before meshing. Each exposed cell has exactly
// one owner; grouping can span bays and storeys without stacking window decals.
export function facadeLayers(ir){
 const o=ir.options,rows=new Map();
 for(const f of ir.facades){
  const wall=f.wall??`${f.side}:${Math.round((f.position[0]*f.n[0]+f.position[2]*f.n[2])*100)}`,key=wall+':'+f.floor;
  f.wall=wall;f.column??=Math.round((f.position[0]*f.u[0]+f.position[2]*f.u[2])/o.bay);
  if(!rows.has(key))rows.set(key,[]);rows.get(key).push(f);
 }
 const groups=[];
 for(const row of rows.values()){
  row.sort((a,b)=>a.column-b.column);let i=0;
  while(i<row.length){
   const f=row[i],band=Math.floor(f.floor/3),rng=random(`${o.facadeSeed}:${f.wall}:${band}:${f.column}`),desired=f.type==='entry'?1:1+Math.floor(rng()*o.grouping),cells=[f];
   while(cells.length<desired&&i+cells.length<row.length){const next=row[i+cells.length],last=cells.at(-1);if(next.column!==last.column+1||next.type==='entry')break;cells.push(next);}
   const first=cells[0],last=cells.at(-1),span=cells.length,id=first.id,face={...first,id,cells:cells.map(c=>({id:c.id,x:c.x,z:c.z,floor:c.floor,side:c.side,n:c.n})),span,floorSpan:1,width:cells.reduce((s,f)=>s+f.width,0),
    position:first.surface?first.position.map((v,j)=>j===1?v:(first.position[j]+last.position[j])*.5):first.position.map((v,j)=>(v+last.position[j])*.5),
    domain:first.surface?[first.domain[0],last.domain[1]]:undefined};
   // Reserve large coherent regions: shafts, opaque armor, technical bands,
   // grouped views and occasional double-height atria. Coverage is building-wide.
   const region=random(`${o.facadeSeed}:region:${first.wall}:${Math.floor(first.column/3)}:${band}`)(),
    mechanical=first.floor>1&&first.floor%7===5,spine=(Math.floor(first.column/3)+2)%5===0,
    layout=o.layout,entry=cells.some(c=>c.type==='entry');
   face.region=entry?'access':mechanical?'mechanical':spine?'spine':region<o.coverage?'occupied':'armor';
   face.type=entry?'entry':mechanical?'vent':spine?'solid':region<o.coverage?'window':region>.88?'service':'solid';
   if(layout==='ribbons'&&!entry&&!spine){face.type=first.floor%4===1||first.floor%4===2?'window':mechanical?'vent':'solid';face.aperture='ribbon';}
   else if(layout==='shielded'&&!entry){face.type=spine?'service':region<o.coverage*.65&&first.floor%3!==0?'window':'solid';face.aperture='viewport';}
   else if(layout==='atrium'&&!entry&&!mechanical){face.type=(Math.floor(first.column/3)%3===1)?'window':region<o.coverage*.55?'window':'solid';face.aperture=face.width>o.bay*1.5?'panoramic':'tall';}
   else face.aperture=region<.18?'slit':region<.38?'tall':span>1?'panoramic':'viewport';
   if(mechanical&&!entry){face.type='vent';face.aperture='ribbon';}
   else if(spine&&!entry)face.type=ir.facade==='service'?'service':'solid';
   face.zone=entry?'base':mechanical?'mechanical':first.zone==='mechanical'?'body':first.zone;
   if(ir.facade==='gallery'&&face.type==='window'&&first.floor%3===1)face.type='loggia';
   if(ir.facade==='service'&&face.type==='window'&&region>.35)face.type='service';
   face.accent=spine;face.occupied=region>.28&&region<.62;face.variant=Math.floor(rng()*3);face.shift=(rng()-.5)*.16;
   face.floorHeight=first.height;groups.push(face);i+=span;
  }
 }
 // Merge compatible stacked glazing panels. A double-height opening replaces
 // both wall cells, including their intermediate sill/floor datum.
 const byKey=new Map(groups.map(f=>[`${f.wall}:${f.column}:${f.floor}:${f.span}`,f])),consumed=new Set(),resolved=[];
 for(const f of [...groups].sort((a,b)=>a.floor-b.floor||a.id.localeCompare(b.id))){if(consumed.has(f.id))continue;const next=byKey.get(`${f.wall}:${f.column}:${f.floor+1}:${f.span}`);
  if(f.type==='window'&&f.floor%3===1&&next?.type==='window'&&next.zone!=='crown'&&f.aperture!=='ribbon'&&f.aperture!=='slit'){
   f.cells.push(...next.cells);f.height+=next.height;f.floorSpan=2;consumed.add(next.id);f.aperture='atrium';
  }
  resolved.push(f);
 }
 ir.cellCount=ir.facades.length;ir.facades=resolved;ir.entry=resolved.find(f=>f.type==='entry')?.id;
 ir.trace.push(`layout/${o.layout}`,`panels/${resolved.length}`,`source-cells/${ir.cellCount}`);return ir;
}
