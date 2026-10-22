import assert from 'node:assert/strict';
import {generateTree} from '../dist/nature/tree-model.js';
import * as T from 'three/webgpu';
for(const species of ['birch','oak','willow']){
 const options={species,seed:481},tree=generateTree(options);assert.deepEqual(tree,generateTree(options));assert.notDeepEqual(tree,generateTree({...options,seed:482}));
 assert.ok(tree.attachments.length>1000&&tree.attachments.length<=6000);
 for(const a of tree.attachments){const point=new T.Vector3(...a.anchor);let nearest=Infinity;for(const seg of tree.segments.filter(s=>s.id===a.branch)){const line=new T.Line3(new T.Vector3(...seg.start),new T.Vector3(...seg.end));nearest=Math.min(nearest,line.closestPointToPoint(point,true,new T.Vector3()).distanceTo(point));}assert.ok(nearest<1e-9,'Stalk anchor must lie on its actual parent twig');assert.ok(Math.abs(new T.Vector3(...a.direction).length()-1)<1e-9);assert.ok(a.scale>0);}
 assert.equal(generateTree({...options,density:0}).attachments.length,0);
 assert.ok(generateTree({...options,levels:4,density:4}).attachments.length<=6000);
}
assert.notDeepEqual(generateTree({species:'oak'}).segments,generateTree({species:'willow'}).segments);
console.log('Trees: deterministic species architecture, finite bounded foliage and exact twig attachment frames passed');
