import * as T from 'three/webgpu';
import {createOrbit} from './orbit.js';
// Actual beveled solids based on the supplied image, not an image plane.
export function createEmblem(metal){
 const root=new T.Group(), body=new T.Group();root.add(body);
 const cyan=new T.MeshStandardMaterial({color:0x8cdfff,emissive:0x55cfff,emissiveIntensity:2.5,roughness:.24,metalness:.45});
 function plate(points,mat,depth=.22){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:12});g.translate(0,0,-depth/2);const m=new T.Mesh(g,mat);body.add(m);return m;}
 // Two tapered, sculptural arms with the same central negative space as reference.
 plate([[-.03,2.1],[-1.9,-1.4],[-.99,-.95],[-.19,.34]],metal);
 plate([[.03,2.1],[.19,.34],[.99,-.95],[1.9,-1.4]],metal);
 const dark=metal.clone();dark.color.set(0x394751);dark.roughness=.36;
 plate([[-.04,1.78],[-.14,.36],[-.94,-.90],[-.35,.14]],dark,.28);
 plate([[.04,1.78],[.35,.14],[.94,-.90],[.14,.36]],dark,.28);
 const tube=(points,r,mat,parent=body)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const mesh=new T.Mesh(new T.TubeGeometry(curve,100,r,8,false),mat);parent.add(mesh);return mesh;};
 for(const sign of [-1,1])tube([[sign*.06,1.86,.155],[sign*.16,.40,.155],[sign*.95,-.94,.155]],.009,cyan);
 const orbit=createOrbit(metal);body.add(orbit.group);root.userData.update=orbit.update;
 // Geometric wordmark keeps it sharp at every camera distance.
 const letters=[[[0,0],[.22,.4],[.44,0]],[[.40,.4],[0,.4],[0,0],[.40,0]],[[0,.4],[.44,.4]],[[0,0],[0,.4]],[[.4,.4],[0,.4],[0,0],[.4,0]],[[0,0],[0,.4],[.31,.4],[.4,.32],[.31,.22],[0,.22],[.42,0]]];
 const word=new T.Group();root.add(word);const stroke=.025;
 function bar(a,b,x){const dx=b[0]-a[0],dy=b[1]-a[1];const m=new T.Mesh(new T.BoxGeometry(Math.hypot(dx,dy),stroke,.065),metal);m.rotation.z=Math.atan2(dy,dx);m.position.set(x+(a[0]+b[0])/2,-1.94+(a[1]+b[1])/2,0);word.add(m);}
 letters.forEach((pts,i)=>{const x=-1.88+i*.67;for(let n=1;n<pts.length;n++)bar(pts[n-1],pts[n],x);if(i===1||i===4)bar([0,.2],[.32,.2],x);if(i===2)bar([.22,.4],[.22,0],x);if(i===3){bar([.44,0],[.44,.4],x);bar([0,.2],[.44,.2],x);}});
 root.userData.emissive=cyan;return root;
}
