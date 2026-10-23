import {normalizeModules,modulesFromAssembly,connectionsFromAssembly} from './design.js';
// Original procedural blocks. 6 m planning grid, 4.2 m occupied floors.
export const CONSTRUCTION_BLOCKS={
 core:{label:'Service core',shape:'chamfer',role:'service',width:12,depth:12,height:25.2,pattern:'punched',roof:'sealed'},
 floor:{label:'Occupied floor stack',shape:'chamfer',role:'tower',width:24,depth:24,height:16.8,pattern:'ribbon'},
 wing:{label:'Habitat wing',shape:'softbox',role:'tower',width:18,depth:30,height:16.8,pattern:'balcony'},
 deck:{label:'Transfer deck',shape:'chamfer',role:'terrace',width:36,depth:30,height:4.2,pattern:'punched',roof:'garden'},
 wedge:{label:'Tapered end block',shape:'wedge',role:'tower',width:24,depth:24,height:16.8,pattern:'vertical'},
 junction:{label:'Cross junction',shape:'cross',role:'podium',width:30,depth:30,height:8.4,pattern:'curtain'},
 corner:{label:'L-shaped corner',shape:'lblock',role:'tower',width:30,depth:30,height:21,pattern:'ribbon'}
};
export function attachConstructionBlock(recipe,assembly,selected,type='floor',side='top'){
 const block=CONSTRUCTION_BLOCKS[type];if(!block)throw Error('Choose a construction block');
 const modules=recipe.modules?structuredClone(recipe.modules):modulesFromAssembly(assembly);if(modules.length>=12)throw Error('An assembly supports 12 masses');
 const anchor=modules.find(m=>m.id===selected)||modules.at(-1);if(!anchor)throw Error('Select a host mass');
 let id='block-'+type+'-'+modules.length;while(modules.some(m=>m.id===id))id+='x';
 const next={...block,height:block.height/4.2*recipe.floorHeight,id,x:anchor.x,y:anchor.y,z:anchor.z,yaw:anchor.yaw||0,taper:0,enabled:true,facade:true};
 if(side==='top')next.y=anchor.y+anchor.height;
 else{const angle=(anchor.yaw||0)*Math.PI/180,dx=(side==='east'?1:side==='west'?-1:0)*(anchor.width+block.width)/2,dz=(side==='south'?1:side==='north'?-1:0)*(anchor.depth+block.depth)/2;next.x+=dx*Math.cos(angle)-dz*Math.sin(angle);next.z+=dx*Math.sin(angle)+dz*Math.cos(angle);}
 if(Math.abs(next.x)>120||Math.abs(next.z)>120||next.y>240)throw Error('Attachment exceeds the editable assembly bounds');
 return{recipe:{...recipe,modules:normalizeModules([...modules,next]),connections:recipe.connections||connectionsFromAssembly(assembly)},id};
}
export function constructionAssembly(recipe){
 if(!['modular','junction','buttress','dock'].includes(recipe.family))return null;
 const w=recipe.width,d=recipe.depth,h=recipe.height,b=recipe.foundation,volumes=[],bridges=[],supports=[];
 const add=(id,shape,x,z,rx,rz,y,top,role='tower',extra={})=>{const floor=recipe.floorHeight;y=b+Math.round((y-b)/floor)*floor;top=Math.max(y+floor,b+Math.round((top-b)/floor)*floor);const volume={id,label:id.replaceAll('-',' '),shape:{kind:shape,rx,rz,curve:.5},x,z,levels:[{y,scale:1,twist:0},{y:top,scale:1,twist:0}],role,facade:true,...extra};volumes.push(volume);return volume;};
 if(recipe.family==='modular'){
  const count=4+recipe.profile,step=(h-b)/count;
  add('service-core','chamfer',-w*.3,0,w*.105,d*.29,b,h,'service');
  for(let i=0;i<count;i++)add('floor-module-'+i,i%2?'chamfer':'wedge',w*(i%2?.08:-.04),0,w*(.36-i*.025),d*(.4-i*.018),b+i*step,b+(i+1)*step,'tower',{garden:i<count-1});
 }else if(recipe.family==='junction'){
  add('central-core','chamfer',0,0,w*.18,d*.18,b,h,'service');
  const arms=recipe.profile?4:3;for(let i=0;i<arms;i++){const a=i*Math.PI/2,vertical=i%2,top=b+(h-b)*(.48+(i%3)*.12);add('attached-wing-'+i,'chamfer',Math.cos(a)*w*.29,Math.sin(a)*d*.29,w*(vertical?.18:.3),d*(vertical?.3:.18),b,top,'tower');}
 }else if(recipe.family==='buttress'){
  const core=add('tower-shaft','chamfer',0,0,w*.24,d*.25,b,h);core.levels=[{y:b,scale:1.2},{y:b+(h-b)*.22,scale:1},{y:h-8,scale:.92},{y:h,scale:.72}];
  for(const side of [-1,1]){const v=add('structural-end-'+side,'wedge',side*w*.3,0,w*.14,d*.4,b,b+(h-b)*.64,'service');v.levels=[{y:b,scale:1},{y:b+(h-b)*.18,scale:1},{y:b+(h-b)*.64,scale:.46}];}
  add('transfer-crown','chamfer',0,0,w*.35,d*.37,h-14,h-7,'terrace');
 }else{
  add('junction-hub','cross',0,0,w*.22,d*.22,b,h*.6,'service');
  for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.cos(a)*w*.35,z=Math.sin(a)*d*.35,top=b+(h-b)*(.65+(i%2)*.25);add('docked-block-'+i,i%2?'wedge':'chamfer',x,z,w*.145,d*.145,b,top,'tower');bridges.push({a:[Math.cos(a)*w*.15,b+6,Math.sin(a)*d*.15],b:[x,b+6,z],width:4.2,height:3.6});}
 }
 return{volumes,bridges,supports};
}
