import {gaussianize} from './stochastic-material.js?v=terrain-7';
export async function prepareStochasticMaterials(T,textures){
 const lutData=new Float32Array(256*3*4);let worker;
 try{try{worker=typeof Worker!=='undefined'?new Worker(new URL('./material-worker.js?v=terrain-7',import.meta.url),{type:'module'}):null;}catch(error){console.warn('Material worker unavailable; preparing locally.',error.message);}
  for(const [row,key]of ['rock','sand','mud'].entries()){
   const source=textures[key],image=source.image,canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height).data;
   let data;
   if(worker){try{data=await new Promise((resolve,reject)=>{worker.onmessage=({data})=>data.error?reject(Error(data.error)):resolve(data.result);worker.onerror=e=>reject(Error(e.message));worker.postMessage({pixels},[pixels.buffer]);});}catch(error){console.warn('Material worker failed; preparing locally.',error.message);worker.terminate();worker=null;data=gaussianize(ctx.getImageData(0,0,image.width,image.height).data);}}
   else data=gaussianize(pixels);
   const texture=new T.DataTexture(data.encoded,image.width,image.height,T.RGBAFormat);texture.colorSpace=T.NoColorSpace;texture.flipY=true;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.anisotropy=source.anisotropy;texture.needsUpdate=true;textures[key+'Gaussian']=texture;lutData.set(data.inverse,row*256*4);
  }
 }finally{worker?.terminate();}
 // Half-float inverse values avoid quantizing dark linear albedo into 8 bits.
 const half=new Uint16Array(lutData.length);for(let i=0;i<half.length;i++)half[i]=T.DataUtils.toHalfFloat(lutData[i]);
 const lut=new T.DataTexture(half,256,3,T.RGBAFormat,T.HalfFloatType);lut.minFilter=lut.magFilter=T.LinearFilter;lut.needsUpdate=true;textures.histogram=lut;
 return textures;
}
export function createSnowMaterial(T){
 // Dedicated snow/firn maps: millimetre grain plus centimetre crust. Height and
 // normals come from the same deterministic field; snow is not tinted rock.
 const n=256,h=new Float32Array(n*n),surface=new Uint8Array(n*n*4),normal=new Uint8Array(n*n*4),color=new Uint8Array(n*n*4);
 const hash=(x,y)=>{let v=Math.imul(x,374761393)^Math.imul(y,668265263);v=Math.imul(v^(v>>>13),1274126177);return((v^(v>>>16))>>>0)/4294967295;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)h[y*n+x]=.0015*hash(x,y)+.006*Math.sin(x/n*Math.PI*8+.35*Math.sin(y/n*Math.PI*4));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const k=(y*n+x)*4,grain=hash(x,y),dx=(h[y*n+(x+1)%n]-h[y*n+(x+n-1)%n])/(8/n),dy=(h[((y+1)%n)*n+x]-h[((y+n-1)%n)*n+x])/(8/n),len=Math.hypot(dx,dy,1);normal.set([Math.round((.5-dx/len*.5)*255),Math.round((.5-dy/len*.5)*255),Math.round((.5+.5/len)*255),255],k);surface.set([Math.round((.78+.18*grain)*255),255,Math.round(Math.max(0,Math.min(1,h[y*n+x]/.02+.5))*255),255],k);color.set([Math.round((.82+.05*grain)*255),Math.round((.86+.04*grain)*255),Math.round((.90+.03*grain)*255),255],k);}
 const make=data=>{const t=new T.DataTexture(data,n,n,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;};return{snow:make(color),snowNormal:make(normal),snowSurface:make(surface)};
}
