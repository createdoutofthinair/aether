// Renderer-independent deterministic authoring model. Units: metres.
export const species = {
 birch:{name:'Silver birch',latin:'Betula pendula · inspired',length:.085,width:.034,shape:'birch',pairs:9,roughness:.49,color:[65,102,29]},
 oak:{name:'English oak',latin:'Quercus robur · inspired',length:.12,width:.052,shape:'oak',pairs:6,roughness:.57,color:[66,91,28]},
 willow:{name:'White willow',latin:'Salix alba · inspired',length:.14,width:.017,shape:'willow',pairs:15,roughness:.43,color:[72,104,42]}
};
export function random(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function widthAt(t,p,seed=1){
 if(t<=0||t>=1)return 0;
 let w;
 if(p.shape==='oak')w=Math.pow(Math.sin(Math.PI*t),.65)*(.76+.24*Math.cos(t*Math.PI*12-1));
 else if(p.shape==='birch')w=Math.pow(Math.sin(Math.PI*t),.86)*(1.2-.55*t)*(1-.035*(.5+.5*Math.sin(t*180)));
 else w=Math.pow(Math.sin(Math.PI*t),.8)*(1.15-.3*t)*(1-.018*(.5+.5*Math.sin(t*240)));
 return p.width*.5*w*(1+.065*Math.sin(seed*.071))*(1+.022*Math.sin(t*19+seed));
}
export function centerAt(t,p,seed){return p.width*.027*Math.sin(t*5+seed)*Math.sin(Math.PI*t);}
export function surfaceAt(t,s,p,curl=.5,seed=1){return p.length*(curl*.16*t*t+ .07*s*s*Math.sin(Math.PI*t)+.009*Math.sin(t*40+seed)*Math.abs(s));}
export function leafMesh(p,seed=1,rows=64,cols=16,curl=.5){
 const positions=[],uvs=[],indices=[];
 for(let j=0;j<=rows;j++){const t=j/rows,w=widthAt(t,p,seed),c=centerAt(t,p,seed);for(let i=0;i<=cols;i++){const s=2*i/cols-1,x=c+s*w;positions.push(x,(t-.5)*p.length,surfaceAt(t,s,p,curl,seed));uvs.push(.5+x/(p.width*1.4),t);}}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,a+1,b,a+1,b+1,b);}
 return {positions:new Float32Array(positions),uvs:new Float32Array(uvs),indices:new Uint16Array(indices)};
}
export function veins(p,seed=1){
 const rnd=random(seed),lines=[];const uv=(x,t)=>[.5+x/(p.width*1.4),t];
 const mid=[];for(let k=0;k<=32;k++){const t=k/32;mid.push(uv(centerAt(t,p,seed),t));}lines.push({points:mid,radius:2.5,order:0});
 for(let side of [-1,1])for(let j=0;j<p.pairs;j++){
 const base=.07+j*.82/p.pairs+(rnd()-.5)*.02,tip=Math.min(.97,base+.13+(rnd()-.5)*.04),points=[];
 for(let k=0;k<=14;k++){const q=k/14,t=base+(tip-base)*q;points.push(uv(centerAt(t,p,seed)+side*widthAt(tip,p,seed)*q*(1+.12*Math.sin(q*Math.PI)),t));}
 lines.push({points,radius:1.05,order:1});
 for(let k=3;k<13;k+=2){const start=points[k],q=k/14,branches=[];for(let z=0;z<=5;z++){const r=z/5;branches.push([start[0]+side*.05*r*(1-q),start[1]+.042*r]);}lines.push({points:branches,radius:.38,order:2});}
 // Cross connections between adjacent secondaries, reduced at the margin.
 for(let k=4;k<12;k+=3){const a=points[k];lines.push({points:[a,[a[0]+side*.012,a[1]+.03],[a[0]+side*.008,a[1]+.82/p.pairs]],radius:.24,order:3});}
 }
 return lines;
}
export function selectLOD(pixels,previous=0){const thresholds=[280,80,18];let level=pixels>280?0:pixels>80?1:pixels>18?2:3;if(level>previous&&pixels>thresholds[previous]*.9)return previous;if(level<previous&&pixels<thresholds[level]*1.1)return previous;return level;}
