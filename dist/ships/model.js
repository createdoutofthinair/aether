import * as T from 'three/webgpu';
import {random} from './blueprint.js';
export function shipModel(plan,{explode=0,roughness=.32,finish='silver',single=null}={}){
 const root=new T.Group(),steel=new T.MeshStandardMaterial({color:finish==='dark'?0x3b4651:0xaeb7bf,metalness:.86,roughness}),dark=new T.MeshStandardMaterial({color:0x202832,metalness:.8,roughness:.4}),copper=new T.MeshStandardMaterial({color:0x9b674a,metalness:.82,roughness:.32}),glass=new T.MeshPhysicalMaterial({color:0x15354b,metalness:.5,roughness:.13,clearcoat:1}),blue=new T.MeshStandardMaterial({color:0x206eae,metalness:.6,roughness:.3}),glow=new T.MeshStandardMaterial({color:0x5ecfff,emissive:0x29adff,emissiveIntensity:4}),amber=new T.MeshStandardMaterial({color:0xffad52,emissive:0xff6219,emissiveIntensity:2});
 function mesh(g,m,p,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o;}
 function cylinder(p,r,l,m,z=0,r2=r){const o=mesh(new T.CylinderGeometry(r,r2,l,48),m,p,0,0,z);o.rotation.x=Math.PI/2;return o;}
 function ring(p,r,z,m=dark,t=.04){const o=mesh(new T.TorusGeometry(r,t,8,48),m,p,0,0,z);return o;}
 function box(p,w,h,d,m,x=0,y=0,z=0){return mesh(new T.BoxGeometry(w,h,d),m,p,x,y,z);}
 for(const part of plan.parts.filter(p=>!single||p.type===single)){
 const p=new T.Group();p.userData.part=part;p.position.set(part.x*(1+explode),part.y*(1+explode),part.z*(1+explode*.3));root.add(p);const l=part.length,r=.92,rng=random(plan.seed+':'+part.id);
 if(['habitat','cargo','reactor','cockpit','engine','collar'].includes(part.type)){
 if(part.type==='collar'){cylinder(p,1.02,.18,steel);ring(p,.87,0,copper,.035);continue;}
 if(part.type==='engine'){cylinder(p,.78,l*.7,dark,0);cylinder(p,1.05,.85,steel,.9,.65);cylinder(p,.91,.025,dark,1.34);ring(p,.74,1.36,glow,.09);for(let i=0;i<12;i++){const a=i*Math.PI/6;box(p,.07,.09,1.6,copper,Math.cos(a)*.76,Math.sin(a)*.76,-.1);}continue;}
 if(part.type==='cockpit'){const dome=mesh(new T.SphereGeometry(.94,48,24),glass,p,0,0,-.55);dome.scale.set(1,1,1.5);cylinder(p,.94,.8,steel,.6);for(let i=0;i<6;i++){const a=i*Math.PI/3;const rib=ring(p,.95,-.5,steel,.025);rib.rotation.y=Math.PI/2;rib.rotation.x=a;rib.scale.set(1.4,1,1);}ring(p,.93,.2,steel,.05);continue;}
 cylinder(p,r,l,steel);ring(p,r+.01,-l/2+.12,dark,.065);ring(p,r+.01,l/2-.12,dark,.065);
 for(let j=0;j<3;j++)ring(p,r+.006,-l/2+(j+1)*l/4,dark,.012);
 for(let j=0;j<8;j++){const a=j*Math.PI/4;const panel=new T.Group();panel.rotation.z=a; p.add(panel);box(panel,.43,.055,l*.62,part.type==='reactor'?dark:steel,0,r,0);if(part.type==='habitat'){for(let k=0;k<3;k++)box(panel,.25,.025,.3,glass,0,r+.04,(k-1)*.58);}else for(let k=0;k<5;k++)box(panel,.32,.025,.035,dark,0,r+.04,(k-2)*.13);box(panel,.09,.025,.09,rng()>.5?amber:glow,.26,r+.035,l*.32);for(const z of [-l*.4,l*.4])box(panel,.045,.035,.045,dark,.28,r+.01,z);}
 }else if(part.type==='solar'||part.type==='wing'){
 const s=part.side||1;box(p,3.5,.09,1.7,steel,s*1.7,0,0);if(part.type==='solar')for(let x=0;x<7;x++)for(let z=0;z<4;z++)box(p,.42,.015,.35,blue,s*(.25+x*.47),.055,(z-1.5)*.39);else{const fin=box(p,.07,.85,1.25,steel,s*2.8,.45,.2);fin.rotation.x=-.3;}box(p,.1,.07,.15,amber,s*3.4,.08,0);
 }else{cylinder(p,.18,.65,steel);const dish=mesh(new T.SphereGeometry(.65,32,12,0,Math.PI*2,0,.9),steel,p,0,.7,0);dish.rotation.x=-Math.PI/2;box(p,.06,.75,.06,dark,0,.45,0);}
 }
 if(single){root.children.forEach((p,i)=>p.position.set(i*3,0,0));}root.rotation.set(-.12,-.75,0);return root;
}
