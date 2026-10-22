import * as T from 'three/webgpu';
import {bakeSurface,filteredMips,seedHash} from '../hull/surface.js';
import {hullMaterial} from '../hull/material.js';
export const SHIP_ZONES=['armor','alloy','engine','ceramic','insulation','repair','accent','marking'];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const FONT={A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[15,16,16,16,16,16,15],D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[15,16,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[31,4,4,4,4,4,31],J:[7,2,2,2,18,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,25,21,19,17,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],'0':[14,17,19,21,25,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,2,4,8,31],'3':[30,1,1,14,1,1,30],'4':[2,6,10,18,31,2,2],'5':[31,16,16,30,1,1,30],'6':[14,16,16,30,17,17,14],'7':[31,1,2,4,8,8,8],'8':[14,17,17,14,17,17,14],'9':[14,17,17,15,1,1,14],'-':[0,0,0,31,0,0,0]};
function text(tile,label,x,y,scale=1){
 for(const ch of label){const glyph=FONT[ch];if(glyph)for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(glyph[row]&(1<<(4-col)))for(let a=0;a<scale;a++)for(let b=0;b<scale;b++){
  const px=x+col*scale+a,py=tile.size-1-(y+row*scale+b);if(px<0||py<0||px>=tile.size||py>=tile.size)continue;const i=(py*tile.size+px)*4;tile.color.set([210,201,174,255],i);tile.surface[i+1]=174;tile.surface[i+2]=0;
 }x+=6*scale;}
}
function zoneTile(plan,zone,size,roughness,finish,wear){
 const h=plan.service||{age:.35,registry:'AE-001',accent:'#9d653d'},age=clamp(wear),seed=String(plan.seed)+':'+zone;
 const config={
  armor:{preset:'armor',paint:finish==='dark'?'#354047':'#9eaaa8',roughness,wear:age*.23,grain:.13,panels:3},
  alloy:{preset:'alloy',substrate:'#9aa5a8',paintCoverage:0,roughness:.33,wear:age*.18,panels:2},
  engine:{preset:'engine',substrate:'#8c8b90',paintCoverage:0,roughness:.53,heat:.72,wear:age*.42,panels:3},
  ceramic:{preset:'ceramic',paint:'#b5b09e',roughness:.75,heat:.13,wear:age*.2,panels:5},
  insulation:{preset:'insulation',substrate:'#8a7850',roughness:.66,foil:1,wear:age*.14,panels:2},
  repair:{preset:'armor',paint:finish==='dark'?'#5a676b':'#737f80',roughness:Math.max(.3,roughness-.09),wear:age*.05,panels:2,markings:false},
  accent:{preset:'armor',paint:h.accent,paintCoverage:1,roughness:.57,wear:age*.14,panels:2,markings:false},
  marking:{preset:'armor',paint:'#283237',paintCoverage:1,roughness:.65,wear:0,panels:2,markings:false}
 }[zone];
 const tile=bakeSurface({...config,seed,markings:false,environment:'deep-space'},size);
 // Broad, coherent changes to finish remain visible before microdetail does.
 const salt=seedHash(seed)%100/17;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,u=x/size,v=y/size,patch=Math.sin(u*6.283+salt)*Math.cos(v*6.283-salt),stain=zone==='engine'?Math.exp(-(((v-.82)/.2)**2))*age:0;
  tile.surface[i+1]=Math.round(clamp(tile.surface[i+1]/255+patch*.055+stain*.12,.2,.95)*255);
  for(let c=0;c<3;c++)tile.color[i+c]=Math.round(clamp(tile.color[i+c]*(1+patch*.035-stain*.23),0,255));
 }
 if(zone==='marking'){
  // The decal cell has a quiet background, legible serial and safety stencils.
  for(let i=0;i<tile.color.length;i+=4){tile.color.set([35,43,45,255],i);tile.normal.set([128,128,255,255],i);tile.surface.set([255,174,0,128],i);}
  const s=Math.max(1,Math.floor(size/128)),x=Math.round(size*.125);
  text(tile,'AETHER',x,Math.round(size*.22),s);text(tile,h.registry,x,Math.round(size*.40),s);text(tile,'NO STEP',x,Math.round(size*.58),s);text(tile,'SERVICE',x,Math.round(size*.74),s);
 }
 return tile;
}
/** One opaque PBR atlas for eight functional finishes. Mips are filtered per
 * cell, with a 1/8 UV guard and a minimum cell size of eight pixels. */
export function shipSurfaceAtlas(plan,{size=128,roughness=.5,finish='silver',wear=plan.service?.age??.35}={}){
 size=Math.min(256,Math.max(64,size));if(!Number.isInteger(size)||(size&(size-1)))throw Error('Ship atlas cell size must be a power of two');const tiles=SHIP_ZONES.map(zone=>zoneTile(plan,zone,size,roughness,finish,wear)),chains=tiles.map(filteredMips),levels=[];
 for(let level=0;level<chains[0].length&&chains[0][level].width>=8;level++){
  const n=chains[0][level].width,out={width:n*4,height:n*2};for(const key of ['color','normal','surface','masks'])out[key]=new Uint8Array(out.width*out.height*4);
  for(let z=0;z<8;z++)for(const key of ['color','normal','surface','masks'])for(let y=0;y<n;y++)out[key].set(chains[z][level][key].subarray(y*n*4,(y+1)*n*4),((Math.floor(z/4)*n+y)*out.width+(z%4)*n)*4);
  levels.push(out);
 }
 const maps={...levels[0],size:levels[0].width,recipe:{tileMeters:2,seed:String(plan.seed),preset:'ship-atlas'}},material=hullMaterial(maps,levels);material.name='Spacecraft functional surfaces';material.vertexColors=true;material.normalScale.set(.6,.6);
 for(const t of material.userData.textures)t.wrapS=t.wrapT=T.ClampToEdgeWrapping;
 const zones=Object.fromEntries(SHIP_ZONES.map((zone,index)=>[zone,{material,zone,index}]));return{material,zones,levels,size,tiles};
}
export function mapShipSurface(geometry,surface,{tint=1}={}){
 const uv=geometry.attributes.uv,slot=surface.index,col=slot%4,row=Math.floor(slot/4),rect=surface.rect||[0,0,1,1];
 for(let i=0;i<uv.count;i++)uv.setXY(i,(col+.125+(rect[0]+clamp(uv.getX(i))*rect[2])*.75)/4,(row+.125+(rect[1]+clamp(uv.getY(i))*rect[3])*.75)/2);
 geometry.setAttribute('uv1',uv.clone());const color=new Float32Array(geometry.attributes.position.count*3);color.fill(tint);geometry.setAttribute('color',new T.BufferAttribute(color,3));return geometry;
}
