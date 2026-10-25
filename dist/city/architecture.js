import {constructionAssembly} from './construction-kit.js';
import {random} from '../ships/blueprint.js';
import {designOptions,composeBuilding,normalizeModules,normalizeConnections} from './design.js';

// A small, serializable architectural grammar. No renderer or hand-authored mesh
// is needed to author a recipe; all representations consume the same volumes.
export const ARCHITECTURE_VERSION=3;
export const BUILDING_FAMILIES=[
 ['spire','Setback spire',30,132,30,'research'],
 ['terrace','Garden terraces',52,42,44,'residential'],
 ['courtyard','Courtyard campus',58,34,58,'culture'],
 ['dome','Civic dome',56,34,56,'civic'],
 ['habitat','Linked habitat',48,68,46,'residential'],
 ['utility','Service foundry',58,26,46,'utility'],
 ['crescent','Crescent residence',60,46,55,'residential'],
 ['ring','Open atrium ring',58,32,58,'culture'],
 ['petal','Petal institute',56,62,56,'research'],
 ['shell','Lens pavilion',58,25,48,'culture'],
 ['helix','Twisted observatory',34,114,34,'research'],
 ['tripod','Triad skybridge',54,82,54,'research'],
 ['saucer','Suspended disc',56,43,56,'culture'],
 ['arcology','Stepped arcology',56,76,52,'residential'],
 ['vault','Ribbed vault',50,35,58,'utility'],
 ['canopy','Canopy habitat',58,55,52,'residential'],
 ['citadel','Citadel cluster',60,142,56,'research'],
 ['blade','Sail blade',38,122,58,'research'],
 ['portal','Gateway arcology',62,96,44,'culture'],
 ['stack','Offset megablock',58,94,54,'residential'],
 ['modular','Stacked floor modules',58,96,48,'residential'],
 ['junction','Attached wing complex',64,68,60,'research'],
 ['buttress','Buttressed service tower',48,128,48,'research'],
 ['dock','Docked habitat campus',74,42,74,'residential']
].map(([id,label,width,height,depth,use])=>({id,label,width,height,depth,use}));

