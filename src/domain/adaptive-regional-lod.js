import {RegionalLod,interpolateGrid,REGION_SIZE} from './regional-lod.js';
const neighbors=id=>[id%4? id-1:null,id%4<3?id+1:null,id>=4?id-4:null,id<12?id+4:null].filter(x=>x!==null);
const displayCells=s=>s.transition?Math.max(s.transition.from,s.transition.to):s.current;
const detail=s=>s.transition?Math.log2(s.transition.from)+(Math.log2(s.transition.to)-Math.log2(s.transition.from))*s.transition.time:Math.log2(s.current);
export function balanceTargets(targets){const result=targets.slice();let changed=true;while(changed){changed=false;for(let id=0;id<16;id++)for(const other of neighbors(id))if(result[id]>result[other]*2){result[other]=result[id]/2;changed=true;}}return result;}
export class AdaptiveRegionalLod extends RegionalLod{
 constructor(sample,options={}){super(sample,options);this.states=Array.from({length:16},()=>({current:8,target:8,pending:null,transition:null}));this.errors=[];this.camera=[0,600,1100];this.focalPixels=700;this.frameEpoch=-1;
 for(let id=0;id<16;id++){const tile=this.cache.get(this.key(id,8));let error=0;for(let y=0;y<8;y++)for(let x=0;x<8;x++){const u=(x+.5)/8,v=(y+.5)/8,size=REGION_SIZE/4,actual=sample(-REGION_SIZE/2+(id%4+u)*size,-REGION_SIZE/2+(Math.floor(id/4)+v)*size).position,coarse=interpolateGrid(tile.positions,8,u,v);error=Math.max(error,Math.hypot(...actual.map((n,k)=>n-coarse[k])));}this.errors[id]=Math.max(.01,error);}}
 advanceTile(tile,budget){const count=super.advanceTile(tile,budget);if(tile.ready&&tile.minHeight===undefined){tile.minHeight=Infinity;tile.maxHeight=-Infinity;for(let i=1;i<tile.positions.length;i+=3){tile.minHeight=Math.min(tile.minHeight,tile.positions[i]);tile.maxHeight=Math.max(tile.maxHeight,tile.positions[i]);}}return count;}
 distance(id,camera){const size=REGION_SIZE/4,cx=-REGION_SIZE/2+(id%4+.5)*size,cz=-REGION_SIZE/2+(Math.floor(id/4)+.5)*size,tile=this.cache.get(this.key(id,this.states[id].current));
 return Math.max(1,Math.hypot(Math.max(0,Math.abs(camera[0]-cx)-size/2),Math.max(0,tile.minHeight-camera[1],camera[1]-tile.maxHeight),Math.max(0,Math.abs(camera[2]+cz)-size/2)));}

