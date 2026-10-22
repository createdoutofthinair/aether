// Tileable, seeded value noise; authoring work runs only when a recipe changes.
const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
function hash(x,y,seed){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(seed,1442695041);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function noise(u,v,nx,ny,seed){const x=fract(u)*nx,y=fract(v)*ny,ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y),sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);return mix(mix(hash(ix,iy,seed),hash((ix+1)%nx,iy,seed),sx),mix(hash(ix,(iy+1)%ny,seed),hash((ix+1)%nx,(iy+1)%ny,seed),sx),sy);}
export function woodHeight(u,v,{seed=481,type='oak',fissures=.65,grain=1}={}){
 const warp=(noise(u,v,7,5,seed)-.5)*.09;
 const n=noise(u+warp,v,38,4,seed+2),fine=noise(u+warp*.4,v,160,13,seed+7);
 let h;
 if(type==='birch'){const peel=noise(u,v,9,55,seed+4),slit=Math.pow(Math.max(0,(peel-.57)/.43),3);h=.6+noise(u,v,18,9,seed)*.12-slit*fissures*.7+(fine-.5)*.05*grain;}
 else if(type==='cut'){const r=Math.hypot(u-.5,v-.5),angle=Math.atan2(v-.5,u-.5);const rings=Math.sin(r*230+noise(u,v,8,8,seed)*3+Math.sin(angle*5)*.6);h=.53+rings*.045*grain+(fine-.5)*.04;}
 else{const crack=Math.pow(Math.max(0,1-n*2.4),2),flakes=noise(u+warp*.25,v,86,27,seed+12),microRidge=noise(u,v,310,85,seed+19); const plates=type==='pine'?Math.pow(Math.max(0,(.38-noise(u,v,10,26,seed+31))/.38),3)*fissures*.22:0;h=.48+n*.28-crack*fissures*.6-plates+(fine-.5)*.17*grain+(flakes-.5)*.14+(microRidge-.5)*.045*grain;}
 return Math.max(0,Math.min(1,h));
}
export function bakeWood(options={}){
 const {size=1024,type='oak',weather=.3,grain=1,seed=481}=options;
 const h=new Float32Array(size*size),color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),packed=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)h[y*size+x]=woodHeight(x/size,y/size,options);
 const base=type==='birch'?[178,174,155]:type==='cut'?[154,112,65]:type==='pine'?[110,72,42]:[91,76,56];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const i=y*size+x,k=i*4,H=h[i],patch=noise(x/size,y/size,12,12,seed+20),micro=noise(x/size,y/size,240,240,seed+9);
 const shade=type==='birch'?.35+H: .48+H*.85;
 for(let c=0;c<3;c++){const dry=base[c]*(1-weather*.32)+[117,113,101][c]*weather*.32;color[k+c]=Math.max(0,Math.min(255,dry*shade+(patch-.5)*14+(micro-.5)*5*grain));}color[k+3]=255;
 const gx=(h[y*size+(x+1)%size]-h[y*size+(x+size-1)%size])*size/128,gy=(h[((y+1)%size)*size+x]-h[((y+size-1)%size)*size+x])*size/128,len=Math.hypot(gx,gy,1);
 normal.set([(-gx/len*.5+.5)*255,(-gy/len*.5+.5)*255,(1/len*.5+.5)*255,255],k);
 packed.set([(Math.min(1,.58+H*.6))*255,Math.min(.98,(type==='cut'?.52:.76)+weather*.12+(micro-.5)*.1)*255,H*255,255],k);
 }
 return {size,color:color.buffer,normal:normal.buffer,packed:packed.buffer};
}
