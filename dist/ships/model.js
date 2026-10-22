import * as T from 'three/webgpu';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {random} from './blueprint.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {metricUV} from '../hull/material.js';
import {shipSurfaceAtlas,mapShipSurface} from './surfaces.js';
export function shipModel(plan,{explode=0,roughness=plan.appearance.roughness,finish=plan.appearance.finish,single=null,hull=null,detailSize=128,wear=plan.service?.age??.35}={}){
 const root=new T.Group(),atlas=shipSurfaceAtlas(plan,{size:detailSize,roughness,finish,wear}),{alloy:copper,engine:dark,ceramic,insulation,repair,accent,marking}=atlas.zones,steel=hull||atlas.zones.armor,glass=new T.MeshPhysicalMaterial({color:0x29414e,metalness:0,roughness:.18,clearcoat:.8}),blue=atlas.zones.accent,glow=new T.MeshStandardMaterial({color:new T.Color().setHSL(plan.appearance.hue,.6,.55),emissive:new T.Color().setHSL(plan.appearance.hue,.6,.55),emissiveIntensity:2.4}),amber=new T.MeshStandardMaterial({color:0xb98242,emissive:0xff7c32,emissiveIntensity:.8});
 root.userData.service=plan.service;root.userData.surfaceZones=Object.keys(atlas.zones);
 let moduleTint=1;
 function mesh(g,m,p,x=0,y=0,z=0){if(m.zone)mapShipSurface(g,m,{tint:moduleTint});else metricUV(g,m.userData.recipe?.tileMeters??2);const o=new T.Mesh(g,m.material||m);o.userData.surfaceZone=m.zone||'custom';o.position.set(x,y,z);p.add(o);return o;}
 function cylinder(p,r,l,m,z=0,r2=r,open=false){
  const b=Math.min(.025,l*.08,Math.min(r,r2)*.08),profile=[];
  if(!open)profile.push(new T.Vector2(0,-l/2));
  profile.push(new T.Vector2(r2-b,-l/2),new T.Vector2(r2,-l/2+b),new T.Vector2(r,l/2-b),new T.Vector2(r-b,l/2));
  if(!open)profile.push(new T.Vector2(0,l/2));
  const g=new T.LatheGeometry(profile,detailSize>128?40:28);Object.assign(g.parameters,{radiusTop:r,radiusBottom:r2,height:l,openEnded:open});
  // Keep the original structural socket planes and an axial metre direction.
  for(let i=0;i<g.attributes.uv.count;i++)g.attributes.uv.setY(i,(g.attributes.position.getY(i)+l/2)/l);
  const o=mesh(g,m,p,0,0,z);o.rotation.x=Math.PI/2;return o;
 }
 function shell(p,r,l,m,shape){if(shape==='box')return box(p,r*2,r*2,l,m);if(shape==='octagonal'){const o=mesh(new T.CylinderGeometry(r*1.08,r*1.08,l,8),m,p);o.rotation.x=Math.PI/2;return o;}return cylinder(p,r,l,m);}
 function ring(p,r,z,m=dark,t=.04){return mesh(new T.TorusGeometry(r,t,8,48),m,p,0,0,z);}
 function box(p,w,h,d,m,x=0,y=0,z=0){const bevel=Math.max(w,h,d)>.25&&Math.min(w,h,d)>.045;const g=bevel?mergeVertices(new RoundedBoxGeometry(w,h,d,1,Math.min(.025,Math.min(w,h,d)*.12))):new T.BoxGeometry(w,h,d);if(bevel)g.userData.beveled=true;return mesh(g,m,p,x,y,z);}
 function tube(p,a,b,r=.018,m=copper){const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start),o=mesh(new T.CylinderGeometry(r,r,d.length(),8),m,p);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
 function serviceDetail(p,part){
  const {radius:r,length:l}=part,side=plan.service?.accessSide??1;
  if(['cockpit','habitat','hangar','cargo'].includes(part.type)){
   const hatchZ=part.type==='cockpit'?l*.26:0;
   // A crew access hatch on one side, with real raised handholds.
   box(p,.07,1.12,.76,dark,side*(r+.025),-.05,hatchZ);
   const door=box(p,.045,.98,.63,part.id===plan.service?.repairPart?repair:ceramic,side*(r+.083),-.05,hatchZ);door.userData.feature='airlock';
   for(const z of [hatchZ-.42,hatchZ+.42]){tube(p,[side*(r+.18),-.43,z],[side*(r+.18),.43,z]);for(const y of [-.43,.43])tube(p,[side*(r+.08),y,z],[side*(r+.18),y,z],.014);}
   for(const y of [-.45,-.67,-.89])tube(p,[side*(r+.16),y,hatchZ-.22],[side*(r+.16),y,hatchZ+.22],.013);for(const z of [hatchZ-.22,hatchZ+.22]){tube(p,[side*(r+.16),-.89,z],[side*(r+.16),-.45,z],.013);for(const y of [-.89,-.45])tube(p,[side*(r+.03),y,z],[side*(r+.16),y,z],.013);}
   const plate=mesh(new T.PlaneGeometry(.57,.26),marking,p,side*(r+.11),.14,hatchZ);plate.rotation.y=side*Math.PI/2;plate.userData.feature='registry';
  }
  if(['habitat','cargo','reactor','hangar'].includes(part.type)){
   // Quiet hull areas remain between these localized equipment packages.
   const label=mesh(new T.PlaneGeometry(.16,.35),marking,p,-.13,r+.034,-l*.12);label.rotation.x=-Math.PI/2;label.userData.feature='service-stencil';
   const identity=mesh(new T.PlaneGeometry(l*.6,.16),{...marking,rect:atlas.size===64?[0,.44,1,.22]:[0,.54,.52,.11]},p,.1,r+.035,l*.06);identity.rotation.x=-Math.PI/2;identity.rotateZ(Math.PI/2);identity.userData.feature='hull-identity';
   const packageSide=-side,offset=l*.22;
   box(p,.17,.33,.46,part.type==='reactor'?ceramic:repair,packageSide*(r+.065),.18,offset).userData.feature='service-package';
   tube(p,[packageSide*(r+.17),.06,offset-.35],[packageSide*(r+.17),.06,offset+.35],.014);
   if(plan.role==='explorer'){const sensor=mesh(new T.SphereGeometry(.16,12,8),dark,p,packageSide*(r+.19),.18,offset);sensor.scale.z=1.5;}
   if(plan.role==='freighter')for(const z of [-l*.36,l*.36]){if(part.shape==='box'){for(const s of [-1,1]){box(p,r*2+.05,.045,.045,copper,0,s*(r+.015),z);box(p,.045,r*2+.05,.045,copper,s*(r+.015),0,z);}}else ring(p,r*(part.shape==='octagonal'?1.085:1)+.025,z,copper,.022);}
   if(plan.role==='scout')box(p,.1,.13,.8,insulation,packageSide*(r+.11),.4,-l*.17);
  }
 }
 for(const part of plan.parts.filter(p=>!single||p.type===single)){
 const p=new T.Group();p.userData.part=part;p.position.set(part.x*(1+explode),part.y*(1+explode),part.z*(1+explode*.3));root.add(p);const l=part.length,r=part.radius,rng=random(part.detailSeed);moduleTint=.94+(part.detailSeed%1009)/1009*.08;
 if(part.type==='collar'){cylinder(p,r*1.1,l,steel);ring(p,r*1.095,l*.2,copper,.022);ring(p,r*1.097,-l*.2,dark,.015);}
 else if(part.type==='engine'){
 // Continuous jacket reaches both socket planes. Nozzle and ribs attach to it.
 cylinder(p,r*.82,l,dark,0,r*.82,true);cylinder(p,r*.97,.24,steel,-l/2+.12);
 if(part.engineStyle==='cluster'){
 const plate=new T.Shape();plate.absarc(0,0,r,0,Math.PI*2,false);
 for(const [x,y]of [[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]]){const hole=new T.Path();hole.absarc(x*r,y*r,r*.28,0,Math.PI*2,true);plate.holes.push(hole);}
 const face=mesh(mergeVertices(new T.ExtrudeGeometry(plate,{depth:.16,bevelEnabled:false,curveSegments:24})),steel,p,0,0,l/2-.16);face.userData.engineFace='perforated-cluster';
 for(const [x,y]of [[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]]){const nozzle=new T.Group();nozzle.position.set(x*r,y*r,l/2);p.add(nozzle);cylinder(nozzle,r*.25,.32,dark,-.16,r*.25,true);ring(nozzle,r*.26,.015,steel,r*.04);ring(nozzle,r*.19,-.045,glow,.025);const recess=mesh(new T.CircleGeometry(r*.25,32),dark,nozzle,0,0,-.30);recess.userData.engineFace='recess';}}

 else if(part.engineStyle==='slotted'){box(p,r*1.85,r*1.3,l*.3,steel,0,0,l*.35);for(const y of [-.35,0,.35])box(p,r*1.5,r*.12,.03,glow,0,y*r,l/2+.005);}
 else{cylinder(p,r*.78,l*.34,steel,l*.33,r*1.08,true);const recess=mesh(new T.CircleGeometry(r,48),dark,p,0,0,l/2-.18);recess.userData.engineFace='recess';ring(p,r*1.08,l/2,steel,.045);ring(p,r*.97,l/2-.06,glow,.045);}
 ring(p,r*.84,l*.18,ceramic,.055);const n=10+part.variant*2;for(let i=0;i<n;i++){const a=i*Math.PI*2/n;box(p,.055,.07,l*.65,copper,Math.cos(a)*r*.83,Math.sin(a)*r*.83,-l*.1);}
 }else if(part.type==='cockpit'){
 if(part.shape!=='round'){shell(p,r,l*.43,steel,part.shape).position.z=l*.285;const nose=mergeVertices(new RoundedBoxGeometry(r*2,r*2,l*.57,1,.025)),pos=nose.attributes.position;for(let i=0;i<pos.count;i++){const taper=.24+.76*(pos.getZ(i)/(l*.57)+.5);pos.setX(i,pos.getX(i)*taper);pos.setY(i,pos.getY(i)*taper);}nose.computeVertexNormals();mesh(nose,steel,p,0,0,-l*.215);box(p,r*1.3,.03,l*.27,glass,0,r+.01,l*.27);}
 else{cylinder(p,r,l*.43,steel,l*.285);const dome=mesh(new T.SphereGeometry(r*.98,48,24),glass,p,0,0,-l*.15);dome.scale.z=l*.35/(r*.98);
 for(const angle of [-.55,0,.55]){const rib=ring(p,r*.985,-l*.15,steel,.025);rib.rotation.y=Math.PI/2;rib.rotation.x=angle;rib.scale.set(l*.35/r,1,1);}ring(p,r*.99,l*.07,steel,.04);}
 }else if(['habitat','cargo','reactor'].includes(part.type)){
 shell(p,r,l,steel,part.shape);ring(p,r+.01,-l/2+.12,dark,.065);ring(p,r+.01,l/2-.12,dark,.065);
 for(let j=0;j<3;j++)ring(p,r+.006,-l/2+(j+1)*l/4,dark,.012);
 const faces=part.shape==='box'?4:8;for(let j=0;j<faces;j++){if(j%2&&rng()>.22)continue;const panel=new T.Group();panel.rotation.z=j*Math.PI*2/faces;p.add(panel);box(panel,.43,.065,l*.62,part.type==='reactor'?ceramic:part.id===plan.service?.repairPart&&j===0?repair:j===2?insulation:steel,0,r,0);
 if(part.type==='habitat')for(let k=0;k<3;k++)box(panel,.25,.025,l*.12,glass,0,r+.04,(k-1)*l*.24);
 else for(let k=0;k<4;k++)box(panel,.32,.028,.035,dark,0,r+.043,(k-1.5)*.13);
 box(panel,.09,.025,.09,amber,.26,r+.035,l*.32);for(const z of [-l*.4,l*.4])box(panel,.045,.035,.045,dark,.28,r+.01,z);}
 }else if(part.type==='tank'){
 cylinder(p,r*.58,l,dark);const blanket=new T.SphereGeometry(r*1.35,32,20),bp=blanket.attributes.position;for(let i=0;i<bp.count;i++){const x=bp.getX(i),y=bp.getY(i),z=bp.getZ(i),angle=Math.atan2(z,x),fold=1+.009*Math.sin(angle*19)*Math.sin(y/r*13);bp.setXYZ(i,x*fold,y,z*fold);}blanket.computeVertexNormals();const tank=mesh(blanket,insulation,p);tank.scale.z=Math.min(l*.43/(r*1.35),1);ring(p,r*1.36,0,dark,.06);cylinder(p,r,.18,steel,-l/2+.09);cylinder(p,r,.18,steel,l/2-.09);
 }else if(part.type==='truss'){
 cylinder(p,r*.25,l,dark);for(const x of [-.68,.68])for(const y of [-.68,.68]){const beam=cylinder(p,r*.1,l,steel);beam.position.x=x*r;beam.position.y=y*r;}
 for(const z of [-l*.43,0,l*.43]){box(p,r*2,.18,.2,steel,0,0,z);box(p,.18,r*2,.2,steel,0,0,z);for(const side of [-1,1]){box(p,r*1.5,.16,.2,steel,0,side*r*.68,z);box(p,.16,r*1.5,.2,steel,side*r*.68,0,z);}}
 }else if(part.type==='hangar'){
 shell(p,r,l,steel,'box');for(const side of [-1,1]){box(p,.06,r*1.5,l*.78,dark,side*(r+.02));for(let j=0;j<5;j++)box(p,.08,r*1.4,.04,steel,side*(r+.07),0,(j-2)*l*.14);}box(p,r*1.7,.06,l*.8,dark,0,r+.02);
 }else if(part.type==='ring-drive'){
 cylinder(p,r*.55,l,dark);ring(p,r*2.3,0,steel,r*.2);ring(p,r*2.3,.12,glow,.035);for(let j=0;j<6;j++){const spoke=new T.Group();spoke.rotation.z=j*Math.PI/3;p.add(spoke);box(spoke,.16,r*2.4,.35,steel,0,r*1.2);}cylinder(p,r,.18,steel,-l/2+.09);cylinder(p,r,.18,steel,l/2-.09);
 }else if(part.type==='delta'){
 const shape=new T.Shape();shape.moveTo(0,-.8);shape.lineTo(l,-.2);shape.lineTo(l*.65,1.6);shape.lineTo(0,.8);shape.closePath();const wing=mesh(mergeVertices(new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSize:.014,bevelThickness:.014,bevelSegments:1})),steel,p,0,.06);wing.rotation.x=Math.PI/2;wing.scale.x=part.side;box(p,.3,.18,1.6,dark);box(p,.1,.08,.2,amber,part.side*l*.9,.08,.1);
 }else if(part.type==='solar'||part.type==='wing'){
 const s=part.side,w=l;box(p,w,.09,1.7,steel,s*(w/2-.04));box(p,.16,.014,1.5,accent,s*w*.72,.054,0);
 if(part.type==='solar')for(let x=0;x<7;x++)for(let z=0;z<4;z++)box(p,w/7*.88,.015,.35,blue,s*((x+.5)*w/7-.04),.055,(z-1.5)*.39);
 else{const fin=box(p,.07,.85,1.25,steel,s*w*.8,.45,.2);fin.rotation.x=-.3;}
 box(p,.1,.07,.15,amber,s*(w-.08),.08);
 }else if(part.type==='mount'){box(p,l,.32,.6,steel);box(p,l,.12,.7,dark,0,-.08);
 }else{mesh(new T.CylinderGeometry(.1,.16,l,16),steel,p,0,l/2);const dish=mesh(new T.SphereGeometry(.55,32,12,0,Math.PI*2,0,.9),steel,p,0,l);dish.rotation.x=-Math.PI/2;}
  serviceDetail(p,part);
 }
 if(single){let x=0;for(const p of root.children){p.position.set(0,0,0);p.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(p),width=bounds.max.x-bounds.min.x;p.position.x=x-bounds.min.x;x+=width+.6;}}
 root.rotation.set(-.12,-.75,0);return root;
}
