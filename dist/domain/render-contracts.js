// Renderer input records contain numeric data and identities, never GPU handles.
const finite=(v,name)=>{if(!Number.isFinite(v))throw new TypeError(`${name} must be finite`);return v;};
const tuple=(v,name)=>{if(!Array.isArray(v)||v.length!==3)throw new TypeError(`${name} must have three components`);return Object.freeze(v.map(x=>finite(x,name)));};
export function materialDescriptor(input={}){
 const colour=tuple(input.colour??[.42,.32,.22],'linear colour');
 if(colour.some(x=>x<0))throw new RangeError('Negative radiance colour');
 const roughness=finite(input.roughness??.9,'roughness'),metalness=finite(input.metalness??0,'metalness');
 if(roughness<0||roughness>1||metalness<0||metalness>1)throw new RangeError('PBR values must be in [0,1]');
 return Object.freeze({id:String(input.id??'terrain-preview'),colour,roughness,metalness});
}
export function sceneSnapshot({epoch,camera,origin,material}){
 if(!Number.isSafeInteger(epoch)||epoch<0)throw new RangeError('Invalid scene epoch');
 return Object.freeze({schema:1,epoch,origin:tuple(origin,'world origin'),camera:Object.freeze({position:tuple(camera.position,'camera position'),target:tuple(camera.target,'camera target')}),material:materialDescriptor(material)});
}
export function validateTilePayload(tile){
 if(tile.schema!==1||!Number.isSafeInteger(tile.epoch)||tile.epoch<0||typeof tile.id!=='string')throw new TypeError('Invalid tile identity');
 if(!(tile.positions instanceof Float32Array)||tile.positions.length%3||tile.positions.length===0)throw new TypeError('Invalid position buffer');
 if(!(tile.indices instanceof Uint16Array||tile.indices instanceof Uint32Array)||tile.indices.length%3)throw new TypeError('Invalid index buffer');
 if(!tile.positions.every(Number.isFinite)||!tile.indices.every(i=>i<tile.positions.length/3))throw new RangeError('Invalid tile geometry');
 tuple(tile.origin,'tile origin');
 return tile;
}
// Typed arrays are transferred/owned, not frozen: a producer must not mutate a
// payload after installation. Scene control records are immutable copies.
export function assertSceneTileEpoch(snapshot,tile){
 if(snapshot.epoch!==tile.epoch||!snapshot.origin.every((value,i)=>value===tile.origin[i]))throw Error('Stale scene epoch or mismatched origin');
}
