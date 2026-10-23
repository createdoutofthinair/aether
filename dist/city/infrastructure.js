import * as T from 'three/webgpu';
import {routePoint} from './blueprint.js';
import {PLANET_STYLES} from './architecture.js';
export function infrastructure(layout){
 const Standard=T.MeshStandardNodeMaterial||T.MeshStandardMaterial,root=new T.Group(),transit=new T.Group(),gardens=new T.Group(),ground=new T.Group();root.add(ground,gardens,transit);
 const materials={stone:new Standard({color:0x9b9c8e,roughness:.88}),road:new Standard({color:0x414b4c,roughness:.9}),green:new Standard({color:0x63765b,roughness:.97}),rail:new Standard({color:0x71888a,roughness:.38,metalness:.45}),light:new Standard({color:0x99b8ad,emissive:0xa5bfa8,emissiveIntensity:.5,roughness:.4}),water:new Standard({color:0x597e80,roughness:.25,metalness:.25}),paint:new Standard({color:0xbcb9a1,roughness:.9})};
 const style=layout.options.architecture?.style??'garden',palette=PLANET_STYLES[style].palette;materials.stone.color.set(palette[3]);materials.rail.color.set(palette[1]);
 if(['arid','glacial','lunar'].includes(style)){materials.green.color.set(palette[3]);materials.water.color.set(palette[4]);materials.water.roughness=.7;materials.water.metalness=.05;}
 const dummy=new T.Object3D();
 function instances(geometry,material,placements,parent,cast=false){if(!placements.length){geometry.dispose();return null;}const mesh=new T.InstancedMesh(geometry,material,placements.length);placements.forEach((p,i)=>{dummy.position.set(p.x,p.y??0,p.z);dummy.rotation.set(p.rx??0,p.ry??0,0);dummy.scale.set(p.sx??1,p.sy??1,p.sz??1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.castShadow=cast;if(cast)mesh.layers.enable(1);parent.add(mesh);return mesh;}
 const hubs=layout.hubs;
 if(layout.options.layout==='circular'){
  instances(new T.CircleGeometry(layout.radius+35,128),materials.green,hubs.map(h=>({...h,y:-.1,rx:-Math.PI/2})),ground);
  for(let ring=0;ring<=layout.options.rings;ring++){
   const radius=ring===layout.options.rings?layout.radius:111+ring*128;
   instances(new T.RingGeometry(radius-16,radius+16,160),materials.stone,hubs.map(h=>({...h,y:.025,rx:-Math.PI/2})),ground);
   instances(new T.RingGeometry(radius-12,radius+12,160),materials.road,hubs.map(h=>({...h,y:.04,rx:-Math.PI/2})),ground);
   instances(new T.RingGeometry(radius+17,radius+26,160),materials.green,hubs.map(h=>({...h,y:.045,rx:-Math.PI/2})),gardens);
   instances(new T.TorusGeometry(radius,.72,4,160),materials.rail,hubs.map(h=>({...h,y:9,rx:Math.PI/2})),transit,true);
   instances(new T.TorusGeometry(radius,.12,3,160),materials.light,hubs.map(h=>({...h,y:9.8,rx:Math.PI/2})),transit);
  }
 }
 const lines=layout.routes.filter(r=>r.type!=='ring'),rails=[],roads=[],paving=[],markings=[],supports=[];
 for(const line of lines){const dx=line.bx-line.ax,dz=line.bz-line.az,length=Math.hypot(dx,dz),p={x:(line.ax+line.bx)/2,z:(line.az+line.bz)/2,ry:Math.atan2(dx,dz),sz:length},width=line.width??16;roads.push({...p,y:.07,sx:width,sy:.1});paving.push({...p,y:.015,sx:width+2*(line.sidewalk??4),sy:.16});markings.push({...p,y:.126,sx:.16,sy:.008,sz:Math.max(1,length-8)});
  if(line.transit!==false){rails.push({...p,y:8.9,sx:2.2,sy:1.2});for(let i=0;i<Math.ceil(length/72);i++){const t=(i+.5)/Math.ceil(length/72);supports.push({x:line.ax+dx*t,z:line.az+dz*t,y:4.3,sy:8.6});}}
 }
 instances(new T.BoxGeometry(1,1,1),materials.stone,paving,ground);instances(new T.BoxGeometry(1,1,1),materials.road,roads,ground);instances(new T.BoxGeometry(1,1,1),materials.paint,markings,ground);
 instances(new T.BoxGeometry(1,1,1),materials.rail,rails,transit,true);instances(new T.BoxGeometry(1,1,1),materials.light,rails.map(p=>({...p,y:9.6,sx:.23,sy:.17})),transit);
 if(layout.options.layout==='circular')for(const hub of hubs)for(let i=0;i<16;i++){const a=i*Math.PI/8;supports.push({x:hub.x+Math.sin(a)*layout.radius,y:4.3,z:hub.z+Math.cos(a)*layout.radius,sy:8.6});}
 instances(new T.BoxGeometry(1.5,1,1.5),materials.stone,supports,transit,true);
 const nodes=hubs.flatMap(h=>h.streetNodes||[]);instances(new T.CircleGeometry(12,16),materials.road,nodes.map(p=>({...p,y:.135,rx:-Math.PI/2})),ground);
 const lampNodes=nodes.filter((_,i)=>i%3===0),posts=lampNodes.map(p=>({x:p.x+10,z:p.z+10,y:3.1,sy:6.2}));instances(new T.CylinderGeometry(.13,.2,1,6),materials.rail,posts,ground,true);instances(new T.BoxGeometry(1.8,.18,.7),materials.light,posts.map(p=>({...p,y:6.3,sy:1})),ground);
 const squareParks=layout.parks.filter(p=>p.square),roundParks=layout.parks.filter(p=>!p.square);
 instances(new T.PlaneGeometry(1,1),materials.green,squareParks.map(p=>({...p,y:.16,rx:-Math.PI/2,ry:0,sx:p.radius*2,sy:p.radius*2})),gardens);
 instances(new T.CircleGeometry(1,32),materials.water,roundParks.map(p=>({...p,y:.06,rx:-Math.PI/2,sx:p.radius,sy:p.radius})),gardens);
 const planters=[];for(const p of layout.parks)for(let i=0;i<4;i++){const a=i*Math.PI/2;planters.push({x:p.x+Math.sin(a)*Math.min(p.radius*.7,10),y:1,z:p.z+Math.cos(a)*Math.min(p.radius*.7,10),sx:1.5,sy:2,sz:1.5});}
 instances(new T.CylinderGeometry(1,1,1,8),materials.green,planters,gardens,true);
 const podMaterial=new Standard({color:0xc2c6b7,roughness:.35,metalness:.3,emissive:0x306475,emissiveIntensity:.2}),podRoutes=layout.routes.filter(r=>r.transit!==false),podCount=Math.min(512,podRoutes.length*2),pods=new T.InstancedMesh(new T.CapsuleGeometry(.7,3,3,8),podMaterial,podCount);pods.instanceMatrix.setUsage(T.DynamicDrawUsage);pods.frustumCulled=false;transit.add(pods);
 function animate(seconds){for(let i=0;i<podCount;i++){const route=podRoutes[Math.floor(i*podRoutes.length/podCount)],length=route.type==='ring'?Math.PI*2*route.radius:2*Math.hypot(route.bx-route.ax,route.bz-route.az),p=routePoint(route,seconds*27/length+i*.618);dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(Math.PI/2,p.yaw,0,'YXZ');dummy.scale.set(1,1,1);dummy.updateMatrix();pods.setMatrixAt(i,dummy.matrix);}pods.instanceMatrix.needsUpdate=true;}
 function dispose(){const geometries=new Set(),mats=new Set();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);if(o.material)mats.add(o.material);});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());Object.values(materials).forEach(m=>m.dispose());podMaterial.dispose();}
 return{root,transit,gardens,animate,dispose,podCount};
}
