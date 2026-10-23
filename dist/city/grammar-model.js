import * as T from '../vendor-gpu/three.webgpu.js';

// Direct buffer emission keeps thousands of procedural components in two draw
// streams. Units and UVs are metres. Window holes exist at all mesh LODs.
class Stream{
 constructor(){this.p=[];this.n=[];this.uv=[];this.zone=[];this.color=[];this.parts={};}
 triangle(a,b,c,zone,tint=1,name='panel'){
  const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]),normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],length=Math.hypot(...normal);
  if(length<1e-8)return;
  const nn=normal.map(v=>v/length),vertical=Math.abs(nn[1])<.7,xFace=Math.abs(nn[0])>.7;
  for(const v of [a,b,c]){this.p.push(...v);this.n.push(...nn);this.uv.push(xFace?v[2]:v[0],vertical?v[1]:v[2]);this.zone.push(zone,Math.max(0,nn[1])*.3,0,.025);this.color.push(...(Array.isArray(tint)?tint:[tint,tint,tint]));}
  this.parts[name]=(this.parts[name]||0)+1;
 }
 quad(a,b,c,d,zone,tint=1,name){this.triangle(a,b,c,zone,tint,name);this.triangle(a,c,d,zone,tint,name);}
 geometry(){const g=new T.BufferGeometry();for(const [name,data,size]of [['position',this.p,3],['normal',this.n,3],['uv',this.uv,2],['uv1',this.zone,4],['color',this.color,3]])g.setAttribute(name,new T.Float32BufferAttribute(data,size));g.computeBoundingSphere();g.userData.components=this.parts;return g;}
}
const rect=(l,b,r,t,ch=0)=>[[l+ch,b],[r-ch,b],[r,b+ch],[r,t-ch],[r-ch,t],[l+ch,t],[l,t-ch],[l,b+ch]];
function ring(stream,outer,inner,transform,depthOuter,depthInner,zone,name,tint=1){
 for(let i=0;i<8;i++){const j=(i+1)%8;stream.quad(transform(...outer[i],depthOuter),transform(...outer[j],depthOuter),transform(...inner[j],depthInner),transform(...inner[i],depthInner),zone,tint,name);}
}
function box(stream,transform,l,b,r,t,front,back,zone,name,tint=1){
 const v=(x,y,z)=>transform(x,y,z);
 stream.quad(v(l,b,front),v(r,b,front),v(r,t,front),v(l,t,front),zone,tint,name);
 stream.quad(v(r,b,back),v(l,b,back),v(l,t,back),v(r,t,back),zone,tint,name);
 stream.quad(v(l,b,back),v(r,b,back),v(r,b,front),v(l,b,front),zone,tint,name);
 stream.quad(v(l,t,front),v(r,t,front),v(r,t,back),v(l,t,back),zone,tint,name);
 stream.quad(v(l,b,back),v(l,b,front),v(l,t,front),v(l,t,back),zone,tint,name);
 stream.quad(v(r,b,front),v(r,b,back),v(r,t,back),v(r,t,front),zone,tint,name);
}
const worldBox=(s,x,y,z,w,h,d,zone,name)=>box(s,(a,b,c)=>[x+a,y+b,z+c],-w/2,0,w/2,h,d/2,-d/2,zone,name);

/** Procedural module construction, not decals on a closed opaque host shell.
 * The wall ring stops at the aperture. Chamfer, reveal and frame are separate
 * non-coplanar surfaces. A semantic bay is unchanged by simplification. */
