import * as T from '../vendor-gpu/three.webgpu.js';
import {facadePoint,facadeNormal,surfacePoint,recessLimit} from './grammar-surfaces.js';

// Direct buffer emission keeps thousands of procedural components in two draw
// streams. Units and UVs are metres. Window holes exist at all mesh LODs.
class Stream{
 constructor(){this.p=[];this.n=[];this.uv=[];this.zone=[];this.color=[];this.parts={};}
 triangle(a,b,c,zone,tint=1,name='panel',normals){
  const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]),normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],length=Math.hypot(...normal);
  if(!Number.isFinite(length))throw Error('Non-finite '+name+' geometry');if(length<1e-8)return;
  const nn=normal.map(v=>v/length),vertical=Math.abs(nn[1])<.7,xFace=Math.abs(nn[0])>.7;
  for(const [index,v]of [a,b,c].entries()){this.p.push(...v);this.n.push(...(normals?.[index]||nn));this.uv.push(xFace?v[2]:v[0],vertical?v[1]:v[2]);this.zone.push(zone,Math.max(0,nn[1])*.3,0,.025);this.color.push(...(Array.isArray(tint)?tint:[tint,tint,tint]));}
  this.parts[name]=(this.parts[name]||0)+1;
 }
 quad(a,b,c,d,zone,tint=1,name){this.triangle(a,b,c,zone,tint,name);this.triangle(a,c,d,zone,tint,name);}
 geometry(){const g=new T.BufferGeometry();for(const [name,data,size]of [['position',this.p,3],['normal',this.n,3],['uv',this.uv,2],['uv1',this.zone,4],['color',this.color,3]])g.setAttribute(name,new T.Float32BufferAttribute(data,size));g.computeBoundingSphere();g.userData.components=this.parts;return g;}
}
const rect=(l,b,r,t,ch=0)=>{ch=Math.max(0,Math.min(ch,(r-l)*.42,(t-b)*.42));return [[l+ch,b],[r-ch,b],[r,b+ch],[r,t-ch],[r-ch,t],[l+ch,t],[l,t-ch],[l,b+ch]];};
function surfaceTriangle(stream,tr,a,b,c,zone,tint,name){
 const cross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),smooth=tr.normal&&cross>1e-8&&/wall-ring|cassette-inlay|armor-cassette|inset-glass|blind-panel/.test(name);
 stream.triangle(tr(...a),tr(...b),tr(...c),zone,tint,name,smooth?[a,b,c].map(v=>tr.normal(...v)):undefined);
}
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function mappedTriangle(stream,tr,a,b,c,zone,name,tint=1,roomUV,uvProject){
 const n=tr.step?(tr.fanSteps||Math.min(7,Math.max(1,Math.ceil((Math.max(a[0],b[0],c[0])-Math.min(a[0],b[0],c[0]))/tr.step),Math.ceil((Math.max(a[1],b[1],c[1])-Math.min(a[1],b[1],c[1]))/tr.stepY)))):1,
  point=(i,j)=>a.map((v,k)=>v+(b[k]-v)*i/n+(c[k]-v)*j/n),emit=(p,q,r)=>{const before=stream.p.length;surfaceTriangle(stream,tr,p,q,r,zone,tint,name);if(roomUV&&stream.p.length>before)for(const v of [p,q,r])roomUV.push(...uvProject(v));};
 for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){emit(point(i,j),point(i+1,j),point(i,j+1));if(i+j<n-1)emit(point(i+1,j),point(i+1,j+1),point(i,j+1));}
}
function mappedQuad(stream,tr,a,b,c,d,zone,name,tint=1){
 const steps=(a,b)=>tr.step?Math.max(1,Math.ceil(Math.abs(b[0]-a[0])/tr.step-1e-7),Math.ceil(Math.abs(b[1]-a[1])/tr.stepY-1e-7)):1,
  nx=Math.min(12,Math.max(steps(a,b),steps(d,c))),ny=Math.min(6,Math.max(steps(a,d),steps(b,c))),point=(u,v)=>tr(...lerp(lerp(a,b,u),lerp(d,c,u),v));
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const sample=(u,v)=>lerp(lerp(a,b,u),lerp(d,c,u),v),p=sample(x/nx,y/ny),q=sample((x+1)/nx,y/ny),r=sample((x+1)/nx,(y+1)/ny),s=sample(x/nx,(y+1)/ny);
  surfaceTriangle(stream,tr,p,q,r,zone,tint,name);surfaceTriangle(stream,tr,p,r,s,zone,tint,name);
 }
}
function ring(stream,outer,inner,tr,depthOuter,depthInner,zone,name,tint=1){
 for(let i=0;i<8;i++){const j=(i+1)%8;mappedQuad(stream,tr,[...outer[i],depthOuter],[...outer[j],depthOuter],[...inner[j],depthInner],[...inner[i],depthInner],zone,name,tint);}
}
function box(stream,tr,l,b,r,t,front,back,zone,name,tint=1){
 const q=(a,b,c,d)=>mappedQuad(stream,tr,a,b,c,d,zone,name,tint);
 q([l,b,front],[r,b,front],[r,t,front],[l,t,front]);q([r,b,back],[l,b,back],[l,t,back],[r,t,back]);
 q([l,b,back],[r,b,back],[r,b,front],[l,b,front]);q([l,t,front],[r,t,front],[r,t,back],[l,t,back]);
 q([l,b,back],[l,b,front],[l,t,front],[l,t,back]);q([r,b,front],[r,b,back],[r,t,back],[r,t,front]);
}
function plate(stream,tr,l,b,r,t,front,back,zone,name){
 const shape=rect(l,b,r,t,Math.min((r-l)*.12,(t-b)*.12,.32)),center=[(l+r)/2,(b+t)/2];
 for(let i=0;i<8;i++){const j=(i+1)%8;mappedTriangle(stream,tr,[...center,front],[...shape[i],front],[...shape[j],front],zone,name);mappedQuad(stream,tr,[...shape[i],front],[...shape[j],front],[...shape[j],back],[...shape[i],back],zone,name);}
}
const worldBox=(s,x,y,z,w,h,d,zone,name)=>box(s,(a,b,c)=>[x+a,y+b,z+c],-w/2,0,w/2,h,d/2,-d/2,zone,name);

