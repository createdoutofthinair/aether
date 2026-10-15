import {createTerrainDomain} from '../../domain/terrain.js';
import {validateTilePayload} from '../../domain/render-contracts.js';
import {world,environment,climate,province} from '../../domain/world.js';
// Phase-3 proof geometry only: no streaming, erosion workers, LOD or scan maps.
export function previewTile(epoch=0,cells=48){
 if(!Number.isInteger(cells)||cells<2||cells>128)throw RangeError('Invalid preview subdivision');
 const domain=createTerrainDomain({world,environment,climate,province,planetAt:()=>null,referenceAt:()=>null,regionAt:()=>null,regionHeight:()=>0,regionDirection:()=>({x:0,y:1,z:0})});
 const center=domain.basinDirection(700,250),origin=center.clone().multiplyScalar(domain.R+domain.height(center)),frame=domain.basis(center),positions=new Float32Array((cells+1)**2*3),indices=new Uint16Array(cells*cells*6);
 for(let y=0;y<=cells;y++)for(let x=0;x<=cells;x++){
 const direction=domain.basinDirection(700+(x/cells-.5)*1800,250+(y/cells-.5)*1800),point=direction.multiplyScalar(domain.R+domain.height(direction));
 const delta={x:point.x-origin.x,y:point.y-origin.y,z:point.z-origin.z},i=(y*(cells+1)+x)*3;
 positions[i]=frame.east.dot(delta);positions[i+1]=center.dot(delta);positions[i+2]=-frame.north.dot(delta);
 }
 let k=0;for(let y=0;y<cells;y++)for(let x=0;x<cells;x++){const a=y*(cells+1)+x,b=a+cells+1;indices.set([a,a+1,b,a+1,b+1,b],k);k+=6;}
 return validateTilePayload({schema:1,epoch,id:'preview/landing',origin:origin.toArray(),positions,indices});
}
