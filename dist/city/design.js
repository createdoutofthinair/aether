import {random} from '../ships/blueprint.js';

export const ARCHITECTURAL_KITS={
 stratum:{name:'Stratum',subtitle:'Corporate / orbital engineering',skin:'ceramic',frame:'frame',pattern:'curtain',brace:.65,service:.65,accent:'#7dbacb',colors:['#526777','#283844','#1e2831','#535b63','#26313e','#768089','#2f788a','#aa844d']},
 forge:{name:'Foundry',subtitle:'Industrial / infrastructure',skin:'repair',frame:'service',pattern:'punched',brace:1,service:1,accent:'#cf9c62',colors:['#666059','#45484b','#272e32','#65645a','#323c41','#847463','#ae7542','#d2ad6b']},
 aurelia:{name:'Aurelia',subtitle:'Civic / precision composite',skin:'ceramic',frame:'frame',pattern:'ribbon',brace:.3,service:.4,accent:'#8ec4c6',colors:['#cbd2d4','#8d9ba4','#47565e','#a3aaa9','#67757d','#bac3c7','#638c98','#bca375']},
 verdant:{name:'Canopy',subtitle:'Biophilic / inhabited terraces',skin:'ceramic',frame:'frame',pattern:'balcony',brace:.4,service:.5,accent:'#a4b99a',colors:['#7f897c','#3e5756','#263b3d','#666d62','#374e47','#8f9581','#5b8b75','#bd9d6a']},
 monolith:{name:'Obsidian',subtitle:'Monumental / shielded habitat',skin:'roof',frame:'frame',pattern:'vertical',brace:.85,service:.75,accent:'#a2a8df',colors:['#414858','#687384','#252c37','#565c68','#363d4d','#73798a','#747fa6','#ad9a77']}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const value=(v,f,a,b)=>clamp(Number.isFinite(Number(v))?Number(v):f,a,b);
export function designOptions(input={}){
 return {finishRoughness:value(input.finishRoughness,.47,.22,.9),panelVariation:value(input.panelVariation,.035,0,.15),kit:Object.hasOwn(ARCHITECTURAL_KITS,input.kit)?input.kit:'aurelia',
  complexity:value(input.complexity,.65,0,1),asymmetry:value(input.asymmetry,.65,0,1),
  plating:value(input.plating,.48,0,.85),structure:value(input.structure,.65,0,1),
  equipment:value(input.equipment,.65,0,1),signage:value(input.signage,.35,0,1),
  facade:['auto','curtain','ribbon','punched','vertical','balcony'].includes(input.facade)?input.facade:'auto',
  crown:['auto','plant','antenna','lantern','helipad','terrace'].includes(input.crown)?input.crown:'auto',
  materialTint:/^#[0-9a-f]{6}$/i.test(input.materialTint||'')?input.materialTint:null};
}
export function cloneVolume(v,id,x,z,scale,height){
 const base=v.levels[0].y,span=v.levels.at(-1).y-base;
 return {...v,id,x,z,shape:{...v.shape,rx:v.shape.rx*scale,rz:v.shape.rz*scale},levels:v.levels.map(l=>({...l,y:base+(l.y-base)*height/Math.max(1,span)}))};
}
/** Art-directed composition precedes facade subdivision. Seed variation affects
 * whole masses and their hierarchy, not a field of independent random greebles. */
export function composeBuilding(recipe,assembly){
 const r=random(`composition:${recipe.seed}:${recipe.family}:${recipe.profile}`),d=recipe.design||designOptions(),kit=ARCHITECTURAL_KITS[d.kit],w=recipe.width,depth=recipe.depth,h=recipe.height,b=recipe.foundation;
 let {volumes,supports,bridges}=assembly;
 if(recipe.modules?.length){
  volumes=recipe.modules.filter(m=>m.enabled!==false).map(m=>({id:m.id,label:m.label,role:m.role,shape:{kind:m.shape,rx:m.width/2,rz:m.depth/2,curve:recipe.shape.curve,lobes:recipe.shape.lobes,court:recipe.shape.court},x:m.x,z:m.z,yaw:m.yaw*Math.PI/180,levels:m.sections?.length>=2?m.sections.map(l=>({y:m.y+l.t*m.height,scale:l.scale*(1-m.taper*l.t)/Math.max(.1,1-m.referenceTaper*l.t),twist:l.twist+(m.twist-m.referenceTwist)*Math.PI/180*l.t})):m.profile==='shell'?Array.from({length:9},(_,i)=>({y:m.y+m.height*Math.sin(i/8*Math.PI/2),scale:Math.max(.025,Math.cos(i/8*Math.PI/2)),twist:0})):[{y:m.y,scale:1,twist:0},{y:m.y+m.height,scale:1-m.taper,twist:m.twist*Math.PI/180}],shell:m.profile==='shell',facade:m.facade!==false,garden:m.role==='terrace',design:d,pattern:m.pattern,finish:m.finish,roof:m.roof}));
  const byId=new Map(recipe.modules.map(m=>[m.id,m])),point=anchor=>{
   const m=byId.get(anchor.id);if(!m||m.enabled===false)return null;const a=m.yaw*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=anchor.x*m.width/2,z=anchor.z*m.depth/2;return[m.x+x*c-z*s,anchor.ground?0:m.y+anchor.y*m.height,m.z+x*s+z*c];
  };
  supports=(recipe.connections?.supports||[]).flatMap(v=>{const a=point(v.a),b=point(v.b);return a&&b?[{a,b,radius:v.radius}]:[];});
  bridges=(recipe.connections?.bridges||[]).flatMap(v=>{const a=point(v.a),b=point(v.b);return a&&b?[{a,b,width:v.width,height:v.height}]:[];});
 }else{
  if(['spire','helix','petal','habitat'].includes(recipe.family)&&d.complexity>.15){
   if(recipe.family==='spire'){
    const original=volumes[0],shape=recipe.profile?'ellipse':'softbox';volumes=[];
    const count=d.complexity>.7?5:3;
    for(let i=0;i<count;i++){
     const x=(i-(count-1)/2)*w*.17,z=(i%2?-.17:.13)*depth*(.4+d.asymmetry*.6),scale=.42+r()*.18,height=(h-b)*(i===Math.floor(count/2)?1:.48+r()*.34);
     const v=cloneVolume({...original,shape:{...original.shape,kind:shape,rx:w*.38,rz:depth*.4},levels:[{y:b,scale:1},{y:h,scale:.93}]},'shaft-'+i,x,z,scale,height);v.role=i%2?'service':'tower';volumes.push(v);
    }
   }else if(recipe.family==='helix'){
    const stem=volumes[0];stem.x=-w*.12*d.asymmetry;stem.shape.rx*=.73;stem.shape.rz*=.8;
    volumes.push({...cloneVolume(stem,'satellite',w*.25,-depth*.17,.55,(h-b)*(.55+r()*.23)),role:'service'});
    bridges.push({a:[stem.x,h*.48,0],b:[w*.25,h*.48,-depth*.17],width:4,height:3});
   }else if(recipe.family==='habitat'){
    volumes.forEach((v,i)=>{const base=v.levels[0].y;v.levels.at(-1).y=base+(v.levels.at(-1).y-base)*(i===0?1:.62+r()*.22);v.x+=(r()-.5)*w*.1*d.asymmetry;});
   }
  }
  if(d.complexity>.3&&!['dome','shell','vault','ring','courtyard','crescent'].includes(recipe.family)){
   const v={id:'podium',label:'Public podium',role:'podium',shape:{kind:recipe.profile?'ellipse':'softbox',rx:w*.47,rz:depth*.47,curve:.6,lobes:3,court:.5},x:0,z:0,levels:[{y:b,scale:1},{y:Math.min(b+9,h*.23),scale:.98}],facade:true};volumes.unshift(v);
  }
 }
 volumes.forEach((v,i)=>{v.role||=v.shell?'shell':i%3===1?'service':'tower';v.label||=v.id.replaceAll('-',' ');v.design=d;v.skin=v.finish&&v.finish!=='auto'?v.finish:kit.skin;v.pattern=v.pattern&&v.pattern!=='auto'?v.pattern:v.role==='podium'?'curtain':v.role==='service'?'punched':d.facade==='auto'?kit.pattern:d.facade;});
 return {volumes,supports,bridges};
}

export function normalizeModules(modules){
 if(!Array.isArray(modules))return undefined;
 const seen=new Set();
 return modules.slice(0,12).map((m,i)=>{
  let id=String(m.id||'mass-'+i).replace(/[^\w-]/g,'').slice(0,50)||'mass-'+i;while(seen.has(id))id+='x';seen.add(id);
  return {id,label:String(m.label||'Mass '+(i+1)).slice(0,60),enabled:m.enabled!==false,
   shape:['ellipse','softbox','petal','ring','crescent','courtyard','chamfer','triangle','hexagon','wedge','lblock','cross'].includes(m.shape)?m.shape:'chamfer',
   role:['tower','podium','service','terrace','crown'].includes(m.role)?m.role:'tower',profile:m.profile==='shell'?'shell':'tower',
   pattern:['auto','curtain','ribbon','punched','vertical','balcony'].includes(m.pattern)?m.pattern:'auto',finish:['auto','ceramic','frame','service','stone','roof','repair','accent'].includes(m.finish)?m.finish:'auto',roof:['auto','garden','solar','sealed','shield','crown'].includes(m.roof)?m.roof:'auto',
   width:value(m.width,20,5,160),depth:value(m.depth,20,5,160),height:value(m.height,45,.5,240),
   x:value(m.x,0,-120,120),y:value(m.y,2.4,0,240),z:value(m.z,0,-120,120),yaw:value(m.yaw,0,-180,180),taper:value(m.taper,.05,0,.55),twist:value(m.twist,0,-60,60),facade:m.facade!==false,
   referenceTaper:value(m.referenceTaper,m.taper||0,0,.55),referenceTwist:value(m.referenceTwist,m.twist||0,-60,60),sections:Array.isArray(m.sections)?m.sections.slice(0,16).map(l=>({t:value(l.t,0,0,1),scale:value(l.scale,1,.025,1.5),twist:value(l.twist,0,-2,2)})).sort((a,b)=>a.t-b.t):undefined};
 }).slice(0,12);
}
export function modulesFromAssembly(assembly){return assembly.volumes.map((v,i)=>{const height=v.levels.at(-1).y-v.levels[0].y,taper=Math.min(.55,Math.max(0,1-v.levels.at(-1).scale)),twist=(v.levels.at(-1).twist||0)*180/Math.PI;return{id:v.id,label:v.label||v.id,shape:v.shape.kind,role:v.role||'tower',profile:v.shell?'shell':'tower',width:v.shape.rx*2,depth:v.shape.rz*2,height,x:v.x||0,y:v.levels[0].y,z:v.z||0,yaw:(v.yaw||0)*180/Math.PI,taper,twist,referenceTaper:taper,referenceTwist:twist,sections:v.levels.map(l=>({t:(l.y-v.levels[0].y)/height,scale:l.scale,twist:l.twist||0})),facade:v.facade!==false,enabled:true};});}
export function connectionsFromAssembly(assembly){
 const candidates=assembly.volumes.filter(v=>v.role!=='podium'),volumes=candidates.length?candidates:assembly.volumes;
 const anchor=p=>{const v=[...volumes].sort((a,b)=>Math.hypot(p[0]-(a.x||0),p[2]-(a.z||0))-Math.hypot(p[0]-(b.x||0),p[2]-(b.z||0)))[0],angle=-(v.yaw||0),x=p[0]-(v.x||0),z=p[2]-(v.z||0);return{id:v.id,x:(x*Math.cos(angle)-z*Math.sin(angle))/v.shape.rx,z:(x*Math.sin(angle)+z*Math.cos(angle))/v.shape.rz,y:(p[1]-v.levels[0].y)/(v.levels.at(-1).y-v.levels[0].y),ground:p[1]===0};};
 return {supports:assembly.supports.map(v=>({...v,a:anchor(v.a),b:anchor(v.b)})),bridges:assembly.bridges.map(v=>({...v,a:anchor(v.a),b:anchor(v.b)}))};
}
export function normalizeConnections(input,modules){
 const ids=new Set(modules.map(m=>m.id)),anchor=v=>v&&ids.has(v.id)?{id:v.id,x:value(v.x,0,-20,20),y:value(v.y,0,-20,20),z:value(v.z,0,-20,20),ground:v.ground===true}:null;
 const normalize=(list,kind)=>(Array.isArray(list)?list:[]).slice(0,40).flatMap(v=>{const a=anchor(v.a),b=anchor(v.b);return a&&b?[{a,b,...(kind==='supports'?{radius:value(v.radius,.5,.1,4)}:{width:value(v.width,4,1,30),height:value(v.height,3,1,15)})}]:[];});
 return {supports:normalize(input?.supports,'supports'),bridges:normalize(input?.bridges,'bridges')};
}