function curvedRoofAndBase(ir,stream,near){
 const s=ir.surface,contours=t=>s.metrics.map((m,loop)=>Array.from({length:m.bays*3},(_,i)=>surfacePoint(s,i/(m.bays*3),t,loop))),
  cap=(loops,top,name)=>{const flat=loops.flat(),outline=loops[0].map(p=>new T.Vector2(p[0],p[2])),holes=loops.slice(1).map(loop=>loop.map(p=>new T.Vector2(p[0],p[2])));
   for(const tri of T.ShapeUtils.triangulateShape(outline,holes)){let [a,b,c]=tri.map(i=>flat[i]);const dy=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);if((dy>0)!==top)[b,c]=[c,b];stream.triangle(a,b,c,top?4:3,1,name);}};
 const roof=contours(1),base=contours(0);cap(roof,true,'sculpted-roof');cap(base.map(loop=>loop.map(p=>[p[0],0,p[2]])),false,'sculpted-foundation');
 for(const [loopIndex,loop]of roof.entries())for(let i=0;i<loop.length;i++){
  const a=loop[i],b=loop[(i+1)%loop.length],mid=(i+.5)/loop.length,n=[-(b[2]-a[2]),0,b[0]-a[0]],len=Math.hypot(...n),out=n.map(v=>v/len),height=ir.world.roof==='shield'?.9:.55;
  const tr=(x,y,d)=>[a[0]+(b[0]-a[0])*x+out[0]*d,a[1]+y,a[2]+(b[2]-a[2])*x+out[2]*d];
  box(stream,tr,0,0,1,height,.02,-.22,0,'curved-crown');if(near)box(stream,tr,0,height,1,height+.07,.07,-.27,1,'crown-coping');
  // Foundation uses the same angular knots as the wall skin.
  const p=base[loopIndex][i],q=base[loopIndex][(i+1)%loop.length];stream.quad([p[0],0,p[2]],[q[0],0,q[2]],q,p,3,1,'curved-foundation-edge');
 }
 const top=surfacePoint(s,.5,1),cx=s.lean,cz=0,y=top[1];
 // A real annular cooling assembly: raised rim, open centre, radial blades,
 // supporting frame and service housings. Keep the open atrium unobstructed.
 if(ir.mass!=='atrium-shell'&&ir.mass!=='crescent-shell'){
  const radius=Math.min(s.rx,s.rz)*.22;
  for(let i=0;i<32;i++){const a=-i/32*Math.PI*2,b=-(i+1)/32*Math.PI*2,p=(angle,r,h)=>[cx+Math.cos(angle)*r,y+h,cz+Math.sin(angle)*r];
   stream.quad(p(a,radius,.35),p(b,radius,.35),p(b,radius,1.25),p(a,radius,1.25),1,1,'cooling-rim');
   stream.quad(p(a,radius,1.25),p(b,radius,1.25),p(b,radius*.8,1.25),p(a,radius*.8,1.25),5,1,'cooling-lip');
   if(i%2===0&&near)stream.quad(p(a,radius*.12,.75),p(a+.08,radius*.12,.75),p(a+.28,radius*.77,.9),p(a+.12,radius*.77,.9),2,1,'cooling-blade');
  }
  worldBox(stream,cx,y+.08,cz,radius*1.55,.22,radius*1.55,2,'cooling-base');
  for(const sign of [-1,1]){worldBox(stream,cx+sign*radius*1.8,y,cz,radius*.8,.85,radius*1.8,5,'roof-powerpack');if(near)for(let k=0;k<6;k++)worldBox(stream,cx+sign*radius*1.8,y+.9,cz-radius*.65+k*radius*.26,radius*.6,.07,.09,1,'powerpack-fin');}
 }
}