export function grammarBuildingModel(ir,materials,{lod=0,clay=false}={}){
 const solid=new Stream(),glazing=new Stream(),{world:w,options:o}=ir,near=lod===0;
 const apertures=[],roomUV=[];
 for(const f of ir.facades){
  const [px,py,pz]=f.position,u=f.u,n=f.n,transform=(x,y,z)=>[px+u[0]*x+n[0]*z,py+y,pz+u[2]*x+n[2]*z],
   bw=f.width,bh=f.height,entry=f.type==='entry',vent=['vent','service'].includes(f.type),
   wallZone=f.zone==='base'?3:6===f.floor%7?5:0,
   tint=f.zone==='base'?.93:1,
   left=-bw/2,right=bw/2,bottom=0,top=bh;
  // Lower spandrel, vertical pilaster and thin joints define a visible hierarchy.
  if(f.type==='solid'){
   box(solid,transform,left,bottom,right,top,-.015,-w.wall,wallZone,'blind-panel',tint);
   box(solid,transform,-bw*.33,bh*.13,bw*.33,bh*.87,.14,-.01,f.accent?6:5,'blind-cassette');
   box(solid,transform,-bw*.27,bh*.19,bw*.27,bh*.81,.17,.14,5,'cassette-inlay');
   if(near)for(const y of [bh*.23,bh*.77])box(solid,transform,-bw*.24,y,bw*.24,y+.025,.1,.08,1,'cassette-seam');
   continue;
  }
  const ratio=entry?.77:vent?.65:ir.facade==='ribbon'?.89:ir.facade==='gallery'?.79:ir.facade==='paired'?.61:.72,
   windowH=entry?bh*.78:vent?bh*.54:bh*w.window*(ir.facade==='ribbon'?.7:1),
   sill=entry?.06:ir.facade==='ribbon'?bh*.32:Math.max(.62,(bh-windowH)*.52),
   l=-bw*ratio/2,r=bw*ratio/2,b=sill,t=sill+windowH,ch=entry?.2:o.world==='lunar'?.3:.22,
   opening=rect(l,b,r,t,ch),outer=rect(left,bottom,right,top,0),
   bevel=.065,recess=entry?w.recess+.25:f.type==='loggia'?Math.max(.85,w.recess):w.recess,
   inner=rect(l+bevel,b+bevel,r-bevel,t-bevel,Math.max(.02,ch-bevel*.4));
  ring(solid,outer,opening,transform,0,0,wallZone,'wall-ring',tint);
  ring(solid,opening,inner,transform,0,-.1,5,'aperture-bevel');
  ring(solid,inner,inner,transform,-.1,-recess,1,'reveal');
  const glassRing=rect(l+.13,b+.13,r-.13,t-.13,Math.max(.02,ch-.04));
  ring(solid,inner,glassRing,transform,-recess,-recess-.025,1,'gasket');
  // Glazing is inset behind the return, with no host wall behind it.
  // A convex octagon can be fanned without triangulation/CSG ambiguities.
  const glassTint=f.occupied?[.94,.91,.76]:f.variant===0?[.67,.87,.96]:[.8,.96,1.06],center=transform(0,(b+t)/2,-recess-.026);
  for(let i=0;i<8;i++){
   glazing.triangle(center,transform(...glassRing[i],-recess-.026),transform(...glassRing[(i+1)%8],-recess-.026),0,glassTint,'inset-glass');
   roomUV.push(.5,.5,...[glassRing[i],glassRing[(i+1)%8]].flatMap(([x,y])=>[(x-l)/(r-l),(y-b)/(t-b)]));
  }
  apertures.push({id:f.id,center:transform(0,(b+t)/2,0),normal:n,depth:recess,width:r-l,height:t-b});
  if(vent){
   // Louvers have real depth, silhouette and gaps; distant LOD keeps fewer blades.
   const count=near?Math.max(4,Math.floor(windowH/.22)):4;
   for(let k=0;k<count;k++){const y=b+.13+(windowH-.3)*(k+.5)/count;box(solid,transform,l+.1,y,r-.1,y+.065,-.075,-recess*.7,2,'louver');}
  }else{
   const mullions=entry||ir.facade==='paired'?1:ir.facade==='ribbon'?2:0;
   for(let k=1;k<=mullions;k++){const x=l+(r-l)*k/(mullions+1);box(solid,transform,x-.035,b+.08,x+.035,t-.08,-recess+.055,-recess-.02,1,'mullion');}
   box(solid,transform,l-.09,b-.11,r+.09,b-.025,.16,-.16,1,'sill');
   if(near){
    // Small manufactured trim is an inset frame, never arbitrary greebles.
    for(const x of [l-.07,r+.07])box(solid,transform,x-.018,b-.08,x+.018,t+.08,.026,-.025,1,'face-trim');
    if(!entry)box(solid,transform,l-.07,t+.02,r+.07,t+.055,.026,-.025,1,'face-trim');
   }
  }
  // Common floor datum remains continuous around adjoining bays.
  box(solid,transform,left,top-.2,right,top-.035,.13,-.01,1,'floor-edge');
  if(f.accent&&(ir.facade==='frame'||ir.facade==='fins')){
   box(solid,transform,left+.03,.02,left+.22,top-.22,ir.facade==='fins'?.65:.28,-.01,5,'pilaster');
  }
  if(!vent&&(w.shade>.5||ir.facade==='fins')&&f.zone!=='crown'){
   const shade=Math.max(w.shade,ir.facade==='fins'?.6:0);
   box(solid,transform,l-.16,t+.1,r+.16,t+.2,shade,-.04,0,'solar-brow');
   if(near)for(const x of [l-.1,r+.1])box(solid,transform,x-.04,t-.15,x+.04,t+.12,shade*.7,-.04,1,'shade-bracket');
  }
  if(f.type==='loggia'){
   // Recessed loggia: guards stay inside the aperture's host cell footprint.
   box(solid,transform,l+.1,b+.38,r-.1,b+.44,-.015,-.09,1,'loggia-rail');
   if(near)for(let x=l+.2;x<r-.1;x+=.7)box(solid,transform,x-.018,b+.05,x+.018,b+.44,-.015,-.07,1,'loggia-post');
  }
  if(entry){
   box(solid,transform,l-.3,top-.05,r+.3,top+.12,1.2,-.08,0,'entry-canopy');
   box(solid,transform,l+.1,t+.16,r-.1,t+.24,.035,.005,7,'identity-strip');
   box(solid,transform,-.045,.07,.045,t-.12,-recess+.06,-recess-.02,1,'entry-divider');
  }
 }
 const half=o.bay/2;
 for(const r of ir.roofs){
  const {cx:x,cz:z,y}=r,roofZone=r.roof==='garden'?3:4;
  solid.quad([x-half,y,z-half],[x-half,y,z+half],[x+half,y,z+half],[x+half,y,z-half],roofZone,1,'roof-deck');
  // Only a lower neighbour owns a parapet; shared roof edges stay internal.
  for(let side=0;side<4;side++)if(r.edges[side]){
   const isX=side%2===1,dx=side===1?half-.13:side===3?-half+.13:0,dz=side===0?half-.13:side===2?-half+.13:0;
   worldBox(solid,x+dx,y,z+dz,isX?.18:o.bay, r.roof==='shield'?.8:.55,isX?o.bay:.18,0,'parapet');
   if(near)worldBox(solid,x+dx,y+.55,z+dz,isX?.28:o.bay,.07,isX?o.bay:.28,1,'coping');
  }
  if(r.equipment){
   const garden=r.roof==='garden',cw=o.bay*.49,cd=o.bay*.45;
   worldBox(solid,x,y,z,cw,.35,cd,garden?3:2,'plant-plinth');
   if(garden){worldBox(solid,x,y+.35,z,cw*.88,.15,cd*.87,3,'soil');worldBox(solid,x,y+.5,z,cw*.7,.35,cd*.7,6,'planted-cassette');}
   else{
    worldBox(solid,x,y+.35,z,cw*.8, r.roof==='shield'?.85:.65,cd*.75,5,'equipment-housing');
    if(near){for(let k=0;k<5;k++)worldBox(solid,x-cw*.28+k*cw*.14,y+1.02,z,.055,.055,cd*.55,1,'equipment-slats');worldBox(solid,x+cw*.28,y+.35,z, .12,1.2,.12,1,'service-riser');}
   }
  }
 }
 // Cap each occupied ground cell, preserving open courts and footprint voids.
 for(const c of ir.columns){
  const y=ir.foundation,x=c.cx,z=c.cz;
  solid.quad([x-half,0,z+half],[x-half,0,z-half],[x+half,0,z-half],[x+half,0,z+half],3,1,'foundation-bottom');
  for(const [dx,dz]of [[0,1],[1,0],[0,-1],[-1,0]]){
   const nx=c.x+dx,nz=c.z+dz,occupied=nx>=0&&nz>=0&&nx<o.baysX&&nz<o.baysZ&&ir.heights[nz*o.baysX+nx]>0;
   if(occupied)continue;
   const u=[dz,0,-dx],n=[dx,0,dz],transform=(a,b,d)=>[x+dx*half+u[0]*a+n[0]*d,b,z+dz*half+u[2]*a+n[2]*d];
   box(solid,transform,-half,0,half,y-.005,-.015,-.24,3,'foundation-edge');
  }
 }
 const root=new T.Group(),opaque=clay?new T.MeshStandardNodeMaterial({color:0xb8b4aa,roughness:.7}):materials.atlas.material,
  glass=clay?opaque:materials.glass;
 const glassGeometry=glazing.geometry();glassGeometry.setAttribute('uv1',new T.Float32BufferAttribute(roomUV,2));
 root.add(new T.Mesh(solid.geometry(),opaque),new T.Mesh(glassGeometry,glass));
 root.children[0].name='native-construction';root.children[1].name='native-glazing';
 root.children.forEach(m=>{m.castShadow=m.receiveShadow=true;});root.rotation.y=ir.rotation;
 root.userData={grammar:ir,apertures,triangles:(solid.p.length+glazing.p.length)/9,components:solid.parts,lod,ownsMaterials:clay};
 return root;
}
