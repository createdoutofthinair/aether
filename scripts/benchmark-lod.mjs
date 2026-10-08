// CPU-only workload; these timings are not end-to-end GPU FPS.
import * as T from '../dist/vendor/three.module.js';
import {PlanetTerrain} from '../dist/terrain.js';
const terrain=new PlanetTerrain(new T.Group(),new T.MeshStandardMaterial()),nodes=[];let moving;
for(let y=90;y<97;y++)for(let x=80;x<87;x++){
 const parent=terrain.node(4,7,x,y);terrain.build(parent);const children=[];
 for(let j=0;j<2;j++)for(let i=0;i<2;i++){const n=terrain.node(4,8,x*2+i,y*2+j);terrain.build(n);children.push(n);nodes.push(n);}
 if(x===83&&y===93)moving={parent,children};
}
terrain.active=nodes;terrain.stitchEdges();for(const n of moving.children)terrain.prepareMorph(n,moving.parent);terrain.stitchEdges();
const versions=()=>nodes.reduce((sum,n)=>sum+Object.values(n.mesh.geometry.attributes).reduce((a,b)=>a+b.version,0),0);
const old=versions(),times=[];for(let i=0;i<30;i++){const start=performance.now();terrain.advance(1/120);times.push(performance.now()-start);}
times.sort((a,b)=>a-b);console.log(JSON.stringify({patches:nodes.length,movingPatches:moving.children.length,medianCpuMs:+times[15].toFixed(3),attributeUpdates:versions()-old,frames:30}));
