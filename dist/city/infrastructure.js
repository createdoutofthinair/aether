import * as T from 'three/webgpu';
import {routePoint} from './blueprint.js';
export function infrastructure(layout){
 const root=new T.Group(),transit=new T.Group(),gardens=new T.Group(),ground=new T.Group();root.add(ground,gardens,transit);
 const materials={stone:new T.MeshStandardNodeMaterial({color:0x7e8984,roughness:.8}),road:new T.MeshStandardNodeMaterial({color:0x293c43,roughness:.72}),green:new T.MeshStandardNodeMaterial({color:0x4f6c54,roughness:.97}),rail:new T.MeshStandardNodeMaterial({color:0x71888a,roughness:.36,metalness:.7}),light:new T.MeshStandardNodeMaterial({color:0x569ba7,emissive:0x4d9faa,emissiveIntensity:.55,roughness:.4}),water:new T.MeshStandardNodeMaterial({color:0x42717a,roughness:.18,metalness:.45})};
 const dummy=new T.Object3D();
 function instances(geometry,material,placements,parent){const mesh=new T.InstancedMesh(geometry,material,placements.length);placements.forEach((p,i)=>{dummy.position.set(p.x,p.y??0,p.z);dummy.rotation.set(p.rx??0,p.ry??0,0);dummy.scale.set(p.sx??1,p.sy??1,p.sz??1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();parent.add(mesh);return mesh;}
 const hubs=layout.hubs;
 // Shared circular geometry, repeated once per hub. No per-building street
 // objects or lights. The outer orbital line connects the inter-hub links.
 instances(new T.CircleGeometry(layout.radius+35,128),materials.green,hubs.map(h=>({...h,y:-.1,rx:-Math.PI/2})),ground);
 for(let ring=0;ring<=layout.options.rings;ring++){
  const radius=ring===layout.options.rings?layout.radius:111+ring*128;
  instances(new T.RingGeometry(radius-12,radius+12,160),materials.road,hubs.map(h=>({...h,y:.025,rx:-Math.PI/2})),ground);
  instances(new T.RingGeometry(radius+15,radius+26,160),materials.green,hubs.map(h=>({...h,y:.04,rx:-Math.PI/2})),gardens);
  instances(new T.TorusGeometry(radius,.72,4,160),materials.rail,hubs.map(h=>({...h,y:9,rx:Math.PI/2})),transit);
  instances(new T.TorusGeometry(radius,.12,3,160),materials.light,hubs.map(h=>({...h,y:9.8,rx:Math.PI/2})),transit);
 }
 const lines=layout.routes.filter(r=>r.type!=='ring'),rails=[],roads=[];
 for(const line of lines){const dx=line.bx-line.ax,dz=line.bz-line.az,length=Math.hypot(dx,dz),p={x:(line.ax+line.bx)/2,z:(line.az+line.bz)/2,ry:Math.atan2(dx,dz),sz:length};rails.push({...p,y:8.9,sx:2.2,sy:1.2});roads.push({...p,y:.05,sx:16,sy:.12});}
 instances(new T.BoxGeometry(1,1,1),materials.road,roads,ground);
 instances(new T.BoxGeometry(1,1,1),materials.rail,rails,transit);
 instances(new T.BoxGeometry(1,1,1),materials.light,rails.map(p=>({...p,y:9.6,sx:.23,sy:.17})),transit);
 const supports=[];
 for(const hub of hubs)for(let i=0;i<16;i++){const a=i*Math.PI/8;supports.push({x:hub.x+Math.sin(a)*layout.radius,y:4.3,z:hub.z+Math.cos(a)*layout.radius,sy:8.6});}
 for(const line of lines){if(line.type!=='link')continue;const length=Math.hypot(line.bx-line.ax,line.bz-line.az);for(let i=1;i<Math.ceil(length/70);i++){const p=routePoint({...line,phase:0},i/Math.ceil(length/70)/2);supports.push({...p,y:4.3,sy:8.6});}}
 instances(new T.BoxGeometry(1.5,1,1.5),materials.stone,supports,transit);
 instances(new T.CircleGeometry(1,32),materials.water,layout.parks.map(p=>({...p,y:.06,rx:-Math.PI/2,sx:p.radius,sy:p.radius})),gardens);
 // Human-scale planted pavilions in the inner green belt.
 const planters=[];for(const p of layout.parks)for(let i=0;i<4;i++){const a=i*Math.PI/2;planters.push({x:p.x+Math.sin(a)*10,y:1,z:p.z+Math.cos(a)*10,sx:1.5,sy:2,sz:1.5});}
 instances(new T.CylinderGeometry(1,1,1,8),materials.green,planters,gardens);
 const podMaterial=new T.MeshStandardNodeMaterial({color:0xc2c6b7,roughness:.35,metalness:.3,emissive:0x306475,emissiveIntensity:.2}),podCount=Math.min(512,layout.routes.length*2),pods=new T.InstancedMesh(new T.CapsuleGeometry(.7,3,3,8),podMaterial,podCount);
 pods.instanceMatrix.setUsage(T.DynamicDrawUsage);pods.frustumCulled=false;transit.add(pods);
 function animate(seconds){for(let i=0;i<podCount;i++){const route=layout.routes[Math.floor(i*layout.routes.length/podCount)],length=route.type==='ring'?Math.PI*2*route.radius:2*Math.hypot(route.bx-route.ax,route.bz-route.az),p=routePoint(route,seconds*27/length+i*.618);dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(Math.PI/2,p.yaw,0,'YXZ');dummy.scale.set(1,1,1);dummy.updateMatrix();pods.setMatrixAt(i,dummy.matrix);}pods.instanceMatrix.needsUpdate=true;}
 function dispose(){const geometries=new Set(),mats=new Set();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);if(o.material)mats.add(o.material);});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}
 return{root,transit,gardens,animate,dispose,podCount};
}
