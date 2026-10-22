import {bakeLeaf} from './leaf-bake.js?v=growth-v3';
export {bakeLeaf} from './leaf-bake.js?v=growth-v3';
self.onmessage=({data})=>{const count=data.variantCount||1,variants=Array.from({length:count},(_,i)=>bakeLeaf({...data,seed:data.seed+i*997}));self.postMessage({...variants[0],variants},variants.flatMap(v=>[v.color,v.normal,v.packed]));};
