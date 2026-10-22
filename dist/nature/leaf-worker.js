import {species,veins,random} from './leaf-model.js?v=growth-v3';
export function bakeLeaf({id,key,seed,age,size=1024}){
 const p=species[key],rnd=random(seed),height=new Float32Array(size*size);
 // Rasterize the shared vascular graph into a height field. Linear data, not sRGB.
 for(const line of veins(p,seed))for(let k=1;k<line.points.length;k++){
 const a=line.points[k-1],b=line.points[k],ax=a[0]*size,ay=a[1]*size,bx=b[0]*size,by=b[1]*size,r=line.radius*size/1024;
 const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy||1,pad=Math.max(2,r*3);
 for(let y=Math.max(0,Math.floor(Math.min(ay,by)-pad));y<Math.min(size,Math.ceil(Math.max(ay,by)+pad));y++)for(let x=Math.max(0,Math.floor(Math.min(ax,bx)-pad));x<Math.min(size,Math.ceil(Math.max(ax,bx)+pad));x++){
 const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/l)),d=(x-ax-t*dx)**2+(y-ay-t*dy)**2;
 height[y*size+x]=Math.max(height[y*size+x],Math.exp(-d/(r*r))*(line.order===0?1:line.order===1?.55:.19));
 }}
 const color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),packed=new Uint8Array(size*size*4);
 const phases=Array.from({length:6},()=>rnd()*10);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const i=y*size+x,v=height[i],u=x/size,t=y/size;
 const broad=Math.sin(u*19+Math.sin(t*13)+phases[0])*Math.sin(t*23+phases[1]);
 const fine=(rnd()-.5),grain=Math.sin(x*.48+Math.sin(y*.37))*Math.sin(y*.53);
 const fleck=Math.max(0,Math.sin(u*79+phases[2])*Math.sin(t*93+phases[3])-.82)*age*180;
 const shade=.91+broad*.085+fine*.045+v*.27;
 const base=p.color;const autumn=[140,91,27];
 for(let c=0;c<3;c++)color[i*4+c]=Math.max(0,Math.min(255,(base[c]*(1-age)+autumn[c]*age)*shade-fleck));color[i*4+3]=255;
 const gx=(height[y*size+Math.min(size-1,x+1)]-height[y*size+Math.max(0,x-1)])*1.5+grain*.018;
 const gy=(height[Math.min(size-1,y+1)*size+x]-height[Math.max(0,y-1)*size+x])*1.5+fine*.025;
 const len=Math.hypot(gx,gy,1);normal.set([(-gx/len*.5+.5)*255,(-gy/len*.5+.5)*255,(1/len*.5+.5)*255,255],i*4);
 // R: diffuse transmission weight, G: roughness, B: vascular height, A: opaque.
 packed.set([(1-v*.76)*(.7-age*.22)*255,(p.roughness+broad*.045+fine*.03+age*.15)*255,v*255,255],i*4);
 }
 return {id,size,color:color.buffer,normal:normal.buffer,packed:packed.buffer};
}
self.onmessage=({data})=>{const count=data.variantCount||1,variants=Array.from({length:count},(_,i)=>bakeLeaf({...data,seed:data.seed+i*997}));self.postMessage({...variants[0],variants},variants.flatMap(v=>[v.color,v.normal,v.packed]));};