/** Procedural module construction, not decals on a closed opaque host shell.
 * The wall ring stops at the aperture. Chamfer, reveal and frame are separate
 * non-coplanar surfaces. A semantic bay is unchanged by simplification. */
export function grammarBuildingModel(ir,materials,{lod=0,clay=false}={}){
 const solid=new Stream(),glazing=new Stream(),{world:w,options:o}=ir,near=lod===0;
 const apertures=[],roomUV=[];
 for(const f of ir.facades){
  const n=f.n,cache=new Map(),sample=(x,y)=>{const key=x.toFixed(7)+':'+y.toFixed(7);let v=cache.get(key);if(!v){v={p:facadePoint(f,x,y,0),n:facadeNormal(f,x,y)};cache.set(key,v);}return v;},transform=(x,y,z)=>{if(!f.surface)return facadePoint(f,x,y,z);const v=sample(x,y);return v.p.map((p,i)=>p+v.n[i]*z);},
   bw=f.width,bh=f.height,entry=f.type==='entry',vent=['vent','service'].includes(f.type),
   wallZone=f.zone==='base'?3:6===f.floor%7?5:0,
   tint=f.zone==='base'?.93:1,
   left=-bw/2,right=bw/2,bottom=0,top=bh;
  if(f.surface){transform.step=bw/(3*f.span);transform.stepY=f.floorHeight/2;transform.fanSteps=Math.min(near?4:3,Math.max(3*f.span,2*f.floorSpan));transform.normal=(x,y)=>sample(x,y).n;}
  // Lower spandrel, vertical pilaster and thin joints define a visible hierarchy.
  if(f.type==='solid'){
   box(solid,transform,left,bottom,right,top,-.015,-w.wall,wallZone,'blind-panel',tint);
   plate(solid,transform,-bw*.38,bh*.1,bw*.38,bh*.9,.25,-.01,f.accent?6:5,'armor-cassette');
   plate(solid,transform,-bw*.32,bh*.16,bw*.32,bh*.84,.3,.25,0,'cassette-inlay');
   if(f.accent){box(solid,transform,-bw*.06,.03,bw*.06,top-.03,.62,.3,1,'service-spine');if(near)for(let y=.5;y<top-.3;y+=.85)box(solid,transform,-bw*.11,y,bw*.11,y+.1,.68,.6,2,'spine-clamp');}
   if(near){for(const x of [-bw*.29,bw*.29])for(const y of [bh*.23,bh*.77])box(solid,transform,x-.055,y-.08,x+.055,y+.08,.37,.3,1,'panel-latch');
    for(let k=0;k<3;k++)box(solid,transform,bw*.06,bh*.3+k*.16,bw*.26,bh*.34+k*.16,.34,.3,2,'cassette-slot');}
   if(near)for(const y of [bh*.23,bh*.77])box(solid,transform,-bw*.24,y,bw*.24,y+.025,.33,.31,1,'cassette-seam');
   continue;
  }
  const shape=f.aperture,ratio=entry?.77:vent?.65:shape==='tall'?.38:shape==='slit'?.82:shape==='viewport'?.57:shape==='atrium'?.8:shape==='panoramic'||shape==='ribbon'?.9:.72,
   windowH=entry?bh*.78:vent?bh*.54:shape==='slit'?bh*.23:shape==='ribbon'?bh*.38:shape==='atrium'||shape==='tall'?bh*.8:bh*w.window,
   sill=entry?.06:shape==='slit'?bh*.4:Math.max(.45,(bh-windowH)*.52),shift=entry?0:Math.max(-(1-ratio)*bw*.35,Math.min((1-ratio)*bw*.35,(f.shift||0)*bw)),
   l=-bw*ratio/2+shift,r=bw*ratio/2+shift,b=sill,t=sill+windowH,ch=entry?.2:o.world==='lunar'?.3:.22,
   opening=rect(l,b,r,t,ch),outer=rect(left,bottom,right,top,0),
   bevel=.065,recess=recessLimit(f,entry?w.recess+.25:f.type==='loggia'?Math.max(.85,w.recess):w.recess),
   inner=rect(l+bevel,b+bevel,r-bevel,t-bevel,Math.max(.02,ch-bevel*.4));
  ring(solid,outer,opening,transform,0,0,wallZone,'wall-ring',tint);
  ring(solid,opening,inner,transform,0,-.1,5,'aperture-bevel');
  ring(solid,inner,inner,transform,-.1,-recess,1,'reveal');
  const glassRing=rect(l+.13,b+.13,r-.13,t-.13,Math.max(.02,ch-.04));
  ring(solid,inner,glassRing,transform,-recess,-recess-.025,1,'gasket');
  // Glazing is inset behind the return, with no host wall behind it.
  // A convex octagon can be fanned without triangulation/CSG ambiguities.
  const glassTint=f.occupied?[.94,.91,.76]:f.variant===0?[.67,.87,.96]:[.8,.96,1.06],center=transform((l+r)/2,(b+t)/2,-recess-.026);
  for(let i=0;i<8;i++)mappedTriangle(glazing,transform,[(l+r)/2,(b+t)/2,-recess-.026],[...glassRing[i],-recess-.026],[...glassRing[(i+1)%8],-recess-.026],0,'inset-glass',glassTint,roomUV,([x,y])=>[(x-l)/(r-l),(y-b)/(t-b)]);
  apertures.push({id:f.id,center:transform((l+r)/2,(b+t)/2,0),normal:facadeNormal(f,(l+r)/2,(b+t)/2),depth:recess,width:r-l,height:t-b});
  if(vent){
   // Louvers have real depth, silhouette and gaps; distant LOD keeps fewer blades.
   const count=near?Math.min(20,Math.max(4,Math.floor(windowH/.22))):4;
   for(let k=0;k<count;k++){const y=b+.13+(windowH-.3)*(k+.5)/count;box(solid,transform,l+.1,y,r-.1,y+.065,-.075,-recess*.7,2,'louver');}
  }else{
   const mullions=entry?1:Math.max(ir.facade==='paired'?1:0,Math.floor((r-l)/3.2));
   for(let k=1;k<=mullions;k++){const x=l+(r-l)*k/(mullions+1);box(solid,transform,x-.035,b+.08,x+.035,t-.08,-recess+.2,-recess-.03,1,'mullion');}
   box(solid,transform,l-.09,b-.11,r+.09,b-.025,.16,-.16,1,'sill');
   if(near){
    // Small manufactured trim is an inset frame, never arbitrary greebles.
    for(const x of [l-.07,r+.07])box(solid,transform,x-.018,b-.08,x+.018,t+.08,.026,-.025,1,'face-trim');
    if(!entry)box(solid,transform,l-.07,t+.02,r+.07,t+.055,.026,-.025,1,'face-trim');
   }
  }
  // Common floor datum remains continuous around adjoining bays.
  box(solid,transform,left,top-.2,right,top-.035,.25,-.01,1,'floor-edge');
  if(ir.facade==='fins'||f.accent&&ir.facade==='frame'){
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
 if(ir.surface)curvedRoofAndBase(ir,solid,near);
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
