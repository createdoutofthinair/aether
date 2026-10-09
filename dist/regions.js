import {world,field} from './world.js?v=shadows-1';
const R=60000,TAU=Math.PI*2;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const definitions=[
 {id:'badlands',name:'Saffron Badlands',description:'Branching canyons, sandstone mesas and pale sediment floors',lat:12,lon:-35,radius:12500,color:[185,109,62],site:[0,-2400]},
 {id:'volcanic',name:'Obsidian Caldera',description:'A broad volcanic shield, crater rim and broken basalt flows',lat:-10,lon:65,radius:13500,color:[86,94,105],site:[0,-5200]},
 {id:'dunes',name:'Zephyr Dunes',description:'Sweeping dune ridges, sheltered hollows and sparse gravel',lat:8,lon:145,radius:11500,color:[214,177,106],site:[0,-1700]}
];
let cachedSeed,regions;
export function featuredRegions(){
 if(cachedSeed===world.seed)return regions;cachedSeed=world.seed;
 const rotation=(world.seed-6)*2.399963229728653;
 regions=definitions.map(r=>{const lat=r.lat*Math.PI/180,lon=r.lon*Math.PI/180+rotation,center={x:Math.cos(lat)*Math.sin(lon),y:Math.sin(lat),z:Math.cos(lat)*Math.cos(lon)},east={x:Math.cos(lon),y:0,z:-Math.sin(lon)},north={x:-Math.sin(lat)*Math.sin(lon),y:Math.cos(lat),z:-Math.sin(lat)*Math.cos(lon)};return{...r,center,east,north,cutoff:1-r.radius*r.radius/(2*R*R)};});return regions;
}
export function regionAt(n){
 for(const r of featuredRegions()){const dot=n.x*r.center.x+n.y*r.center.y+n.z*r.center.z;if(dot<=r.cutoff)continue;
  const distance=R*Math.sqrt(Math.max(0,2-2*dot)),weight=1-smooth(r.radius*.60,r.radius,distance);
  return{...r,weight,x:(n.x*r.east.x+n.y*r.east.y+n.z*r.east.z)*R,z:(n.x*r.north.x+n.y*r.north.y+n.z*r.north.z)*R};
 }return null;
}
export function regionHeight(r){
 const {x,z}=r,s=(world.seed-6)*.013;
 if(r.id==='badlands'){
  const wx=x+field(x/1800+s,z/1900,3)*520,wz=z+field(x/2100,z/1700+s,7)*360;
  const channel=400*Math.sin(z/2400)+230*(field(3,z/950+s,9)-.5),distance=Math.abs(x-channel);
  const bank=smooth(85,430,distance),mesa=smooth(.35,.69,field(wx/1700+s,wz/2100,8));
  const ribs=Math.pow(1-Math.abs(2*field(wx/330,wz/780+s,13)-1),3);
  const branches=Math.exp(-Math.pow((Math.abs(wx)*.32+wz-850*Math.sin(wx/1900))/130,2));
  return 145+25*field(x/3000,z/3000,4)+bank*(240+mesa*650+ribs*180-branches*180);
 }
 if(r.id==='volcanic'){
  const wx=x+140*(field(x/1600,z/1400+s,4)-.5),wz=z+140*(field(x/1300+s,z/1700,6)-.5),rad=Math.hypot(wx,wz);
  const shield=1050*Math.exp(-((rad/4400)**2)),rim=490*Math.exp(-(((rad-1400)/290)**2)),crater=640*Math.exp(-((rad/1050)**4));
  const flows=Math.pow(1-Math.abs(2*field(wx/410+s,wz/1000,11)-1),3)*95*Math.exp(-((rad/5600)**2));
  return 260+shield+rim-crater+flows+25*field(wx/1200,wz/1600,2)+5*(field(x/35,z/42,7)-.5);
 }
 const bend=260*(field(x/1600+s,z/1900,4)-.5)+65*(field(x/520,z/600+s,8)-.5);
 const phase=(x*.88+z*.47+bend)/340*TAU,crest=Math.pow(.5+.5*Math.sin(phase+.35*Math.sin(phase)),2.2);
 const amplitude=45+55*field(x/1100+s,z/1300,11),secondary=Math.pow(.5+.5*Math.sin(phase*.47+field(x/900,z/1100,6)*3),3);
 return 170+35*field(x/2800,z/3200,2)+amplitude*crest+16*secondary;
}
export function regionDirection(region,x=region.site[0],z=region.site[1]){
 const p={x:region.center.x*R+region.east.x*x+region.north.x*z,y:region.center.y*R+region.east.y*x+region.north.y*z,z:region.center.z*R+region.east.z*x+region.north.z*z};const length=Math.hypot(p.x,p.y,p.z);return{x:p.x/length,y:p.y/length,z:p.z/length};
}
