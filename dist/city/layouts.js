import {random} from '../ships/blueprint.js';
export const CITY_LAYOUTS={circular:{label:'Concord · circular network',description:'Concentric districts, radial boulevards and orbital transit.'},grid:{label:'Metropolis · street grid',description:'Connected urban blocks, a central civic square and a denser business district.'},organic:{label:'Old city · grown streets',description:'Uneven blocks, bending streets, small squares and several neighborhood centers.'},ribbon:{label:'Corridor · transit city',description:'An elongated settlement along a main transit spine, with cross streets and pocket parks.'}};
export function segmentDistance(x,z,r){const dx=r.bx-r.ax,dz=r.bz-r.az,t=Math.max(0,Math.min(1,((x-r.ax)*dx+(z-r.az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-r.ax-t*dx,z-r.az-t*dz);}
/** A connected planar street graph owns its parcels before any building is
 * selected. Neighbouring parcels share the exact same junction vertices. */
export function urbanDistrict(hub,config){
 const kind=config.layout,r=random(config.seed+':streets:'+hub.id),nx=kind==='ribbon'?config.rings*2+3:config.rings*2-1,nz=kind==='ribbon'?4:nx,ex=hub.radius*(kind==='ribbon'?.89:.67),ez=hub.radius*(kind==='ribbon'?.27:.67),angle=kind==='organic'?(r()-.5)*.55:0;
 const axis=(n,extent)=>{const weights=Array.from({length:n},()=>kind==='organic'?.65+r()*.7:1),sum=weights.reduce((a,b)=>a+b),a=[-extent];for(const w of weights)a.push(a.at(-1)+w/sum*extent*2);return a;},xs=axis(nx,ex),zs=axis(nz,ez),sx=ex*2/nx,sz=ez*2/nz;
 const nodes=Array.from({length:nz+1},(_,j)=>Array.from({length:nx+1},(_,i)=>{const x=xs[i]+(kind==='organic'?Math.sin(i*.91+j*.63)*sx*.14:0),z=zs[j]+(kind==='organic'?Math.sin(j*1.3-i*.51)*sz*.14:0);return{x:hub.x+x*Math.cos(angle)-z*Math.sin(angle),z:hub.z+x*Math.sin(angle)+z*Math.cos(angle)};})),routes=[],lots=[],parks=[];
 const edge=(a,b,id,arterial)=>routes.push({id:`${hub.id}:street:${id}`,type:'street',hub:hub.id,ax:a.x,az:a.z,bx:b.x,bz:b.z,width:arterial?22:15,sidewalk:4,y:arterial?9:0,transit:arterial,phase:r()});
 for(let j=0;j<=nz;j++)for(let i=0;i<nx;i++)edge(nodes[j][i],nodes[j][i+1],`h:${i}:${j}`,j===Math.floor(nz/2));
 for(let i=0;i<=nx;i++)for(let j=0;j<nz;j++)edge(nodes[j][i],nodes[j+1][i],`v:${i}:${j}`,i===Math.floor(nx/2));
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
  const polygon=[nodes[j][i],nodes[j][i+1],nodes[j+1][i+1],nodes[j+1][i]],x=polygon.reduce((s,p)=>s+p.x,0)/4,z=polygon.reduce((s,p)=>s+p.z,0)/4;
  const boundaries=[routes.find(v=>v.id===`${hub.id}:street:h:${i}:${j}`),routes.find(v=>v.id===`${hub.id}:street:h:${i}:${j+1}`),routes.find(v=>v.id===`${hub.id}:street:v:${i}:${j}`),routes.find(v=>v.id===`${hub.id}:street:v:${i+1}:${j}`)],clearance=Math.min(...boundaries.map(v=>segmentDistance(x,z,v)-v.width/2-v.sidewalk-2));
  const civic=i===Math.floor(nx/2)&&j===Math.floor(nz/2),rng=random(config.seed+`:parcel:${hub.id}:${i}:${j}`),park=!civic&&(rng()>config.density||kind==='ribbon'&&j===nz-1&&i%4===0),district=j===nz-1&&i%3===0?'utility':(i+j)%7===0?'culture':Math.hypot(i-nx/2,j-nz/2)<nx*.28?'research':'residential';
  const yaw=-Math.atan2(polygon[1].z-polygon[0].z,polygon[1].x-polygon[0].x),lot={id:`${hub.id}:parcel:${i}:${j}`,hub:hub.id,x,z,yaw,clearance,polygon,zone:civic?'civic':district,civic};
  if(park)parks.push({hub:hub.id,x,z,radius:Math.max(3,Math.min(clearance*.7,20)),square:true,yaw});else lots.push(lot);
 }
 return{nodes:nodes.flat(),routes,lots,parks};
}