export const PLANET_STYLES={
 garden:{label:'Concord · temperate garden',description:'Open courts, thin ceramic shells, garden decks and generous glazing.',height:1,floor:4.2,foundation:2.4,glazing:.64,shade:.32,rib:.35,skin:.2,roof:'garden',palette:['#c8c9b9','#859b9b','#495b55','#9a9d86','#435c5b','#afb49d','#397e88','#ad8651'],weights:{crescent:4,ring:3,petal:3,shell:3,canopy:3,terrace:3}},
 arid:{label:'Solace · desert world',description:'Deep solar brows, shaded courts, narrow windows and broad thermal plinths.',height:.8,floor:4.4,foundation:3,glazing:.32,shade:1,rib:.5,skin:.38,roof:'solar',palette:['#c9ad83','#88745e','#594b3e','#a0805e','#635747','#b9a47d','#508c85','#c78a48'],weights:{crescent:4,ring:4,terrace:3,arcology:3,vault:2,shell:2}},
 glacial:{label:'Nivalis · ice world',description:'Compact envelopes, insulated collars, enclosed entries and smaller glazing bays.',height:.78,floor:4,foundation:4,glazing:.3,shade:.08,rib:.65,skin:.55,roof:'sealed',palette:['#b6c7cf','#637e8c','#384d60','#94a5b0','#48596b','#a1b3be','#6089b4','#d9ac6c'],weights:{dome:4,vault:4,shell:3,utility:2,habitat:2}},
 ocean:{label:'Pelagia · ocean world',description:'Raised occupied decks, exposed support frames, corrosion-conscious skins and rounded wind edges.',height:.92,floor:4.3,foundation:8,glazing:.58,shade:.55,rib:.48,skin:.28,roof:'solar',palette:['#bfcec9','#73929a','#344e58','#8ba19b','#385360','#b4c3b7','#2b9eac','#bd9162'],weights:{saucer:4,canopy:4,petal:3,ring:3,tripod:2}},
 lunar:{label:'Umbra · airless outpost',description:'Heavy protective shoulders, sparse viewports, pressure vestibules and service-rich roofs.',height:.6,floor:3.8,foundation:2.8,glazing:.16,shade:.12,rib:.9,skin:.75,roof:'shield',palette:['#a7a29c','#777c83','#40444c','#89847e','#51505a','#ada398','#ab7852','#d4b477'],weights:{vault:5,dome:4,shell:4,utility:4,ring:2}},
 lowgravity:{label:'Aureole · low-gravity world',description:'Slender branching towers, high shared decks, light crowns and generous vertical separation.',height:1.25,floor:4.8,foundation:3.2,glazing:.72,shade:.38,rib:.26,skin:.16,roof:'crown',palette:['#cbc9d1','#8a899e','#414559','#9b98ab','#4c506b','#b8b0c4','#9e80b9','#d1a56b'],weights:{helix:5,tripod:5,spire:4,petal:3,canopy:3}}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const number=(v,f,a,b)=>clamp(Number.isFinite(Number(v))?Number(v):f,a,b);
export function architectureOptions(input={}){
 return {nativeMassing:input.nativeMassing===true,style:Object.hasOwn(PLANET_STYLES,input.style)?input.style:'garden',
  variation:number(input.variation,1,0,2),curvature:number(input.curvature,1,.35,1.5),
  taper:number(input.taper,1,0,1.7),twist:number(input.twist,1,0,1.8),height:number(input.height,1,.6,1.4),aspect:number(input.aspect,1,.8,1.2),
  terraces:Math.round(number(input.terraces,4,2,7)),bayWidth:number(input.bayWidth,4.5,3,8),
  glazing:number(input.glazing,1,.45,1.35),shade:number(input.shade,1,0,1.8),
  envelope:['auto','ellipse','softbox','petal'].includes(input.envelope)?input.envelope:'auto',
  roof:['auto','garden','solar','sealed','shield','crown'].includes(input.roof)?input.roof:'auto',design:designOptions(input.design)};
}
export function architecturalRecipe(family,seed,profile=0,input={}){
 const options=architectureOptions(input),style=PLANET_STYLES[options.style],f=BUILDING_FAMILIES.find(f=>f.id===family)||BUILDING_FAMILIES[0],r=random(`grammar:${seed}:${family}:${profile}`),v=options.variation;
 const width=f.width*(1+(r()-.5)*.12*v)*options.aspect,depth=f.depth*(1+(r()-.5)*.12*v)/options.aspect,height=f.height*style.height*(1+(r()-.5)*.24*v)*options.height,floorHeight=style.floor;
 return {schema:'aether.architecture/3',style:options.style,options,family:f.id,profile,seed:String(seed),width,depth,height,floorHeight,
  design:options.design,floorCount:Math.max(2,Math.floor((height-style.foundation)/floorHeight)),foundation:style.foundation,
  shape:{lobes:profile?5:3,curve:options.curvature,twist:(profile?-.48:.38)*options.twist,taper:(.16+r()*.18)*options.taper,tiers:options.terraces,court:.47+(r()-.5)*.08*v},
  facade:{bayWidth:options.bayWidth,glazing:clamp(style.glazing*options.glazing,.08,.88),shade:style.shade*options.shade,rib:style.rib,skin:style.skin,occupancy:.08+r()*.17},
  roof:options.roof==='auto'?(options.style==='lunar'?'shield':options.design.kit==='stratum'?'sealed':options.design.kit==='forge'?'solar':options.design.kit==='monolith'?'shield':style.roof):options.roof,palette:style.palette};
}

/** Footprints live in metres. Outer loops are CCW in X/Z, holes clockwise.
 * Exact corners and cardinal extrema are retained at every representation. */
export function footprint(shape,segments=48){
 const {kind='ellipse',rx=1,rz=1,lobes=3,curve=1,court=.5}=shape,n=Math.max(16,Math.ceil(segments/4)*4);
 if(['wedge','lblock','cross'].includes(kind)){const points=kind==='wedge'?[[-1,-1],[.35,-1],[1,0],[.35,1],[-1,1]]:kind==='lblock'?[[-1,-1],[1,-1],[1,-.25],[-.25,-.25],[-.25,1],[-1,1]]:[[-.35,-1],[.35,-1],[.35,-.35],[1,-.35],[1,.35],[.35,.35],[.35,1],[-.35,1],[-.35,.35],[-1,.35],[-1,-.35],[-.35,-.35]];return{outer:points.map(([x,z])=>({x:x*rx,z:z*rz})),holes:[]};}
 if(['chamfer','triangle','hexagon'].includes(kind)){const sides=kind==='triangle'?3:kind==='hexagon'?6:8,vertices=kind==='chamfer'?[[-.72,-1],[.72,-1],[1,-.72],[1,.72],[.72,1],[-.72,1],[-1,.72],[-1,-.72]]:Array.from({length:sides},(_,i)=>[Math.cos(i/sides*Math.PI*2),Math.sin(i/sides*Math.PI*2)]);return{outer:vertices.map(([x,z])=>({x:x*rx,z:z*rz})),holes:[]};}
 const ellipse=(scale=1,reverse=false)=>Array.from({length:n},(_,i)=>{const a=(reverse?-1:1)*i/n*Math.PI*2,mod=kind==='petal'?1+.22*curve*Math.cos(lobes*a):1,power=['softbox','courtyard'].includes(kind)?2/(2+curve*3):1;return{x:Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**power*rx*scale*mod,z:Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**power*rz*scale*mod};});
 if(kind==='crescent'){
  const gap=.58+.18/curve,arc=2*Math.PI-2*gap,outer=[],inner=[];
  for(let i=0;i<=n;i++){const a=Math.PI/2+gap+arc*i/n;outer.push({x:Math.cos(a)*rx,z:Math.sin(a)*rz});inner.unshift({x:Math.cos(a)*rx*court,z:Math.sin(a)*rz*court});}
  return{outer:[...outer,...inner],holes:[]};
 }
 return{outer:ellipse(),holes:['ring','courtyard'].includes(kind)?[ellipse(court,true)]:[]};
}
export function volumeLoop(volume,level,segments){
 const loops=footprint(volume.shape,segments),angle=(volume.yaw||0)+(level.twist||0),c=Math.cos(angle),s=Math.sin(angle),scale=level.scale??1;
 const transform=p=>({x:(volume.x||0)+(p.x*c-p.z*s)*scale,z:(volume.z||0)+(p.x*s+p.z*c)*scale,y:level.y});
 return{outer:loops.outer.map(transform),holes:loops.holes.map(loop=>loop.map(transform))};
}

/** Compose primary volumes, then let the renderer subdivide their envelopes
 * into metric floors/bays. No LOD decision or camera can change this recipe. */
export function compileArchitecture(recipe){
 const {width:w,depth:d,height:h,foundation:b,shape:s,family:f}=recipe;let volumes=[],supports=[],bridges=[];
 const add=(id,kind,x,z,rx,rz,levels,extra={})=>volumes.push({id,shape:{kind,rx,rz,lobes:s.lobes,curve:s.curve,court:s.court},x,z,levels:levels.map(([y,scale=1,twist=0])=>({y,scale,twist})),facade:true,...extra});
 const tower=(id,x,z,rx,rz,bottom,top,kind='ellipse',twist=0)=>add(id,kind,x,z,rx,rz,[[bottom,1,0],[top,1-s.taper,twist]]);
 const tiers=(kind,count,rx=w*.48,rz=d*.48)=>{for(let i=0;i<count;i++){const y=b+(h-b)*i/count,top=b+(h-b)*(i+1)/count,scale=1-i*.65/Math.max(1,count-1);add('tier-'+i,kind,0,0,rx*scale,rz*scale,[[y,1],[top,.96]],{garden:true});}};
 if(f==='spire'){tiers('softbox',3);}
 else if(f==='terrace'){tiers('softbox',s.tiers);}
 else if(f==='courtyard'||f==='ring'){add('court',f==='courtyard'?'courtyard':'ring',0,0,w*.48,d*.48,[[b,1],[h,1-s.taper*.3]],{garden:true});}
 else if(f==='dome'||f==='shell'||f==='vault'){
  const levels=[];for(let i=0;i<=8;i++){const t=i/8,scale=Math.max(.025,Math.cos(t*Math.PI/2));levels.push([b+(h-b)*Math.sin(t*Math.PI/2),scale]);}
  add('shell',f==='vault'?'softbox':'ellipse',0,0,w*.48,d*.48,levels,{shell:true,facade:true});
 }else if(f==='habitat'){
  for(const side of [-1,1])tower('wing-'+side,side*w*.26,side*d*.07,w*.2,d*.35,b,h*.92,'softbox');
  bridges.push({a:[-w*.26,h*.62,-d*.07],b:[w*.26,h*.62,d*.07],width:d*.14,height:3.6});
 }else if(f==='utility'){add('service-hall','softbox',0,0,w*.48,d*.48,[[b,1],[h*.8,1],[h,.75]],{equipment:true});}
 else if(f==='crescent'){add('crescent','crescent',0,0,w*.48,d*.48,[[b,1],[h,1-s.taper*.4]],{garden:true});}
 else if(f==='petal'){tower('petal',0,0,w*.4,d*.4,b,h,'petal',s.twist*.3);}
 else if(f==='helix'){const levels=[];for(let i=0;i<=8;i++){const t=i/8;levels.push([b+(h-b)*t,1-s.taper*t,s.twist*t]);}add('helix','softbox',0,0,w*.43,d*.43,levels);}
 else if(f==='tripod'){
  for(let i=0;i<3;i++){const a=i*2*Math.PI/3;tower('leg-'+i,Math.cos(a)*w*.29,Math.sin(a)*d*.29,w*.145,d*.145,b,h*.88,'ellipse');const next=(i+1)*2*Math.PI/3;bridges.push({a:[Math.cos(a)*w*.29,h*.68,Math.sin(a)*d*.29],b:[Math.cos(next)*w*.29,h*.68,Math.sin(next)*d*.29],width:4,height:4});}
  add('sky-court','ring',0,0,w*.41,d*.41,[[h*.88,1],[h,1]],{garden:true});
 }else if(f==='saucer'||f==='canopy'){
  const stem=h*(f==='saucer'?.43:.58);tower('core',0,0,w*.13,d*.13,b,stem,'ellipse');
  add('crown','ellipse',0,0,w*.48,d*.48,[[stem,.62],[stem+(h-stem)*.2,1],[h-(h-stem)*.25,.94],[h,.55]],{garden:true});
  for(let i=0;i<6;i++){const a=i*Math.PI/3;supports.push({a:[Math.cos(a)*w*.12,b,Math.sin(a)*d*.12],b:[Math.cos(a)*w*.37,stem+(h-stem)*.18,Math.sin(a)*d*.37],radius:recipe.facade.rib+.3});}
 }else if(f==='arcology'){tiers('petal',s.tiers);}
 else if(f==='citadel'){
  const rng=random('citadel:'+recipe.seed+':'+recipe.profile),count=3+Math.floor(rng()*3);for(let i=0;i<count;i++){const x=(i/(count-1)-.5)*w*.68,z=(i%2?-.12:.1)*d+(rng()-.5)*d*.13,top=b+(h-b)*(i===Math.floor(count/2)?1:.38+rng()*.48);tower('citadel-'+i,x,z,w*(.12+rng()*.035),d*(.16+rng()*.07),b,top,recipe.profile&&i%2?'hexagon':'chamfer');}
  bridges.push({a:[-w*.3,h*.43,d*.1],b:[w*.3,h*.43,d*.1],width:5,height:4});
 }else if(f==='blade'){
  const rng=random('blade:'+recipe.seed);add('sail','chamfer',-w*.12,0,w*.3,d*.46,[[b,1],[h*(.25+rng()*.2),1],[h,.5+rng()*.2]],{yaw:(rng()-.5)*.45});tower('counterweight',w*.3,-d*.14,w*.12,d*.19,b,h*(.48+rng()*.24),'chamfer');
 }else if(f==='portal'){
  for(const side of [-1,1])tower('pier-'+side,side*w*.33,0,w*.15,d*.4,b,h*(side===1?.92:1),'chamfer');
  const bridgeLevel=.5+random('portal:'+recipe.seed)()*.3;bridges.push({a:[-w*.33,h*bridgeLevel,0],b:[w*.33,h*bridgeLevel,0],width:d*.58,height:8});
 }else if(f==='stack'){
  const rng=random('stack:'+recipe.seed),count=recipe.shape.tiers+1,phase=rng()*Math.PI;for(let i=0;i<count;i++){const y=b+(h-b)*i/count;add('block-'+i,i%2?'softbox':'chamfer',Math.sin(i*1.9+phase)*w*.16,Math.cos(i*1.9+phase)*d*.13,w*(.42-i*.11/count),d*(.42-i*.11/count),[[y,1],[y+(h-b)/count,.97]],{garden:true,yaw:(rng()-.5)*.32});}
 }
 const construction=constructionAssembly(recipe);if(construction)({volumes,supports,bridges}=construction);
 ({volumes,supports,bridges}=composeBuilding(recipe,{volumes,supports,bridges}));
 // Production overrides recombine compatible modules without deleting voids
 // or replacing a shell with an unrelated extrusion.
 if(recipe.options.envelope!=='auto')for(const v of volumes)if(!v.shell&&!['ring','crescent','courtyard'].includes(v.shape.kind))v.shape.kind=recipe.options.envelope;
 // Raised ocean decks are honest foundations rather than floating buildings.
 if(b>5&&!recipe.connections)for(let i=0;i<8;i++){const a=i*Math.PI/4;supports.push({a:[Math.cos(a)*w*.29,0,Math.sin(a)*d*.29],b:[Math.cos(a)*w*.29,b,Math.sin(a)*d*.29],radius:.85});}
 const entryVolume=[...volumes].sort((a,b)=>a.levels[0].y-b.levels[0].y)[0],entryLoop=volumeLoop(entryVolume,entryVolume.levels[0],48).outer;
 const edges=entryLoop.map((p,i)=>{const q=entryLoop[(i+1)%entryLoop.length],dx=q.x-p.x,dz=q.z-p.z,length=Math.hypot(dx,dz);return{x:(p.x+q.x)/2,z:(p.z+q.z)/2,length,normal:[dz/length,0,-dx/length]};});
 const front=edges.filter(e=>e.normal[2]>.25).sort((a,b)=>b.z-a.z)[0]||edges[0],entry={x:front.x,y:entryVolume.levels[0].y,z:front.z,normal:front.normal};
 return {schema:'aether.architecture-assembly/3',recipe,volumes,supports,bridges,entry,
  sockets:[{id:'street-access',kind:'entrance',position:[entry.x,entry.y,entry.z+.7],normal:entry.normal,clearance:[5,4,5]}],
  modules:['foundation','envelope','floor-edge','facade-bay','reveal','solar-brow','roof-collar','entrance','service-rack']};
}

export function restoreArchitecture(document){
 const input=document?.recipe||document?.architecture||document;
 if(!input||!BUILDING_FAMILIES.some(f=>f.id===input.family))throw Error('Unrecognized building recipe');
 const options=architectureOptions({...input.options,design:input.design||input.options?.design,style:input.style||input.options?.style}),recipe=architecturalRecipe(input.family,String(input.seed||'ARCH-01'),input.profile===1?1:0,options);
 if(input.modules){const modules=normalizeModules(input.modules);if(!modules?.some(m=>m.enabled))throw Error('A building needs at least one enabled mass');recipe.modules=modules;if(input.connections)recipe.connections=normalizeConnections(input.connections,modules);}
 recipe.label=String(input.label||BUILDING_FAMILIES.find(f=>f.id===input.family).label).slice(0,80);return recipe;
}
export function architectureBounds(assembly){
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,maxY=0;
 for(const v of assembly.volumes)for(const l of v.levels)for(const p of volumeLoop(v,l,48).outer){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);maxY=Math.max(maxY,p.y);}
 return {minX,maxX,minZ,maxZ,maxY,width:maxX-minX,depth:maxZ-minZ,radius:Math.max(Math.hypot(minX,minZ),Math.hypot(minX,maxZ),Math.hypot(maxX,minZ),Math.hypot(maxX,maxZ))+9};
}
