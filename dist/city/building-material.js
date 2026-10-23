// Building-specific material synthesis. No photographs, fetched maps or renderer.
// Periodic quintic gradient noise + fBm/domain warp; correlated physical layers.
import {seedHash} from '../hull/surface.js';
export const BUILDING_MATERIAL_SCHEMA='aether.building-material/1';
export const BUILDING_FINISH_KEY='aether.building-finish.v1';
export const BUILDING_ZONES=['Ceramic shell','Structural frame','Service panels','Mineral base','Roof membrane','Armor / repair','Accent panels','Identity trim'];
export const BUILDING_PROFILES={
 ceramic:{label:'Glazed ceramic composite',color:'#c6c7ba',roughness:.4,substrate:[.26,.28,.27],metal:0,pore:.12},
 concrete:{label:'Architectural mineral concrete',color:'#a7a99f',roughness:.78,substrate:[.34,.35,.32],metal:0,pore:1},
 alloy:{label:'Brushed structural aluminum',color:'#7e9296',roughness:.33,substrate:[.43,.49,.51],metal:1,pore:.08},
 steel:{label:'Coated steel / exposed substrate',color:'#65777b',roughness:.48,substrate:[.24,.27,.29],metal:1,pore:.13},
 basalt:{label:'Sintered basalt aggregate',color:'#525c5c',roughness:.75,substrate:[.13,.16,.17],metal:0,pore:.7},
 polymer:{label:'Coated composite / roof membrane',color:'#697b79',roughness:.58,substrate:[.18,.21,.2],metal:0,pore:.2}
};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,mod=(v,n)=>(v%n+n)%n,fade=t=>t*t*t*(t*(t*6-15)+10),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);},linear=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4,srgb=c=>c<=.0031308?c*12.92:1.055*c**(1/2.4)-.055;
const number=(v,d,a=0,b=1)=>Number.isFinite(Number(v))?clamp(Number(v),a,b):d;
export function buildingZone(profile='ceramic',overrides={}){const p=BUILDING_PROFILES[profile]||BUILDING_PROFILES.ceramic;return{profile:BUILDING_PROFILES[profile]?profile:'ceramic',color:p.color,roughness:p.roughness,panelsX:1,panelsY:2,grain:.45,relief:1,wear:.28,chips:.3,grime:.35,streaks:.42,oxidation:.25,deposits:.22,...overrides};}
export function buildingMaterialRecipe(input={}){
 if(input.schema!==undefined&&input.schema!==BUILDING_MATERIAL_SCHEMA)throw Error('Unsupported building material recipe');
 if(input.zones!==undefined&&(!Array.isArray(input.zones)||input.zones.length!==8))throw Error('A building material needs eight finish zones');
 const defaults=['ceramic','alloy','steel','concrete','polymer','ceramic','ceramic','alloy'];
 const zones=defaults.map((p,i)=>{const raw=input.zones?.[i]||buildingZone(p),base=buildingZone(raw.profile);const z={...base};z.profile=BUILDING_PROFILES[raw.profile]?raw.profile:base.profile;z.color=/^#[\da-f]{6}$/i.test(raw.color||'')?raw.color:base.color;for(const k of ['roughness','grain','wear','chips','grime','streaks','oxidation','deposits'])z[k]=number(raw[k],base[k]);z.roughness=clamp(z.roughness,.16,.96);z.relief=number(raw.relief,1,0,2);for(const k of ['panelsX','panelsY'])z[k]=Math.round(number(raw[k],base[k],1,4));return z;});
 if(!input.zones){zones[2].color='#526467';zones[4].color='#64716c';zones[6].color='#739a9b';zones[7].color='#bda87e';}
 const w=input.weather||{};return{schema:BUILDING_MATERIAL_SCHEMA,seed:String(input.seed||'AURELIA-AGED-01').slice(0,100),resolution:input.resolution===1024?1024:512,tileMeters:2,zones,weather:{rain:number(w.rain,.35),dust:number(w.dust,.2),wetness:number(w.wetness,0),biology:number(w.biology,.08)}};
}
export function buildingMaterialPreset(id='inhabited',seed='AURELIA-AGED-01'){
 const r=buildingMaterialRecipe({seed});const presets={new:[.06,.12,.08,.03],inhabited:[.28,.35,.42,.22],industrial:[.65,.7,.7,.55],desert:[.42,.58,.06,.5],coastal:[.45,.4,.75,.65]};const [wear,grime,streaks,deposits]=presets[id]||presets.inhabited;
 r.zones=r.zones.map(z=>({...z,wear,grime,streaks,deposits}));r.weather=id==='desert'?{rain:.04,dust:.75,wetness:0,biology:0}:id==='coastal'?{rain:.75,dust:.1,wetness:.18,biology:.22}:id==='industrial'?{rain:.5,dust:.4,wetness:.05,biology:.05}:id==='new'?{rain:.08,dust:.04,wetness:0,biology:0}:r.weather;return r;
}
export function periodicBuildingNoise(seed){
 const hash=(x,y)=>{let h=Math.imul(x^seed,374761393)^Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return(h^(h>>>16))>>>0;};
 const gradients=[[1,0],[-1,0],[0,1],[0,-1],[.7071,.7071],[-.7071,.7071],[.7071,-.7071],[-.7071,-.7071]];
 return(u,v,fx=4,fy=fx)=>{const x=u*fx,y=v*fy,ix=Math.floor(x),iy=Math.floor(y),dx=x-ix,dy=y-iy,g=(a,b,px,py)=>{const n=gradients[hash(mod(a,fx),mod(b,fy))&7];return n[0]*px+n[1]*py;};return clamp(.5+.75*mix(mix(g(ix,iy,dx,dy),g(ix+1,iy,dx-1,dy),fade(dx)),mix(g(ix,iy+1,dx,dy-1),g(ix+1,iy+1,dx-1,dy-1),fade(dx)),fade(dy)));};
}
export function bakeBuildingMaterial(recipe,zoneIndex=0,size=recipe.resolution||512){
 if(!Number.isInteger(size)||size<64||size>1024||(size&(size-1)))throw Error('Building material size must be a power of two from 64 to 1024');
 if(!Number.isInteger(zoneIndex)||zoneIndex<0||zoneIndex>7)throw Error('Unknown building finish zone');
 const r=buildingMaterialRecipe(recipe),z=r.zones[zoneIndex],p=BUILDING_PROFILES[z.profile],n=size,N=n*n,guard=n/8,core=n*.75,rawNoise=periodicBuildingNoise(seedHash(r.seed+':'+zoneIndex)),noise=(u,v,fx=4,fy=fx)=>{const weight=1-smooth(core*.18,core*.45,Math.max(fx,fy));return weight>0?mix(.5,rawNoise(u,v,fx,fy),weight):.5;},
 color=new Uint8Array(N*4),normal=new Uint8Array(N*4),surface=new Uint8Array(N*4),masks=new Uint8Array(N*4),heights=new Float32Array(N),base=[1,3,5].map(i=>linear(parseInt(z.color.slice(i,i+2),16)/255)),sub=p.substrate.map(linear),rust=(z.profile==='steel'?[.38,.125,.035]:[.52,.55,.5]).map(linear),dust=[.46,.39,.28].map(linear);
 // Sparse sources along upper joints, with finite downstream lengths and
 // texel-filtered tapered Gaussian footprints. Avoid a whole-wall stripe field.
 const sources=Array.from({length:12},(_,i)=>{const rand=k=>(seedHash(r.seed+':trail:'+zoneIndex+':'+i+':'+k)>>>0)/4294967295;return{u:(i+.15+rand(0)*.7)/12,length:.16+rand(1)*.7,width:.0015+rand(2)*.0045,active:rand(3)<.15+z.streaks*.75};});
 const runoff=(u,v)=>{const down=1-v,wander=(noise(u,v,4)-.5)*.006,cell=Math.floor(u*12);let value=0;for(let j=-1;j<=1;j++){const s=sources[mod(cell+j,12)];if(!s.active||down>s.length)continue;const delta=mod(u-s.u+wander+.5,1)-.5,width=Math.max(.75/core,s.width*(.3+.7*(1-down/s.length))),d=delta/width,trail=(Math.exp(-d*d*.5)+Math.exp(-d*d/18)*.09)*(1-smooth(s.length*.65,s.length,down))*Math.exp(-down*1.2);value+=trail;}return clamp(value)*z.streaks*(.25+.75*r.weather.rain);};
 const fbm=(u,v,f)=>noise(u,v,f)*.55+noise(u,v,f*2)*.28+noise(u,v,f*4)*.12+noise(u,v,f*8)*.05;
 let minHeight=Infinity,maxHeight=-Infinity;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=(mod(x-guard,core)+.5)/core,v=(mod(y-guard,core)+.5)/core,px=mod(u*z.panelsX,1),py=mod(v*z.panelsY,1),ex=Math.min(px,1-px)*2/z.panelsX,ey=Math.min(py,1-py)*2/z.panelsY,edge=Math.min(ex,ey),joint=1-smooth(.002,.009,edge),lip=(1-smooth(.009,.022,edge))*(1-joint),
   warp=(noise(u,v,4)-.5)*.035,cloud=fbm(u+warp,v,2),meso=fbm(u-warp,v,8),fine=noise(u,v,128),pores=smooth(.67,.84,noise(u+warp,v,64))*p.pore,
   grain=(noise(u,v,192)-.5)*z.grain,brushing=z.profile==='alloy'?(noise(u,v,192,8)-.5)*.00018:0,
   chip=(1-smooth(.008,.065,edge))*smooth(.42,.65,meso)*z.wear*z.chips,
   exposed=z.profile==='alloy'?1:chip,
   oxide=exposed*z.oxidation*z.wear*smooth(.35,.7,cloud),
   drip=runoff(u,py),
   dirt=clamp(z.grime*(joint*.5+drip*.9+smooth(.43,.73,cloud)*.22),0,.8),deposit=z.deposits*(joint*.38+drip*.55)*(.3+r.weather.rain*.7),
   damp=r.weather.wetness*smooth(.3,.68,cloud),
   h=clamp((-joint*.0019+lip*.0004-pores*.0009*z.grain-chip*.0013+oxide*.0005+deposit*.00018+(meso-.5)*.00022+grain*.00013+brushing)*z.relief,-.011,.011),i=(y*n+x)*4;
  heights[y*n+x]=h;minHeight=Math.min(minHeight,h);maxHeight=Math.max(maxHeight,h);
  for(let c=0;c<3;c++){
   let value=base[c]*(1+(cloud-.5)*.12+(fine-.5)*.014+(noise((Math.floor(u*z.panelsX)+.37)/z.panelsX,(Math.floor(v*z.panelsY)+.19)/z.panelsY,16)-.5)*.12);value=mix(value,sub[c],chip*.9);value=mix(value,rust[c],oxide*.85);value=mix(value,dust[c],deposit*.25);value*=1-dirt*.48;value=mix(value,value*.7,damp);value=mix(value,.52,deposit*.12);color[i+c]=Math.round(clamp(srgb(Math.max(0,value)))*255);
  }
  color[i+3]=255;
  const rough=clamp(z.roughness+(meso-.5)*.16*z.grain+pores*.07+joint*.1+oxide*.24+dirt*.16+deposit*.12-damp*.35,.12,.98),metal=exposed*p.metal*(1-oxide)*(1-dirt*.8)*(1-deposit);
  surface.set([Math.round(clamp(1-joint*.25-pores*.15-chip*.07)*255),Math.round(rough*255),Math.round(clamp(metal)*255),Math.round(clamp(.5+h*40)*255)],i);
  masks.set([Math.round(chip*255),Math.round(dirt*255),Math.round(drip*255),Math.round(deposit*255)],i);
 }
 const at=(x,y)=>heights[(mod(y-guard,core)+guard)*n+mod(x-guard,core)+guard],spacing=2/core;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const dx=(at(x+1,y)-at(x-1,y))/(2*spacing),dy=(at(x,y+1)-at(x,y-1))/(2*spacing),l=Math.hypot(dx,dy,1),i=(y*n+x)*4;normal.set([Math.round((.5-dx/l*.5)*255),Math.round((.5-dy/l*.5)*255),Math.round((.5+.5/l)*255),255],i);}
 return{size:n,color,normal,surface,masks,recipe:{...z,seed:r.seed,tileMeters:2,heightEncoding:'0.5 + metres * 40',maskChannels:['coating loss','grime','runoff','deposits']},stats:{minHeight,maxHeight,texelsPerMeter:core/2}};
}
