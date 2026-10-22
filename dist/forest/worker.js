import {generateTree} from '../nature/tree-model.js';
import {buildBranchMesh} from '../nature/branch-mesh.js';
import {species,leafMesh} from '../nature/leaf-model.js';
import {bakeLeaf} from '../nature/leaf-bake.js';
import {bakeWood} from '../nature/wood-model.js';
import {SPECIES,scatterForest} from './ecology.js';
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function foliage(tree,rows,cols){const p=species[tree.species],positions=[],normals=[],uvs=[],indices=[];
 const blade=leafMesh(p,tree.seed,rows,cols,.3);
 for(const a of tree.attachments){const d=a.direction,ref=Math.abs(d[1])>.95?[1,0,0]:[0,1,0],n=cross(d,ref),len=Math.hypot(...n);for(let k=0;k<3;k++)n[k]/=len;const b=cross(n,d),c=Math.cos(a.roll),s=Math.sin(a.roll),right=n.map((v,k)=>v*c+b[k]*s),front=b.map((v,k)=>v*c-n[k]*s),base=positions.length/3;
 for(let i=0;i<blade.positions.length;i+=3){const [x,y,z]=blade.positions.slice(i,i+3),lift=y+p.length*.5;for(let k=0;k<3;k++){positions.push(a.base[k]+(right[k]*x+d[k]*lift+front[k]*z)*a.scale);normals.push(front[k]);}}
 uvs.push(...blade.uvs);for(const index of blade.indices)indices.push(base+index);
 }return{positions:new Float32Array(positions),normals:new Float32Array(normals),uvs:new Float32Array(uvs),indices:new Uint32Array(indices)};
}
self.onmessage=({data})=>{try{if(data.type==='scatter'){self.postMessage({id:data.id,type:'scatter',layout:scatterForest(data.options)});return;}
 const variant=data.variant,key=SPECIES[Math.floor(variant/3)],age=variant%3,tree=generateTree({species:key,seed:data.seed+variant*997,height:4.5+age*1.25,levels:3,density:1.6,leafScale:1.6,maturity:.4+age*.25,crown:.8+age*.16,competition:.8,habit:age===2?'open':'woodland'});
 const lods=[0,1,2].map((detail)=>({bark:buildBranchMesh(tree,{detail,tileSize:.5}),leaves:foliage(tree,...[[4,4],[2,2],[2,1]][detail])}));
 const bark=bakeWood({seed:data.seed+variant,type:key,size:256,fissures:.7,grain:1,weather:.3}),transfers=[];
 for(const lod of lods)for(const part of Object.values(lod))for(const [k,a]of Object.entries(part))if(ArrayBuffer.isView(a))transfers.push(a.buffer);
 const leaf=bakeLeaf({key,seed:data.seed+variant,age:.08,size:128});transfers.push(bark.color,bark.normal,bark.packed,leaf.color,leaf.normal,leaf.packed);self.postMessage({id:data.id,type:'variant',variant,species:key,height:tree.height,lods,bark,leaf},[...new Set(transfers)]);
 }catch(e){self.postMessage({id:data.id,error:e.message});}};
