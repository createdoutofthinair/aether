// Explicit pinned URLs keep the complete generation graph usable in workers.
import * as T from '../vendor-gpu/three.webgpu.js';
import {mergeVertices} from '../render/worker-kit/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from '../render/worker-kit/RoundedBoxGeometry.js';
import {surfaceAtlas,mapSurface} from '../render/worker-kit/surface-atlas.js';
import {bakeSurface} from '../hull/surface.js';
import {random} from '../ships/blueprint.js';
export const CITY_ZONES=['ceramic','frame','service','stone','roof','repair','accent','identity'];
/** Buildings and ships share the surface baker, atlas packing, mip filtering,
 * semantic material zoning and opaque worker transfer; architecture uses its
 * own finish recipes rather than stretching a spacecraft texture over a city. */
export function cityMaterials(seed='FRESCO-01',wear=.35){
 const recipes=[
  {preset:'ceramic',paint:'#bebdb0',roughness:.67,metalness:0,panels:3},
  {preset:'alloy',substrate:'#8b999c',paintCoverage:0,roughness:.4,panels:4},
  {preset:'engine',substrate:'#384a50',paintCoverage:0,roughness:.7,heat:.05,panels:4},
  {preset:'ceramic',paint:'#8c8d82',roughness:.87,panels:2},
  {preset:'armor',paint:'#414f50',roughness:.78,panels:6},
  {preset:'armor',paint:'#9a9c8b',roughness:.57,panels:2},
  {preset:'armor',paint:'#467b83',roughness:.52,panels:3},
  {preset:'armor',paint:'#aa8250',roughness:.65,panels:5}
 ];
 const tiles=recipes.map((recipe,index)=>{
  const tile=bakeSurface({...recipe,seed:seed+':city:'+index,wear:wear*.19,heat:recipe.heat??0,grain:.11,markings:false},128);
  // Gravity-aligned runoff and broad finish variation, never uniform noise.
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const i=(y*128+x)*4,streak=Math.pow(Math.max(0,Math.sin(x*.31+index)),18)*(.2+.8*y/127)*wear;
   for(let c=0;c<3;c++)tile.color[i+c]=Math.round(tile.color[i+c]*(1-streak*.23));
   tile.surface[i+1]=Math.min(245,tile.surface[i+1]+Math.round(streak*20));
   if([0,3,4,7].includes(index))tile.surface[i+2]=0;
  }
  return tile;
 });
 const atlas=surfaceAtlas(tiles,{seed,name:'Architectural manufacturing surfaces',tileMeters:4});
 const zones=Object.fromEntries(CITY_ZONES.map((zone,index)=>[zone,{zone,index,material:atlas.material}]));
 const glass=new T.MeshStandardMaterial({name:'Architectural glazing',color:0x25434e,roughness:.24,metalness:.35,vertexColors:true});
 const glow=new T.MeshStandardMaterial({name:'Occupied rooms and wayfinding',color:0x879e9b,emissive:0xe8b97b,emissiveIntensity:.65,roughness:.5,vertexColors:true});
 const green=new T.MeshStandardMaterial({name:'Planted terraces',color:0x405c44,roughness:.94,vertexColors:true});
 return{atlas,zones,glass,glow,green,all:[atlas.material,glass,glow,green]};
}
export function buildingModel(plan,lod=0,materials){
 const root=new T.Group(),{glass,glow,green}=materials,z=plan.profile?{...materials.zones,ceramic:materials.zones.repair,accent:materials.zones.identity}:materials.zones,rng=random(plan.seed+':detail:'+plan.variant),w=plan.width,d=plan.depth,h=plan.height;
 const segments=[40,20,12][lod],step=[1,3,8][lod];
 function add(g,material,x=0,y=0,zz=0,ry=0,tint=1){
  if(material.zone)mapSurface(g,material,{tint});
  else{const count=g.attributes.position.count,colors=new Float32Array(count*3);colors.fill(tint);g.setAttribute('color',new T.BufferAttribute(colors,3));g.setAttribute('uv1',g.attributes.uv.clone());}
  const mesh=new T.Mesh(g,material.material||material);mesh.position.set(x,y,zz);mesh.rotation.y=ry;root.add(mesh);return mesh;
 }
 function box(x,y,zz,bw,bh,bd,material=z.ceramic,ry=0){
  const bevel=lod===0&&Math.min(bw,bh,bd)>.7,g=bevel?mergeVertices(new RoundedBoxGeometry(bw,bh,bd,1,Math.min(plan.detail.bevel,bw*.06,bh*.06,bd*.06))):new T.BoxGeometry(bw,bh,bd);
  const mesh=add(g,material,x,y,zz,ry,.94+rng()*.1);mesh.userData.beveled=bevel;return mesh;
 }
 function cylinder(x,y,zz,rt,rb,bh,material=z.ceramic){return add(new T.CylinderGeometry(rt,rb,bh,segments,1),material,x,y,zz);}
 function ring(radius,y,tube=.35,material=z.frame){const mesh=add(new T.TorusGeometry(radius,tube,4,segments*2),material,0,y);mesh.rotation.x=Math.PI/2;return mesh;}
 function windowBands(cx,cz,bw,bd,base,height){
  const floors=Math.max(1,Math.floor(height/plan.floorHeight));
  for(let floor=0;floor<floors;floor++){
   const y=base+2.4+floor*plan.floorHeight;
   // Deep reveals, floor edges, and occupied rooms establish human scale.
   for(const side of [-1,1]){
    const lit=(floor+plan.variant)%7===2,mat=lit?glow:glass;
    if(lod===0){box(cx,y,cz+side*(bd*.5+.035),bw*.88,1.85,.12,mat);box(cx+side*(bw*.5+.035),y,cz,.12,1.85,bd*.88,mat);}
    else{add(new T.PlaneGeometry(bw*.88,1.85),mat,cx,y,cz+side*(bd*.5+.095),side>0?0:Math.PI);add(new T.PlaneGeometry(bd*.88,1.85),mat,cx+side*(bw*.5+.095),y,cz,side*Math.PI/2);}
    if(lod<2&&floor%step===0){box(cx,y+1.03,cz+side*(bd*.5+.2),bw*.94,.18,.46,z.frame);box(cx+side*(bw*.5+.2),y+1.03,cz,.46,.18,bd*.94,z.frame);}
   }
  }
  if(lod===0)for(let i=1;i<6;i++)for(const side of [-1,1]){box(cx+(i/6-.5)*bw,base+height*.5,cz+side*(bd*.5+.15),.28,height,.4,z.frame);box(cx+side*(bw*.5+.15),base+height*.5,cz+(i/6-.5)*bd,.4,height,.28,z.frame);}
 }
 // The primary masses and their socket elevations are identical at every LOD.
 // Only details below the representation's pixel budget are removed.
 box(0,1.2,0,w+3,2.4,d+3,z.stone);
 if(plan.family==='spire'){
  let base=2.4;
  for(let tier=0;tier<3;tier++){const bw=w*(1-tier*.18),bd=d*(1-tier*.18),bh=(h-8)*[.46,.34,.2][tier];box(0,base+bh/2,0,bw,bh,bd);windowBands(0,0,bw,bd,base,bh);box(0,base+bh,0,bw+1.3,1.1,bd+1.3,z.frame);base+=bh;}
  for(let side=0;side<4;side++){const a=side*Math.PI/2;box(Math.sin(a)*(w*.48),h*.34,Math.cos(a)*(d*.48),1.3,h*.65,1.3,z.frame);}
  ring(w*.24,h-3,.6,z.accent);cylinder(0,h+.5,0,.2,.55,13,z.frame);
 }else if(plan.family==='terrace'){
  for(let tier=0;tier<4;tier++){const bw=w*(1-tier*.16),bd=d*(1-tier*.14),bh=(h-2.4)/4,base=2.4+tier*bh,x=(tier%2?1:-1)*tier*1.5;box(x,base+bh/2,0,bw,bh,bd);windowBands(x,0,bw,bd,base,bh);box(x,base+bh,0,bw+2,.7,bd+2,z.frame);box(x,base+bh+.5,bd*.42,bw*.75,.7,2.4,green);}
 }else if(plan.family==='courtyard'){
  const wing=w*.23;
  for(const side of [-1,1]){const x=side*(w-wing)/2;box(x,h*.5+1.2,0,wing,h-2.4,d);windowBands(x,0,wing,d,2.4,h-2.4);box(0,h*.34,side*(d-wing)/2,w*.55,h*.63,wing,z.ceramic);windowBands(0,side*(d-wing)/2,w*.55,wing,2.4,h*.61);}
  box(0,h*.78,0,w*.7,2,4,z.frame);box(0,2.8,0,w*.42,1,d*.43,green);
 }else if(plan.family==='dome'){
  const radius=w*.47,base=h*.17;
  cylinder(0,base/2+2.4,0,radius,radius+1,base,z.stone);
  const g=new T.SphereGeometry(radius,segments,segments/2,0,Math.PI*2,0,Math.PI/2);g.scale(1,(h-base-2.4)/radius,d/w);add(g,glass,0,base+2.4);
  for(let i=0;i<plan.detail.finCount*2;i++){
   const a=i*Math.PI/plan.detail.finCount,profile=[];for(let j=0;j<=12;j++){const t=j*Math.PI/24;profile.push(new T.Vector3(Math.cos(a)*Math.sin(t)*radius,(base+2.4)+Math.cos(t)*(h-base-2.4),Math.sin(a)*Math.sin(t)*radius*d/w));}
   const curve=new T.CatmullRomCurve3(profile);add(new T.TubeGeometry(curve,lod===2?8:16,.35,4,false),z.frame);
  }
  ring(radius,base+2.4,.8);ring(radius*.83,base+2.4+(h-base-2.4)*.55,.28,z.accent);cylinder(0,h+1,0,3,4,2,z.identity);
 }else if(plan.family==='habitat'){
  const bh=h*.83,bw=w*.4,bd=d*.72;
  for(const side of [-1,1]){const cx=side*w*.26;box(cx,2.4+bh*.5,side*d*.09,bw,bh,bd);windowBands(cx,side*d*.09,bw,bd,2.4,bh);box(cx,2.4+bh,side*d*.09,bw+2.4,1.2,bd+2.4,z.frame);box(cx,3.4+bh,side*d*.09,bw*.7,1.2,bd*.65,green);}
  box(0,h*.64,0,w*.78,4,d*.16,z.frame);box(0,h*.64+1,0,w*.78,2,d*.17,glass);cylinder(0,h*.5,0,2.1,2.1,h,z.accent);
 }else{
  box(0,h*.39,0,w,h*.65,d,z.stone);windowBands(0,0,w,d,2.4,h*.55);
  box(0,h*.73,0,w*.92,2,d*.93,z.frame);
  for(const side of [-1,1]){box(side*w*.28,h*.84,0,w*.17,h*.24,d*.68,z.service);cylinder(side*w*.28,h*.98,d*.15,2,2,h*.13,z.frame);}
  if(lod<2)for(let i=0;i<6;i++)box((i-2.5)*w*.13,h*.8,-d*.2,w*.105,.35,d*.23,glass);
 }
 // Street access is always present; fine service equipment is near field only.
 box(0,3.8,d*.5+.35,4,3,.65,z.service);box(0,5.5,d*.5+1.2,6,.4,3,z.frame);box(2.8,4.3,d*.5+.72,.6,.9,.15,glow);
 if(lod<2){const side=plan.service.accessSide;box(side*w*.35,3.2,d*.5+.3,2.8,2.5,.5,z.repair);box(side*w*.35,4.8,d*.5+.6,3,.35,.2,z.identity);}
 if(lod===0){
  const side=plan.detail.roofEquipmentSide;
  for(let i=0;i<3;i++){box(side*w*.24,7.5+i*1.25,-d*.5-.3,3.2,.5,1.5,z.service);box(side*w*.24,7.8+i*1.25,-d*.5-.4,2.7,.1,1.65,z.frame);}
  for(let i=0;i<8;i++)box(-w*.4+i*w*.11,1.65,d*.5+1.4,.22,.38,.25,z.frame);
 }
 root.userData={plan,lod};return root;
}
