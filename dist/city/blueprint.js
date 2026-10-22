import {random} from '../ships/blueprint.js';
export const CITY_VERSION=1;
export const FAMILIES=['spire','terrace','courtyard','dome','habitat','utility'];
export const PROTOTYPES=12;
export const SECTORS=8;
export const CELL_SIZE=256;
export const ROAD_CLEARANCE=54;
export function buildingBlueprint(variant=0,seed='FRESCO-01'){
 variant=((Math.trunc(variant)%PROTOTYPES)+PROTOTYPES)%PROTOTYPES;
 const family=FAMILIES[variant%6],r=random('architecture:'+seed+':'+variant),profile=Math.floor(variant/6);
 const dimensions=[[30,132,30],[52,42,44],[58,34,58],[56,34,56],[48,68,46],[58,26,46]][variant%6];
 const [width,height,depth]=dimensions.map((v,i)=>v*(i===1?.88+r()*.24:.94+r()*.06));
 return{version:CITY_VERSION,id:'building-'+variant,seed:String(seed),variant,family,profile,width,height,depth,
  footprintRadius:Math.hypot(width,depth)/2+3, floorHeight:4.2, floors:Math.max(2,Math.floor(height/4.2)),
  service:{age:.18+r()*.4,registry:'AE-'+String(10000+variant*127+Math.floor(r()*100)),accessSide:r()<.5?-1:1,accent:profile?'#a17b51':'#467c87'},
  detail:{bevel:.16,quietFacade:.65,roofEquipmentSide:r()<.5?-1:1,facadeOffset:r(),finCount:profile?6:4}};
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
export function cityOptions(options={}){
 const hubs=[1,7,19,61].includes(Number(options.hubs))?Number(options.hubs):7;
 return{seed:String(options.seed??'FRESCO-01').slice(0,80),hubs,rings:clamp(Math.round(finite(options.rings,6)),3,9),density:clamp(finite(options.density,.85),.35,1)};
}
/** The semantic layout is independent of rendering. Transit owns the land
 * before lots are generated; placement never depends on camera or mesh LOD. */
export function cityBlueprint(options={}){
 const config=cityOptions(options),{seed,rings,density}=config,radius=175+(rings-1)*128+64,spacing=radius*2+240;
 const coords=[];for(let q=-4;q<=4;q++)for(let r=-4;r<=4;r++){const distance=Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));if(distance<=4)coords.push({q,r,distance});}
 coords.sort((a,b)=>a.distance-b.distance||Math.atan2(a.r,a.q)-Math.atan2(b.r,b.q));
 const hubs=coords.slice(0,config.hubs).map((p,id)=>({...p,id,x:spacing*(p.q+p.r*.5),z:spacing*Math.sqrt(3)*p.r*.5,radius,name:id?'Satellite '+String(id).padStart(2,'0'):'Concord / civic core'}));
 const buildings=[],links=[],routes=[],parks=[];
 for(const hub of hubs){
  buildings.push({id:`${hub.id}:core`,hub:hub.id,variant:3,x:hub.x,y:0,z:hub.z,yaw:0,scale:2.15,width:1,tint:1,landmark:true,zone:'civic'});
  for(let ring=0;ring<rings;ring++){
   const roadRadius=111+ring*128;
   routes.push({type:'ring',hub:hub.id,x:hub.x,z:hub.z,radius:roadRadius,y:9,phase:hub.id*.13+ring*.21});
   const rr=175+ring*128,margin=Math.asin(ROAD_CLEARANCE/rr),sectorArc=Math.PI*2/SECTORS,usable=sectorArc-2*margin,n=Math.max(1,Math.floor(usable*rr/104));
   for(let sector=0;sector<SECTORS;sector++){
    const district=ring<2?'research':sector%4===0?'culture':sector===5?'utility':'residential';
    const families=district==='research'?[0,3,4]:district==='culture'?[2,3]:district==='utility'?[5,4]:[1,2,4,0];
    for(let plot=0;plot<n;plot++){
     const id=`${hub.id}:${ring}:${sector}:${plot}`,rng=random(seed+':lot:'+id);
     if(rng()>density)continue;
     const angle=sector*sectorArc+margin+(plot+.5)*usable/n,family=families[Math.floor(rng()*families.length)],variant=family+(rng()<.5?0:6);
     buildings.push({id,hub:hub.id,ring,sector,zone:district,variant,x:hub.x+Math.sin(angle)*rr,y:0,z:hub.z+Math.cos(angle)*rr,yaw:angle,scale:.78+rng()*.2,width:.88+rng()*.14,tint:.87+rng()*.2,heightScale:family===0?.62+rng()*.8:.85+rng()*.35,landmark:false});
    }
   }
  }
  routes.push({type:'ring',hub:hub.id,x:hub.x,z:hub.z,radius,y:9,phase:hub.id*.17});
  for(let sector=0;sector<SECTORS;sector++){const a=sector*Math.PI/4;routes.push({type:'radial',hub:hub.id,ax:hub.x+Math.sin(a)*95,az:hub.z+Math.cos(a)*95,bx:hub.x+Math.sin(a)*radius,bz:hub.z+Math.cos(a)*radius,y:9,phase:sector*.11});parks.push({hub:hub.id,x:hub.x+Math.sin(a+Math.atan2(22,175))*175,z:hub.z+Math.cos(a+Math.atan2(22,175))*175,radius:8});}
 }
 const byCoordinate=new Map(hubs.map(h=>[`${h.q},${h.r}`,h]));
 for(const hub of hubs)for(const [dq,dr]of [[1,0],[0,1],[-1,1]]){
  const other=byCoordinate.get(`${hub.q+dq},${hub.r+dr}`);if(!other)continue;
  const dx=other.x-hub.x,dz=other.z-hub.z,length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
  const link={type:'link',from:hub.id,to:other.id,ax:hub.x+ux*radius,az:hub.z+uz*radius,bx:other.x-ux*radius,bz:other.z-uz*radius,y:9,phase:(hub.id+other.id)*.13};links.push(link);routes.push(link);
 }
 return{version:CITY_VERSION,options:config,radius,spacing,hubs,links,routes,parks,buildings,prototypes:Array.from({length:PROTOTYPES},(_,v)=>buildingBlueprint(v,seed)),bounds:{radius:Math.max(...hubs.map(h=>Math.hypot(h.x,h.z)))+radius}};
}
export function projectedPixels(height,distance,viewportHeight,fov=50){return height*viewportHeight/(2*Math.tan(fov*Math.PI/360)*Math.max(distance,1));}
export function selectBuildingLOD(pixels,previous=-1,ready=true,mode='auto'){
 if(mode==='high')return 0;
 if(mode==='impostor')return ready?3:2;
 const max=ready&&mode!=='mesh'?3:2,cuts=[260,90,22];
 if(previous>=0&&previous<=max&&pixels>=(previous<max?cuts[previous]*.82:0)&&pixels<=(previous>0?cuts[previous-1]*1.18:Infinity))return previous;
 return Math.min(max,pixels>=cuts[0]?0:pixels>=cuts[1]?1:pixels>=cuts[2]?2:3);
}
export function routePoint(route,t){
 const u=((t+route.phase)%1+1)%1;
 if(route.type==='ring'){const a=u*Math.PI*2;return{x:route.x+Math.sin(a)*route.radius,y:route.y+1.1,z:route.z+Math.cos(a)*route.radius,yaw:a+Math.PI/2};}
 const v=1-Math.abs(u*2-1),dx=route.bx-route.ax,dz=route.bz-route.az;
 return{x:route.ax+dx*v,y:route.y+1.1,z:route.az+dz*v,yaw:Math.atan2(dx,dz)+(u<.5?0:Math.PI)};
}
export function exportCity(layout){return{schema:'aether.city/1',units:'metres',up:'Y',generator:'circular-hubs-v1',...layout,buildings:layout.buildings.map(({lod,distance,cx,cy,cz,bound,...semantic})=>semantic),renderContract:{prototypes:PROTOTYPES,lods:3,impostor:'25-view hemi-octahedral albedo + normal/emission',surface:'8-zone guarded PBR atlas',seeded:true}};}
