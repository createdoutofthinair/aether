import * as T from 'three/webgpu';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {random} from './blueprint.js';
export function shipModel(plan,{explode=0,roughness=plan.appearance.roughness,finish=plan.appearance.finish,single=null}={}){
 const root=new T.Group(),steel=new T.MeshStandardMaterial({color:finish==='dark'?0x3b4651:0xaeb7bf,metalness:plan.appearance.metalness,roughness}),dark=new T.MeshStandardMaterial({color:0x202832,metalness:.8,roughness:.4}),copper=new T.MeshStandardMaterial({color:0x9b674a,metalness:.82,roughness:.32}),glass=new T.MeshPhysicalMaterial({color:0x15354b,metalness:.5,roughness:.13,clearcoat:1}),blue=new T.MeshStandardMaterial({color:0x206eae,metalness:.6,roughness:.3}),glow=new T.MeshStandardMaterial({color:new T.Color().setHSL(plan.appearance.hue,.7,.6),emissive:new T.Color().setHSL(plan.appearance.hue,.7,.6),emissiveIntensity:4}),amber=new T.MeshStandardMaterial({color:0xffad52,emissive:0xff6219,emissiveIntensity:2});
 function mesh(g,m,p,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o;}
 function cylinder(p,r,l,m,z=0,r2=r){const o=mesh(new T.CylinderGeometry(r,r2,l,48),m,p,0,0,z);o.rotation.x=Math.PI/2;return o;}
 function shell(p,r,l,m,shape){if(shape==='box')return box(p,r*2,r*2,l,m);if(shape==='octagonal'){const o=mesh(new T.CylinderGeometry(r*1.08,r*1.08,l,8),m,p);o.rotation.x=Math.PI/2;return o;}return cylinder(p,r,l,m);}
 function ring(p,r,z,m=dark,t=.04){return mesh(new T.TorusGeometry(r,t,8,48),m,p,0,0,z);}
 function box(p,w,h,d,m,x=0,y=0,z=0){return mesh(new T.BoxGeometry(w,h,d),m,p,x,y,z);}
 for(const part of plan.parts.filter(p=>!single||p.type===single)){
 const p=new T.Group();p.userData.part=part;p.position.set(part.x*(1+explode),part.y*(1+explode),part.z*(1+explode*.3));root.add(p);const l=part.length,r=part.radius,rng=random(part.detailSeed);
 if(part.type==='collar'){cylinder(p,r*1.1,l,steel);ring(p,r*.95,0,copper,.035);}
 else if(part.type==='engine'){
 // Continuous jacket reaches both socket planes. Nozzle and ribs attach to it.
 cylinder(p,r*.82,l,dark);cylinder(p,r*.97,.24,steel,-l/2+.12);
 if(part.engineStyle==='cluster'){cylinder(p,r,.16,steel,l/2-.08);for(const [x,y]of [[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]]){const nozzle=new T.Group();nozzle.position.set(x*r,y*r,l/2);p.add(nozzle);cylinder(nozzle,r*.25,.32,dark,-.16);ring(nozzle,r*.19,.006,glow,.035);}}
 else if(part.engineStyle==='slotted'){box(p,r*1.85,r*1.3,l*.3,steel,0,0,l*.35);for(const y of [-.35,0,.35])box(p,r*1.5,r*.12,.03,glow,0,y*r,l/2+.005);}
 else{cylinder(p,r*1.08,l*.34,steel,l*.33,r*.78);cylinder(p,r*.94,.026,dark,l/2-.025);ring(p,r*.75,l/2-.008,glow,.07);}
 const n=12+part.variant*2;for(let i=0;i<n;i++){const a=i*Math.PI*2/n;box(p,.055,.07,l*.65,copper,Math.cos(a)*r*.83,Math.sin(a)*r*.83,-l*.1);}
 }else if(part.type==='cockpit'){
 if(part.shape!=='round'){shell(p,r,l*.43,steel,part.shape).position.z=l*.285;const nose=new T.BoxGeometry(r*2,r*2,l*.57),pos=nose.attributes.position;for(let i=0;i<pos.count;i++)if(pos.getZ(i)<0){pos.setX(i,pos.getX(i)*.22);pos.setY(i,pos.getY(i)*.22);}nose.computeVertexNormals();mesh(nose,steel,p,0,0,-l*.215);box(p,r*1.3,.03,l*.27,glass,0,r+.01,l*.27);}
 else{cylinder(p,r,l*.43,steel,l*.285);const dome=mesh(new T.SphereGeometry(r*.98,48,24),glass,p,0,0,-l*.15);dome.scale.z=l*.35/(r*.98);
 for(const angle of [-.55,0,.55]){const rib=ring(p,r*.985,-l*.15,steel,.025);rib.rotation.y=Math.PI/2;rib.rotation.x=angle;rib.scale.set(l*.35/r,1,1);}ring(p,r*.99,l*.07,steel,.04);}
 }else if(['habitat','cargo','reactor'].includes(part.type)){
 shell(p,r,l,steel,part.shape);ring(p,r+.01,-l/2+.12,dark,.065);ring(p,r+.01,l/2-.12,dark,.065);
 for(let j=0;j<3;j++)ring(p,r+.006,-l/2+(j+1)*l/4,dark,.012);
 for(let j=0;j<8;j++){const panel=new T.Group();panel.rotation.z=j*Math.PI/4;p.add(panel);box(panel,.43,.055,l*.62,part.type==='reactor'?dark:steel,0,r,0);
 if(part.type==='habitat')for(let k=0;k<3;k++)box(panel,.25,.025,l*.12,glass,0,r+.04,(k-1)*l*.24);
 else for(let k=0;k<5;k++)box(panel,.32,.025,.035,dark,0,r+.04,(k-2)*.13);
 box(panel,.09,.025,.09,rng()>.5?amber:glow,.26,r+.035,l*.32);for(const z of [-l*.4,l*.4])box(panel,.045,.035,.045,dark,.28,r+.01,z);}
 }else if(part.type==='tank'){
 cylinder(p,r*.58,l,dark);const tank=mesh(new T.SphereGeometry(r*1.35,32,20),steel,p);tank.scale.z=Math.min(l*.43/(r*1.35),1);ring(p,r*1.36,0,dark,.06);cylinder(p,r,.18,steel,-l/2+.09);cylinder(p,r,.18,steel,l/2-.09);
 }else if(part.type==='truss'){
 cylinder(p,r*.25,l,dark);for(const x of [-.68,.68])for(const y of [-.68,.68]){const beam=cylinder(p,r*.1,l,steel);beam.position.x=x*r;beam.position.y=y*r;}
 for(const z of [-l*.43,0,l*.43]){box(p,r*2,.18,.2,steel,0,0,z);box(p,.18,r*2,.2,steel,0,0,z);for(const side of [-1,1]){box(p,r*1.5,.16,.2,steel,0,side*r*.68,z);box(p,.16,r*1.5,.2,steel,side*r*.68,0,z);}}
 }else if(part.type==='hangar'){
 shell(p,r,l,steel,'box');for(const side of [-1,1]){box(p,.06,r*1.5,l*.78,dark,side*(r+.02));for(let j=0;j<5;j++)box(p,.08,r*1.4,.04,steel,side*(r+.07),0,(j-2)*l*.14);}box(p,r*1.7,.06,l*.8,dark,0,r+.02);
 }else if(part.type==='ring-drive'){
 cylinder(p,r*.55,l,dark);ring(p,r*2.3,0,steel,r*.2);ring(p,r*2.3,.12,glow,.035);for(let j=0;j<6;j++){const spoke=new T.Group();spoke.rotation.z=j*Math.PI/3;p.add(spoke);box(spoke,.16,r*2.4,.35,steel,0,r*1.2);}cylinder(p,r,.18,steel,-l/2+.09);cylinder(p,r,.18,steel,l/2-.09);
 }else if(part.type==='delta'){
 const shape=new T.Shape();shape.moveTo(0,-.8);shape.lineTo(l,-.2);shape.lineTo(l*.65,1.6);shape.lineTo(0,.8);shape.closePath();const wing=mesh(mergeVertices(new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false})),steel,p,0,.06);wing.rotation.x=Math.PI/2;wing.scale.x=part.side;box(p,.3,.18,1.6,dark);box(p,.1,.08,.2,amber,part.side*l*.9,.08,.1);
 }else if(part.type==='solar'||part.type==='wing'){
 const s=part.side,w=l;box(p,w,.09,1.7,steel,s*(w/2-.04));
 if(part.type==='solar')for(let x=0;x<7;x++)for(let z=0;z<4;z++)box(p,w/7*.88,.015,.35,blue,s*((x+.5)*w/7-.04),.055,(z-1.5)*.39);
 else{const fin=box(p,.07,.85,1.25,steel,s*w*.8,.45,.2);fin.rotation.x=-.3;}
 box(p,.1,.07,.15,amber,s*(w-.08),.08);
 }else if(part.type==='mount'){box(p,l,.32,.6,steel);box(p,l,.12,.7,dark,0,-.08);
 }else{mesh(new T.CylinderGeometry(.1,.16,l,16),steel,p,0,l/2);const dish=mesh(new T.SphereGeometry(.55,32,12,0,Math.PI*2,0,.9),steel,p,0,l);dish.rotation.x=-Math.PI/2;}
 }
 if(single){let x=0;for(const p of root.children){p.position.set(0,0,0);p.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(p),width=bounds.max.x-bounds.min.x;p.position.x=x-bounds.min.x;x+=width+.6;}}
 root.rotation.set(-.12,-.75,0);return root;
}
