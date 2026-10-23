// Renderer-neutral architectural finishes. Heights are metres; colour stays
// quiet while roughness and shallow relief carry manufacturing detail.
import {seedHash} from '../hull/surface.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),fract=v=>v-Math.floor(v);
export const CITY_TILE_METRES=2;
const hash=(x,y,s)=>{let h=Math.imul(x^s,374761393)^Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;};
export function bakeCityFinish({seed='CITY',paint='#c1c8c6',kind='paint',roughness=.48,metalness=0,wear=.3}={},size=512){
 if(!Number.isInteger(size)||size<64||size>1024||(size&(size-1)))throw Error('City finish size must be a power of two from 64 to 1024');
 const s=seedHash(seed),n=size,N=n*n,color=new Uint8Array(N*4),normal=new Uint8Array(N*4),surface=new Uint8Array(N*4),masks=new Uint8Array(N*4),height=new Float32Array(N),base=[1,3,5].map(i=>parseInt(paint.slice(i,i+2),16)/255),guard=n/8,core=n*.75,road=kind==='asphalt',paver=kind==='paving',mineral=kind==='mineral',service=kind==='service';
 const read=(u,v)=>{
  u=fract(u);v=fract(v);const x=u*2,y=v*2,px=Math.floor(u*core),py=Math.floor(v*core),grain=hash(px,py,s),fine=hash(px,py,s+43),cols=paver?4:service?4:1,rows=paver?4:2,cx=Math.floor(u*cols),cy=Math.floor(v*rows),fx=fract(u*cols),fy=fract(v*rows),id=hash(cx,cy,s+5),edge=Math.min(fx,1-fx)*2/cols,edgeY=Math.min(fy,1-fy)*2/rows;
  const distance=Math.min(edge,edgeY),seam=road?0:clamp((.009-distance)/.006),lip=road?0:clamp((.021-distance)/.013)*(1-seam),dirt=wear*(clamp((.07-distance)/.07)*.35+(1-fy)*clamp((.025-edge)/.025)*.12),chip=!road&&!mineral&&distance<.025&&grain>.985-wear*.025?wear:0;
  const bolt=!road&&!paver&&!mineral&&Math.hypot(Math.min(fx,1-fx)*2/cols-.045,Math.min(fy,1-fy)*2/rows-.045)<.007?1:0;
  const vent=service&&fx>.24&&fx<.76&&fy>.18&&fy<.82?clamp((.012-Math.abs(fract(y*28)-.5)/28)/.006):0;
  const dx=Math.abs(fx-.5)*2/cols,dy=Math.abs(fy-.5)*2/rows,hatchDistance=Math.max(dx-.62/cols,dy-.58/rows,(dx-.62/cols+dy-.58/rows+.07)*.707),hatch=!road&&!paver&&!mineral&&id>.38?clamp((.006-Math.abs(hatchDistance))/.004):0;
  const h=-hatch*.0015-(paver?.003:.0018)*seam+.0005*lip+.0007*bolt-.001*vent+(grain-.5)*(road?.0014:mineral?.0005:.00007)-chip*.0003;
  return{grain,fine,id,seam,lip,dirt,chip,bolt,vent,h,hatch};
 };
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  // A periodic guard band surrounds the central 75% sampled by the atlas.
  const u=(x+.5-guard)/core,v=(y+.5-guard)/core,a=read(u,v),i=(y*n+x)*4;
  let gain=1+(a.id-.5)*(paver?.035:.018)+(a.grain-.5)*(road?.11:mineral?.022:.003)-a.seam*(paver?.3:.22)-a.hatch*.19-a.dirt*.16-a.vent*.36;
  for(let c=0;c<3;c++)color[i+c]=Math.round(clamp(base[c]*gain+(a.chip*.025))*255);
  color[i+3]=255;const r=clamp(roughness+(a.grain-.5)*(road?.15:mineral?.09:.026)+a.dirt*.15+a.seam*.12-a.chip*.06,.22,.97);
  height[y*n+x]=a.h;surface.set([Math.round((1-a.seam*.32-a.vent*.18-a.hatch*.18)*255),Math.round(r*255),Math.round(clamp(metalness*(1-a.dirt)+a.chip*.2)*255),Math.round(clamp(.5+a.h*40)*255)],i);masks.set([255,Math.round(a.chip*255),Math.round(a.seam*255),Math.round(a.dirt*255)],i);
  const e=1/core,dx=(read(u+e,v).h-read(u-e,v).h)/(2*e*CITY_TILE_METRES),dy=(read(u,v+e).h-read(u,v-e).h)/(2*e*CITY_TILE_METRES),l=Math.hypot(dx,dy,1);normal.set([Math.round((.5-dx/l*.5)*255),Math.round((.5-dy/l*.5)*255),Math.round((.5+.5/l)*255),255],i);
 }
 return{size:n,color,normal,surface,masks,recipe:{seed,paint,kind,roughness,metalness,wear,tileMeters:CITY_TILE_METRES}};
}
