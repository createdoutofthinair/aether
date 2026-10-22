import {random} from './leaf-model.js?v=growth-v3';
import {add,sub,mul,dot,length,normalize,lerp,basis,sample,tangent,radiusAt,clamp,smooth} from './growth-math.js?v=growth-v3';
export const treeProfiles={
 birch:{dominance:.86,spread:.34,crownBase:.28,angle:.85,main:10,decay:.61,droop:.28,internode:.020,phyllotaxis:2.399,root:.016},
 oak:{dominance:.37,spread:.59,crownBase:.22,angle:1.06,main:6,decay:.68,droop:.1,internode:.026,phyllotaxis:2.12,root:.025},
 willow:{dominance:.58,spread:.49,crownBase:.3,angle:.94,main:8,decay:.66,droop:1.15,internode:.018,phyllotaxis:2.399,root:.021}
};
// Authoring-only hybrid: species scaffolds, vacant-space attraction, bud competition.
// No per-frame growth simulation. All lengths are metres.
export function generateTree({species='birch',seed=481,height=3.8,levels=3,density=2,leafScale=1,mode='tree',maturity=.65,competition=.65,crown=1,habit='open'}={}){
 const p=treeProfiles[species]||treeProfiles.birch,rnd=random(seed),branches=[],attachments=[],attractors=[];
 height=clamp(height,.5,12);levels=Math.round(clamp(levels,1,4));density=clamp(density,0,4);maturity=clamp(maturity);competition=clamp(competition);crown=clamp(crown,.5,1.6);
 const golden=rnd()*Math.PI*2,asym=[(rnd()-.5)*.18,(rnd()-.5)*.16],width=height*p.spread*crown*(habit==='woodland'?.72:1),base=p.crownBase+(habit==='woodland'?.13:0);
 for(let i=0;i<900;i++){const a=rnd()*Math.PI*2,z=rnd()*2-1,rr=Math.sqrt(1-z*z)*Math.cbrt(rnd()),y=base*height+(height-base*height)*(.5+.5*z);attractors.push({pos:[Math.cos(a)*rr*width+asym[0]*y,y,Math.sin(a)*rr*width+asym[1]*y],alive:true});}
 const occupied=new Map(),occupiedPoints=new Map(),cell=height*.055,key=v=>v.map(x=>Math.floor(x/cell)).join(',');
 function occupancy(v){const c=v.map(x=>Math.floor(x/cell));let n=0;for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)n+=occupied.get([c[0]+x,c[1]+y,c[2]+z].join(','))||0;return n;}
 function grow(start,initial,len,depth,parent=-1,attachT=0){
  if(branches.length>=420)return null;
  const branch={id:branches.length,parent,attachT,depth,points:[start.slice()],radii:[],children:[],scars:[],phase:rnd()*6.28,length:len,age:clamp((levels-depth+.4)/(levels+1)*maturity)};branches.push(branch);
  let direction=normalize(initial),bend=[rnd()-.5,0,rnd()-.5],steps=Math.max(10,Math.ceil(len/height*36));
  for(let i=1;i<=steps;i++){
   const point=branch.points.at(-1),t=i/steps;let attraction=[0,0,0],weight=0;
   if(depth>0)for(const a of attractors){if(!a.alive)continue;const delta=sub(a.pos,point),dist=length(delta);if(dist<cell*.65){a.alive=false;continue;}if(dist<len*.8&&dist>cell*.4){const w=1/(.12+dist/height);attraction=add(attraction,mul(normalize(delta),w));weight+=w;}}
   const phototropic=weight?mul(normalize(attraction),.13*(1-p.dominance*.45)):mul([asym[0],.1,asym[1]],.1);
   const gravity=depth===0?0:p.droop*(depth/Math.max(1,levels))**2*(.15+.85*smooth(t))*.25;
   let avoidance=[0,0,0];if(depth>0&&i>3){const c=point.map(x=>Math.floor(x/cell));for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const old of occupiedPoints.get([c[0]+x,c[1]+y,c[2]+z].join(','))||[]){if(old.id===branch.id||old.id===parent)continue;const delta=sub(point,old.point),d=length(delta);if(d>1e-5&&d<cell*.7)avoidance=add(avoidance,mul(normalize(delta),(1-d/(cell*.7))*.1*competition));}}
   const target=add(direction,add(avoidance,add(phototropic,[bend[0]*.026*Math.sin(t*3+branch.phase),depth===0?.025:.018-gravity,bend[2]*.026*Math.sin(t*4+branch.phase)])));
   if(habit==='windswept')target[0]+=.045*(depth+1)/(levels+1);
   direction=normalize(lerp(direction,normalize(target),.65));let next=add(point,mul(direction,len/steps));
   if(mode!=='branch'&&depth>0){const envT=clamp((next[1]/height-base)/(1-base)),allowed=width*Math.pow(Math.max(.05,Math.sin(Math.PI*envT)),.55);const radial=Math.hypot(next[0]-asym[0]*next[1],next[2]-asym[1]*next[1]);if(radial>allowed*1.06&&i>steps*.55)break;if(next[1]<height*.07)break;}
   branch.points.push(next);const k=key(next);occupied.set(k,(occupied.get(k)||0)+1);if(!occupiedPoints.has(k))occupiedPoints.set(k,[]);occupiedPoints.get(k).push({id:branch.id,point:next});
  }
  branch.length=branch.points.slice(1).reduce((sum,v,i)=>sum+length(sub(v,branch.points[i])),0);
  if(depth<levels){
   const count=depth===0?Math.max(4,Math.round(p.main*(.8+rnd()*.35))):3+Math.floor(rnd()*(species==='oak'?4:3));
   for(let i=0;i<count;i++){
    const t=depth===0?base+(1-base)*(.08+.79*(i+.2+rnd()*.45)/count):.32+.61*(i+.25+rnd()*.45)/count;
    const pos=sample(branch,t),frame=basis(tangent(branch,t));
    const light=clamp(.45+.45*pos[1]/height+.18*Math.hypot(pos[0],pos[2])/width),crowding=occupancy(pos),survival=clamp(.95-competition*(1-light)*.8-competition*Math.max(0,crowding-12)*.012,.2,.98);
    if(rnd()>survival){branch.scars.push({t,angle:golden+i*p.phyllotaxis,strength:.4+.5*maturity});continue;}
    const az=golden+i*p.phyllotaxis+depth*.83+(rnd()-.5)*.55,angle=p.angle*(depth===0?1:.85)+(rnd()-.5)*.3;
    const outward=add(mul(frame.n,Math.cos(az)),mul(frame.b,Math.sin(az))),next=normalize(add(mul(frame.t,Math.cos(angle)),mul(outward,Math.sin(angle))));
    const silhouette=depth===0?Math.pow(Math.sin(Math.PI*clamp((t-base)/(1-base))),.7):1;
    const childLen=depth===0?height*p.spread*crown*(.65+.5*silhouette)*(habit==='woodland'?.72:1):branch.length*p.decay*(.66+rnd()*.4)*(1-.28*t);
    if(childLen<height*.025)continue;
    const child=grow(pos,next,childLen,depth+1,branch.id,t);if(child)branch.children.push(child.id);
   }
  }
  return branch;
 }
 grow([0,0,0],mode==='branch'?[.87,.48,0]:[0,1,0],mode==='branch'?height*.5:height,0);
 // A measurable total-height contract, rather than a trunk-length control.
 const maximum=Math.max(...branches.flatMap(b=>b.points.map(v=>v[1]))),scale=mode==='branch'?1:height/maximum;
 for(const b of branches){b.points=b.points.map(v=>mul(v,scale));b.length*=scale;}
 const exponent=2.35,tip=height*.0002;
 for(let i=branches.length-1;i>=0;i--){const b=branches[i],terminal=Math.max(tip,height*.00035*(1-b.depth/(levels+2))),own=terminal**exponent;
  b.radii=b.points.map((_,j)=>{const t=j/(b.points.length-1);let demand=own*(.22+.78*(1-t))**exponent;
   for(const id of b.children){const child=branches[id],support=1-smooth((t-child.attachT+.025)/.1);demand+=child.radii[0]**exponent*support;}
   return demand**(1/exponent);
  });
 }
 const radiusScale=height*p.root/branches[0].radii[0];for(const b of branches)b.radii=b.radii.map((r,i)=>Math.max(height*.00013,r*radiusScale*(1-.88*smooth((i/(b.radii.length-1)-.78)/.22))));
 let leafCandidates=0;
 for(const b of branches){const leafBearing=b.depth>=Math.max(1,levels-1),start=leafBearing?.18:Math.min(.94,Math.max(.76,...b.children.map(id=>branches[id].attachT+.06)));
  const internode=p.internode*(.85+rnd()*.35),nodes=Math.min(70,Math.max(3,Math.floor(b.length*(1-start)/internode))),shootPhase=rnd()*6.28;
  for(let i=0;i<nodes;i++){
   const t=start+(1-start)*.98*(i+.25+rnd()*.45)/nodes,point=sample(b,t),frame=basis(tangent(b,t)),light=clamp(.35+.4*point[1]/height+.25*Math.hypot(point[0],point[2])/width);
   if(rnd()>Math.min(1,density*.53)*(1-competition*(1-light)*.6))continue;
   const az=shootPhase+i*p.phyllotaxis+(rnd()-.5)*.18,outward=add(mul(frame.n,Math.cos(az)),mul(frame.b,Math.sin(az))),dir=normalize(add(mul(outward,.85),mul(frame.t,.35)));
   const r=radiusAt(b,t),anchor=add(point,mul(outward,r)),petiole=.009*leafScale*(.7+rnd()*.6),basePoint=add(anchor,mul(dir,petiole));
   const attachment={anchor,center:point,base:basePoint,direction:dir,roll:(rnd()-.5)*.7,scale:leafScale*(.72+rnd()*.38)*(.85+.15*light),branch:b.id,t,variant:Math.floor(rnd()*4)};leafCandidates++;if(attachments.length<6000)attachments.push(attachment);else{const replace=Math.floor(rnd()*leafCandidates);if(replace<6000)attachments[replace]=attachment;}
  }
 }
 const segments=[];for(const b of branches)for(let i=1;i<b.points.length;i++)segments.push({start:b.points[i-1],end:b.points[i],r0:b.radii[i-1],r1:b.radii[i],depth:b.depth,id:b.id,parent:b.parent});
 return{branches,segments,attachments,height:mode==='branch'?maximum:height,seed,species,maturity,competition,crown,habit,stats:{branches:branches.length,attractors:attractors.length,consumed:attractors.filter(a=>!a.alive).length}};
}
