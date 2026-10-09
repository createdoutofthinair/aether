import * as T from './vendor/three.module.js';
const right=new T.Vector3(),up=new T.Vector3(),anchor=new T.Vector3(),reference=new T.Vector3(0,1,0);
// Snap in planet space before the floating-origin offset: camera motion must not
// slide the shadow texels across stationary surfaces.
export function positionSunShadow(sun,direction,focus,cameraPosition){
 reference.set(0,Math.abs(direction.y)>.99?0:1,Math.abs(direction.y)>.99?1:0);
 right.crossVectors(reference,direction).normalize();up.crossVectors(direction,right).normalize();
 const c=sun.shadow.camera,dx=(c.right-c.left)/sun.shadow.mapSize.x,dy=(c.top-c.bottom)/sun.shadow.mapSize.y;
 anchor.copy(focus).addScaledVector(right,Math.round(focus.dot(right)/dx)*dx-focus.dot(right)).addScaledVector(up,Math.round(focus.dot(up)/dy)*dy-focus.dot(up));
 sun.shadow.camera.up.copy(up);
 sun.target.position.copy(anchor).sub(cameraPosition);
 sun.position.copy(sun.target.position).addScaledVector(direction,150);
}
