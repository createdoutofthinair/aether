import * as T from 'three/webgpu';

export const ORBIT = Object.freeze({radiusX:2.28,radiusY:1.05,tilt:1.05,roll:-.32,centerY:.25,planetRadius:.115,atmosphereRadius:.127,period:24});

// The orbital plane is steeply tilted into depth. Where it crosses the logo
// plane, its endpoints are outside both arms; the rest passes in front/behind.
export class EmblemOrbitCurve extends T.Curve {
 getPoint(t,target=new T.Vector3()){
  const angle=t*Math.PI*2;
  return target.set(ORBIT.radiusX*Math.cos(angle),ORBIT.radiusY*Math.sin(angle),0);
 }
}
export function createOrbit(metal){
 const orbit=new T.Group();orbit.name='Aether orbit';orbit.rotation.set(ORBIT.tilt,0,ORBIT.roll);orbit.position.y=ORBIT.centerY;
 const curve=new EmblemOrbitCurve();
 const ring=new T.Mesh(new T.TubeGeometry(curve,256,.016,10,true),metal.clone());ring.name='Chrome orbital path';orbit.add(ring);
 const planet=new T.Mesh(new T.SphereGeometry(ORBIT.planetRadius,48,32),new T.MeshPhysicalMaterial({color:0x4f91b6,metalness:.45,roughness:.25,clearcoat:1,emissive:0x174764,emissiveIntensity:.7}));planet.name='Orbiting planet';orbit.add(planet);
 const atmosphere=new T.Mesh(new T.SphereGeometry(ORBIT.atmosphereRadius,40,24),new T.MeshBasicMaterial({color:0x79dfff,transparent:true,opacity:.25,side:T.BackSide,blending:T.AdditiveBlending,depthWrite:false}));planet.add(atmosphere);
 const light=new T.PointLight(0x66d6ff,.45,1.2,2);planet.add(light);
 // A short, tapered luminous wake follows the actual ellipse. It retains depth
 // testing, so its far arc is naturally hidden by the emblem rather than overlaid.
 const count=80,sides=8,positions=new Float32Array((count+1)*sides*3),colors=new Float32Array(positions.length),indices=[];
 for(let i=0;i<=count;i++)for(let j=0;j<sides;j++){
  const k=(i*sides+j)*3,fade=Math.pow(1-i/count,1.8);colors.set([.25*fade,.78*fade,fade],k);
  if(i<count){const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;indices.push(a,c,b,b,c,d);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setIndex(indices);
 const wake=new T.Mesh(geometry,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false}));wake.name='Planet ion wake';wake.frustumCulled=false;orbit.add(wake);
 const point=new T.Vector3();let phase=.58/(Math.PI*2);
 function update(dt){
  phase=(phase+dt/ORBIT.period)%1;curve.getPoint(phase,planet.position);planet.rotation.y+=dt*.22;
  for(let i=0;i<=count;i++){
   const t=phase-.008-i/count*.15;curve.getPoint(t,point);const angle=t*Math.PI*2;
   // In-plane ellipse normal and a constant out-of-plane binormal.
   const nx=Math.cos(angle)/ORBIT.radiusX,ny=Math.sin(angle)/ORBIT.radiusY,length=Math.hypot(nx,ny),radius=.019*Math.pow(1-i/count,.7)+.001;
   for(let j=0;j<sides;j++){
    const phi=j/sides*Math.PI*2,k=(i*sides+j)*3;
    positions[k]=point.x+nx/length*Math.cos(phi)*radius;
    positions[k+1]=point.y+ny/length*Math.cos(phi)*radius;
    positions[k+2]=Math.sin(phi)*radius;
   }
  }
  geometry.attributes.position.needsUpdate=true;
 }
 update(0);return{group:orbit,update,curve,planet};
}