 update(camera,dt,focalPixels=700){if(!Number.isFinite(dt)||dt<0)throw TypeError('Invalid LOD time step');if(!Array.isArray(camera)||camera.length!==3||!camera.every(Number.isFinite)||!Number.isFinite(focalPixels)||focalPixels<=0)throw TypeError('Invalid adaptive LOD view');this.camera=camera;this.focalPixels=focalPixels;
 const distances=this.states.map((_,id)=>this.distance(id,camera)),targets=this.states.map((state,id)=>{let target=state.current;const pixels=this.errors[id]*focalPixels/distances[id];while(target<64&&pixels*(8/target)**2>2.5)target*=2;while(target>8&&pixels*(8/(target/2))**2<1.5)target/=2;return target;});
 this.projectedErrors=this.errors.map((error,id)=>error*focalPixels/distances[id]);const balanced=balanceTargets(targets);this.queue=[];
 for(let id=0;id<16;id++){const state=this.states[id];state.target=balanced[id];if(state.transition)continue;
 const next=state.target>state.current?state.current*2:state.target<state.current?state.current/2:null;
 if(state.pending!==next){for(const [key,tile]of this.cache)if(tile.id===id&&tile.cells!==state.current)this.cache.delete(key);state.pending=next;}
 if(next!==null){const key=this.key(id,next);let tile=this.cache.get(key);if(!tile){tile=this.startTile(id,next);this.cache.set(key,tile);}if(!tile.ready)this.queue.push(tile);}}
 this.queue.sort((a,b)=>this.errors[b.id]/distances[b.id]-this.errors[a.id]/distances[a.id]||a.id-b.id);let budget=this.samplesPerFrame;
 while(budget>0&&this.queue.length){const tile=this.queue[0];budget-=this.advanceTile(tile,budget);if(tile.ready)this.queue.shift();}
 let changed=false;
 for(let id=0;id<16;id++){const state=this.states[id];if(state.transition){state.transition.time=Math.min(1,state.transition.time+Math.max(0,Math.min(dt,.05))/.45);changed=true;if(state.transition.time===1){state.current=state.transition.to;state.transition=null;state.pending=null;for(const [key,tile]of this.cache)if(tile.id===id&&tile.cells!==state.current)this.cache.delete(key);}continue;}
 if(state.pending===null||!this.cache.get(this.key(id,state.pending))?.ready)continue;
 const next=state.pending,allowed=neighbors(id).every(other=>{const n=this.states[other];return next>state.current?next<=2*(n.transition?Math.min(n.transition.from,n.transition.to):n.current):displayCells(n)<=next*2;});
 if(allowed){state.transition={from:state.current,to:next,time:0};changed=true;}}
 if(changed)this.epoch++;return this.state();}
 display(){return this.states.map((s,id)=>this.cache.get(this.key(id,displayCells(s))));}
 blend(tile){if(this.frameEpoch!==this.epoch)this.composeFrame();return{positions:tile.displayPositions,normals:tile.displayNormals};}
 composeFrame(){const tiles=this.display();
 for(const tile of tiles){const state=this.states[tile.id],saved=this.transition;this.transition=state.transition;const blended=super.blend(tile);this.transition=saved;tile.displayPositions??=new Float32Array(tile.positions.length);tile.displayNormals??=new Float32Array(tile.normals.length);tile.displayPositions.set(blended.positions);tile.displayNormals.set(blended.normals);}
 // Both sides sample one canonical edge profile, whose detail is restricted by
 // the less-detailed neighbor, including its current transition progress.
 for(let id=0;id<16;id++)for(const other of [id%4<3?id+1:null,id<12?id+4:null].filter(n=>n!==null)){
 const a=tiles[id],b=tiles[other],horizontal=other===id+1,level=Math.min(detail(this.states[id]),detail(this.states[other])),low=2**Math.floor(level),high=Math.min(2**Math.ceil(level),Math.min(a.cells,b.cells)),alpha=high===low?0:level-Math.floor(level);
 for(const tile of [a,b])for(let j=0;j<=tile.cells;j++){const t=j/tile.cells,index=horizontal?(tile===a?j*(tile.cells+1)+tile.cells:j*(tile.cells+1)):(tile===a?tile.cells*(tile.cells+1)+j:j);
 for(const [base,out]of [['positions','displayPositions'],['normals','displayNormals']])for(let k=0;k<3;k++){
 const value=cells=>{const x=Math.min(cells-1,Math.floor(t*cells)),f=t*cells-x,stride=a.cells/cells,at=n=>horizontal?(n*stride*(a.cells+1)+a.cells)*3+k:(a.cells*(a.cells+1)+n*stride)*3+k;return a[base][at(x)]*(1-f)+a[base][at(x+1)]*f;};
 tile[out][index*3+k]=value(low)*(1-alpha)+value(high)*alpha;
 }}}
 this.frameEpoch=this.epoch;}
 state(){if(!this.states)return super.state();const currents=this.states.map(s=>s.current),targets=this.states.map(s=>s.target),range=a=>Math.min(...a)===Math.max(...a)?Math.min(...a):`${Math.min(...a)}–${Math.max(...a)}`;
 return{current:range(currents),target:range(targets),patchLevels:currents,targets,estimatedPixelErrors:this.projectedErrors?currents.map((cells,id)=>this.projectedErrors[id]*(8/cells)**2):null,resolutionLimitedPatches:this.projectedErrors?targets.filter((cells,id)=>cells===64&&this.projectedErrors[id]*(8/64)**2>2.5).length:0,transition:this.states.filter(s=>s.transition).length,resident:this.cache.size,limit:32,queued:this.queue.length,epoch:this.epoch,cpuBytes:[...this.cache.values()].reduce((sum,t)=>sum+t.positions.byteLength+t.normals.byteLength+['morphPositions','morphNormals','displayPositions','displayNormals'].reduce((n,key)=>n+(t[key]?.byteLength??0),0),0),selection:'Measured 8-cell midpoint error with quadratic refinement estimate; 2.5/1.5 pixel hysteresis',scope:'Adaptive fixed regional grid; planetary quadtree and global travel pending'};}
}
