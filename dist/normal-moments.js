// Isotropic slope moments. Filter means and second moments separately, then
// recover unresolved variance per mip. This is not anisotropic LEAN mapping.
export function normalMomentMipmaps(pixels,width,height){
 const levels=[];let w=width,h=height,moments=new Float32Array(w*h*4);
 for(let k=0;k<w*h;k++){const z=Math.max(.15,pixels[k*4+2]/127.5-1),x=(pixels[k*4]/127.5-1)/z,y=(pixels[k*4+1]/127.5-1)/z;moments.set([x,y,x*x,y*y],k*4);}
 for(;;){
  const data=new Uint8Array(w*h*4);
  for(let k=0;k<w*h;k++){const x=moments[k*4],y=moments[k*4+1],len=Math.hypot(x,y,1),variance=Math.max(0,moments[k*4+2]+moments[k*4+3]-x*x-y*y);data.set([Math.round((x/len*.5+.5)*255),Math.round((y/len*.5+.5)*255),Math.round((.5+.5/len)*255),Math.round(Math.min(1,Math.sqrt(variance)/4)*255)],k*4);}
  levels.push({data,width:w,height:h});if(w===1&&h===1)break;
  const nw=Math.max(1,w>>1),nh=Math.max(1,h>>1),next=new Float32Array(nw*nh*4);
  for(let y=0;y<nh;y++)for(let x=0;x<nw;x++)for(let c=0;c<4;c++){let sum=0;for(let j=0;j<2;j++)for(let i=0;i<2;i++)sum+=moments[(Math.min(h-1,y*2+j)*w+Math.min(w-1,x*2+i))*4+c];next[(y*nw+x)*4+c]=sum*.25;}
  w=nw;h=nh;moments=next;
 }
 return levels;
}
export async function prepareNormalMoments(T,textures){
 for(const key of ['rn','sn','mn']){
  const source=textures[key],image=source.image,canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const levels=normalMomentMipmaps(ctx.getImageData(0,0,image.width,image.height).data,image.width,image.height),t=new T.DataTexture(levels[0].data,image.width,image.height,T.RGBAFormat);
  t.mipmaps=levels;t.generateMipmaps=false;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.flipY=true;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=source.anisotropy;t.needsUpdate=true;textures[key]=t;source.dispose();
 }
 textures.normalMoments=true;
}
