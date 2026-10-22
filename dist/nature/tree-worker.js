import {generateTree} from './tree-model.js?v=growth-v3';
import {buildBranchMesh} from './branch-mesh.js?v=growth-v3';
const cache=new Map();
self.onmessage=({data:{id,options,tileSize,trunkOnly}})=>{try{const key=JSON.stringify(options);let tree=cache.get(key);if(!tree){tree=generateTree(options);cache.set(key,tree);if(cache.size>4)cache.delete(cache.keys().next().value);}const meshes=[0,1,2].map(detail=>buildBranchMesh(tree,{detail,tileSize,trunkOnly}));self.postMessage({id,tree,meshes},meshes.flatMap(m=>[m.positions.buffer,m.normals.buffer,m.uvs.buffer,m.ages.buffer,m.scars.buffer,m.indices.buffer]));}catch(error){self.postMessage({id,error:error.message});}};
