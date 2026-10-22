// Pure deterministic material baker. The same maps drive every PBR channel.
export const PRESETS={
 armor:{name:'Painted alloy armor',substrate:'#9aa4ac',paint:'#b6bfc5',paintCoverage:.96,roughness:.48,wear:.22,panels:4,seam:.006,grain:.16,heat:0,foil:0,ceramic:0},
 alloy:{name:'Machined titanium',substrate:'#a4a7ad',paint:'#394956',paintCoverage:.08,roughness:.36,wear:.12,panels:3,seam:.004,grain:.3,heat:0,foil:0,ceramic:0},
 ceramic:{name:'Ceramic thermal protection',substrate:'#55575b',paint:'#d4d0c1',paintCoverage:1,roughness:.78,wear:.14,panels:8,seam:.009,grain:.22,heat:.22,foil:0,ceramic:1},
 insulation:{name:'Multilayer insulation',substrate:'#b89443',paint:'#242932',paintCoverage:0,roughness:.43,wear:.08,panels:3,seam:.008,grain:.4,heat:0,foil:1,ceramic:0},
 engine:{name:'Heat-cycled engine alloy',substrate:'#8b8990',paint:'#343c48',paintCoverage:.04,roughness:.5,wear:.25,panels:3,seam:.005,grain:.26,heat:.8,foil:0,ceramic:0}
};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function seedHash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const hash=(x,y,s)=>{let n=Math.imul(x^s,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255);
export function recipe(input={}){
 const preset=Object.hasOwn(PRESETS,input.preset)?input.preset:'armor',base=PRESETS[preset],r={...base,preset,version:1,seed:String(input.seed??'AETHER-HULL-001').slice(0,100),environment:'deep-space',markings:true,tileMeters:2,bitmapMix:0,...input};
 r.preset=preset;r.version=1;r.seed=String(r.seed).slice(0,100);
 for(const k of ['paintCoverage','roughness','wear','grain','heat','foil','ceramic','bitmapMix'])r[k]=Number.isFinite(+r[k])?clamp(+r[k]):base[k]??0;
 r.panels=Math.round(clamp(+r.panels||4,2,12));r.seam=clamp(+r.seam||.006,.001,.025);r.tileMeters=clamp(+r.tileMeters||2,.25,16);r.markings=r.markings!==false;
 for(const k of ['substrate','paint'])if(!/^#[0-9a-f]{6}$/i.test(r[k]))r[k]=base[k];
 if(!['deep-space','atmospheric','combat','factory'].includes(r.environment))r.environment='deep-space';
 return r;
}
// Build a periodic, staggered panel grammar. Each cell owns a coherent set of
// finish offsets, fasteners and a conditional service hatch; no pixel RNG state.
export function bakeSurface(input={},size=512,bitmaps={}){
 for(const b of Object.values(bitmaps))if(!b||!Number.isInteger(b.width)||!Number.isInteger(b.height)||b.width<1||b.height<1||b.width>2048||b.height>2048||b.data?.length!==b.width*b.height*4)throw Error('Invalid bitmap dimensions or data');
 if(!Number.isInteger(size)||size<32||size>2048||(size&(size-1)))throw Error('Bake size must be a power of two from 32 to 2048');
 const r=recipe(input),n=size,s=seedHash(r.seed),paint=rgb(r.paint),metal=rgb(r.substrate),N=n*n;
 const color=new Uint8Array(N*4),surface=new Uint8Array(N*4),normal=new Uint8Array(N*4),masks=new Uint8Array(N*4),height=new Float32Array(N);
 const freq=r.panels,rows=Math.max(2,Math.round(freq*.75)),periodX=freq*2,periodY=rows*2,wear=r.environment==='factory'?r.wear*.12:r.wear;
 // Seeded unequal plate sizes avoid a repeated brick-wall layout. Boundaries
 // are periodic so adjacent tiles still share a physical seam.
 const cuts=(count,salt)=>{const weights=Array.from({length:count},(_,i)=>.55+hash(i,salt,s)*1.1),sum=weights.reduce((a,b)=>a+b,0),out=[0];for(const w of weights)out.push(out.at(-1)+w/sum);out[count]=1;return out;},ycuts=cuts(rows,73),xcuts=Array.from({length:rows},(_,i)=>cuts(freq,103+i));
 const locate=(cuts,t)=>{let i=0;while(i<cuts.length-2&&t>=cuts[i+1])i++;return i;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=(x+.5)/n,v=(y+.5)/n,row=locate(ycuts,v),col=locate(xcuts[row],u),pw=xcuts[row][col+1]-xcuts[row][col],ph=ycuts[row+1]-ycuts[row],fx=(u-xcuts[row][col])/pw,fy=(v-ycuts[row])/ph;
  const id=hash(col,row,s),edge=Math.min(fx*pw,(1-fx)*pw,fy*ph,(1-fy)*ph)*r.tileMeters,seam=1-clamp((edge-r.seam*.35)/(r.seam*.65));
  const px=Math.floor(u*n),py=Math.floor(v*n),noise=hash(px,py,s),patch=hash(Math.floor(fx*24)+col*24,Math.floor(fy*24)+row*24,s+19);
  // Access panels occur inside selected parent plates, never across their joins.
  const service=id>.48&&!r.ceramic,dx=Math.abs(fx-.51),dy=Math.abs(fy-.5),hatchDist=Math.max((dx-.27)*pw,(dy-.3)*ph,((dx-.27)*pw+(dy-.3)*ph+.025)*.707)*r.tileMeters;
  const hatch=service?1-clamp(Math.abs(hatchDist)/r.seam):0;
  let bolt=0;for(const bx of [.09,.91])for(const by of [.1,.9]){const d=Math.hypot((fx-bx)*pw,(fy-by)*ph)*r.tileMeters;bolt=Math.max(bolt,1-clamp((d-.003)/.004));}
  const edgeWear=clamp(1-Math.min(edge,service?Math.abs(hatchDist):1)/.022)*wear*(.25+patch*.75),chip=edgeWear>noise*.7+.08?1:0;
  const scratchLine=Math.abs(Math.sin((u*79+v*7+id)*Math.PI));const scratch=scratchLine<.022&&patch>.82?wear*.7:0;
  const paintMask=(id<r.paintCoverage?1:0)*(1-chip)*(1-scratch);
  const primer=chip&&patch>.58?1:0;
  const fold=r.foil*(Math.sin(u*Math.PI*periodX*3+Math.sin(v*Math.PI*periodY)*2)*.5+Math.sin(v*Math.PI*periodY*4+Math.sin(u*Math.PI*periodX)*2)*.5);
  const weld=seam*(.5+.5*Math.sin(u*n*.8+v*n*.7));
  const heat=r.heat*clamp(v*.8+patch*.2),scar=r.environment==='combat'&&Math.hypot(u-.64,v-.35)<.12?clamp((.12-Math.hypot(u-.64,v-.35))*8):0;
  const dirt=(r.environment==='atmospheric'?seam*.22+clamp(1-fy)*wear*.1:seam*.045)+scar*.65;
  const vent=service&&id>.72&&fx>.32&&fx<.7&&fy>.35&&fy<.63?1-clamp(Math.abs(((fy-.35)*32)%1-.5)*5):0;
  const rib=id<.26&&!r.ceramic&&!r.foil&&fy>.12&&fy<.86?1-clamp(Math.abs(fx-.8)*pw*r.tileMeters/.018):0;
  const label=r.markings&&id>.48&&fx>.33&&fx<.63&&fy>.78&&fy<.81?1:0;
  const stripe=r.markings&&id>.22&&id<.42&&fx>.12&&fx<.19&&fy>.15&&fy<.85?1:0;
  let rough=r.roughness+(id-.5)*.1+(noise-.5)*r.grain*.22+seam*.16+heat*.12+dirt*.16;
  rough+=vent*.18+rib*.05;if(chip)rough-=.1;if(stripe||label)rough=.56;
  const metallic=clamp((1-paintMask)*(1-r.ceramic)*(1-primer)*(1-stripe)*(1-label)*(1-dirt));
  const h=.52-seam*.2-hatch*.12-vent*.12+rib*.08-(service&&hatchDist<0?.022:0)+bolt*.12+paintMask*.012+fold*.12+(noise-.5)*r.grain*.018-wear*chip*.012+weld*.015;
  const i=(y*n+x)*4;height[y*n+x]=h;
  for(let c=0;c<3;c++){let a=metal[c]*(1-paintMask)+paint[c]*paintMask;a*=1+(id-.5)*.15;a*=1-dirt*.65-seam*.18-hatch*.2-vent*.5;if(label)a=.12;if(primer)a=[.29,.31,.27][c];if(stripe)a=[.8,.37,.08][c];a=a*(1-heat*.25)+[.22,.15,.26][c]*heat*.18;color[i+c]=Math.round(clamp(a)*255);}
  color[i+3]=255;surface.set([Math.round(clamp(1-seam*.5-hatch*.3-vent*.25)*255),Math.round(clamp(rough,.18,.98)*255),Math.round(metallic*255),Math.round(clamp(h)*255)],i);
  masks.set([Math.round(paintMask*255),Math.round(Math.max(chip,scratch)*255),Math.round(Math.max(seam,hatch,vent)*255),Math.round(heat*255)],i);
 }
 // Periodic central differences keep normals continuous across repeated tiles.
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,dx=(height[y*n+(x+1)%n]-height[y*n+(x+n-1)%n])*n*.014/r.tileMeters,dy=(height[((y+1)%n)*n+x]-height[((y+n-1)%n)*n+x])*n*.014/r.tileMeters,l=Math.hypot(dx,dy,1);normal.set([Math.round((-dx/l*.5+.5)*255),Math.round((-dy/l*.5+.5)*255),Math.round((1/l*.5+.5)*255),255],i);}
 // Optional bitmap layers use the same blend weight across PBR channels.
 const mix=r.bitmapMix;
 if(mix>0&&bitmaps.height?.data){
  const b=bitmaps.height,m=bitmaps.mask;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,j=(Math.floor(y/n*b.height)*b.width+Math.floor(x/n*b.width))*4,mask=m?m.data[(Math.floor(y/n*m.height)*m.width+Math.floor(x/n*m.width))*4]/255:1;height[i]=height[i]*(1-mix*mask)+b.data[j]/255*mix*mask;}
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,dx=(height[y*n+(x+1)%n]-height[y*n+(x+n-1)%n])*n*.014/r.tileMeters,dy=(height[((y+1)%n)*n+x]-height[((y+n-1)%n)*n+x])*n*.014/r.tileMeters,l=Math.hypot(dx,dy,1);normal.set([Math.round((-dx/l*.5+.5)*255),Math.round((-dy/l*.5+.5)*255),Math.round((1/l*.5+.5)*255),255],i);}
 }
 for(let y=0;mix>0&&y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4,read=(key)=>{const b=bitmaps[key];if(!b?.data||!b.width||!b.height)return null;const j=(Math.floor(y/n*b.height)*b.width+Math.floor(x/n*b.width))*4;return b.data.subarray(j,j+4);};
  const mask=read('mask'),w=mix*(mask?mask[0]/255:1),c=read('color'),sn=read('normal');
  if(c)for(let k=0;k<3;k++)color[i+k]=Math.round(color[i+k]*(1-w)+c[k]*w);
  for(const [key,ch]of [['ao',0],['roughness',1],['metallic',2],['height',3]]){const b=read(key);if(b)surface[i+ch]=Math.round(surface[i+ch]*(1-w)+b[0]*w);}
  if(sn){ // Reoriented normal mapping: preserve base panel relief.
   const t=[normal[i]/127.5-1,normal[i+1]/127.5-1,normal[i+2]/127.5],u=[-(sn[0]/127.5-1)*w,-(sn[1]/127.5-1)*w,1+(sn[2]/127.5-2)*w],d=t.reduce((a,v,k)=>a+v*u[k],0)/Math.max(t[2],1e-5),v=t.map((a,k)=>a*d-u[k]),l=Math.hypot(...v);for(let k=0;k<3;k++)normal[i+k]=Math.round(clamp(v[k]/l*.5+.5)*255);
  }
 }
 return{size:n,recipe:r,color,surface,normal,masks};
}
// Explicit mip chain: average tangent normals, then transfer unresolved normal
// variance to roughness (Toksvig-style approximation). Surface layout is ORM+H.
export function filteredMips(maps){
 const levels=[{width:maps.size,height:maps.size,color:maps.color,normal:maps.normal,surface:maps.surface,masks:maps.masks}];
 while(levels.at(-1).width>1){const p=levels.at(-1),w=Math.max(1,Math.floor(p.width/2)),q={width:w,height:w};for(const k of ['color','normal','surface','masks'])q[k]=new Uint8Array(w*w*4);
 for(let y=0;y<w;y++)for(let x=0;x<w;x++){const j=(y*w+x)*4,ids=[0,1,2,3].map(k=>((y*2+(k>>1))*p.width+x*2+(k%2))*4);let nx=0,ny=0,nz=0,rr=0;
 for(const i of ids){nx+=p.normal[i]/127.5-1;ny+=p.normal[i+1]/127.5-1;nz+=p.normal[i+2]/127.5-1;rr+=(p.surface[i+1]/255)**2/4;}nx/=4;ny/=4;nz/=4;const len=Math.hypot(nx,ny,nz),variance=Math.max(0,1-Math.min(1,len));
 for(const k of ['color','surface','masks'])for(let c=0;c<4;c++){if(k==='color'&&c<3){const toLinear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;},v=ids.reduce((a,i)=>a+toLinear(p[k][i+c]),0)/4;q[k][j+c]=Math.round(255*(v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055));}else q[k][j+c]=Math.round(ids.reduce((a,i)=>a+p[k][i+c],0)/4);}
 q.surface[j+1]=Math.round(clamp(Math.sqrt(rr+variance),.18,.98)*255);
 const l=Math.max(len,1e-6);q.normal.set([Math.round((nx/l*.5+.5)*255),Math.round((ny/l*.5+.5)*255),Math.round((nz/l*.5+.5)*255),255],j);
 }levels.push(q);}return levels;
}
