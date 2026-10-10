// Deterministic tileable procedural moss and lichen. These are generated maps,
// not photographic scans. Heights drive both tangent normals and packed height.
export function createGrowthMaterial(T,kind='moss',seed=17,size=256){
 const fract=x=>x-Math.floor(x),lerp=(a,b,t)=>a+(b-a)*t;
 function hash(x,y){let h=Math.imul(x+seed,374761393)^Math.imul(y+seed*7,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;}
 function noise(u,v,n){const x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y),a=fx*fx*(3-2*fx),b=fy*fy*(3-2*fy),h=(dx,dy)=>hash(((ix+dx)%n+n)%n,((iy+dy)%n+n)%n);return lerp(lerp(h(0,0),h(1,0),a),lerp(h(0,1),h(1,1),a),b);}
 const color=new Uint8Array(size*size*4),normal=new Uint8Array(color.length),surface=new Uint8Array(color.length),heights=new Float32Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,k=i*4,u=x/size,v=y/size,warp=noise(u,v,4)*.15;
  let field=0,weight=.5;for(let octave=0;octave<6;octave++){field+=weight*noise(u+warp,v-warp,2**(octave+2));weight*=.5;}
  const grain=hash(x,y),fibres=Math.pow(noise(u,v,64),3),lichen=kind==='lichen';
  heights[i]=lichen?.003*field+.002*grain:.012*field+.003*fibres+.0008*grain;
  const tint=lichen?[.40,.43,.23]:[.10,.22,.065],brightness=.55+field*.8+grain*.1;
  // Store linear palette in sRGB bytes, matching the renderer's colour textures.
  const srgb=c=>c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055;
  color.set(tint.map(c=>Math.round(255*srgb(Math.min(1,c*brightness)))).concat(255),k);
  surface.set([Math.round((lichen?.85:.92)*255),Math.round((.72+.28*field)*255),Math.round(Math.min(1,heights[i]/.018)*255),255],k);
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const k=(y*size+x)*4,dx=(heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size])*size/2,dy=(heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x])*size/2,len=Math.hypot(dx,dy,1);normal.set([Math.round((.5-dx/len*.5)*255),Math.round((.5-dy/len*.5)*255),Math.round((.5+.5/len)*255),255],k);}
 const make=(data,isColor=false)=>{const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.colorSpace=isColor?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;};return{color:make(color,true),normal:make(normal),surface:make(surface)};
}
