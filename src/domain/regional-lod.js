// A bounded regional LOD proof. All patches change level together so shared
// borders remain identical throughout refinement and coarsening.
export const PATCH_COUNT=4,REGION_SIZE=3600,LOD_LEVELS=[8,16,32,64];
export function desiredResolution(distance,current=8){
 const boundaries=[9000,4500,2200];let desired=distance<boundaries[2]?64:distance<boundaries[1]?32:distance<boundaries[0]?16:8;
 // Retain the current level around boundaries to prevent camera jitter thrash.
 const i=LOD_LEVELS.indexOf(current),threshold=i===0?9000:i===1?4500:i===2?2200:2200;
 if(desired>current&&distance>threshold*.85)return current;
 if(desired<current){const exit=i===3?2200:i===2?4500:9000;if(distance<exit*1.15)return current;}
 return desired;
}
export function interpolateGrid(array,cells,u,v,out=[0,0,0]){const x=Math.min(cells-1,Math.floor(u*cells)),y=Math.min(cells-1,Math.floor(v*cells)),fx=u*cells-x,fy=v*cells-y,a=(y*(cells+1)+x)*3,b=a+(cells+1)*3;
 for(let k=0;k<3;k++)out[k]=fx+fy<=1?array[a+k]*(1-fx-fy)+array[a+3+k]*fx+array[b+k]*fy:array[a+3+k]*(1-fy)+array[b+k]*(1-fx)+array[b+3+k]*(fx+fy-1);return out;}
export class RegionalLod{
 constructor(sample,{samplesPerFrame=512}={}){this.sample=sample;this.samplesPerFrame=samplesPerFrame;this.current=8;this.target=8;this.cache=new Map();this.queue=[];this.transition=null;this.epoch=0;
 for(let id=0;id<16;id++){const tile=this.startTile(id,8);while(!tile.ready)this.advanceTile(tile,Infinity);this.cache.set(this.key(id,8),tile);}}
 key(id,cells){return`${id}/${cells}`;}
 startTile(id,cells){return{id,cells,cursor:0,ready:false,positions:new Float32Array((cells+1)**2*3),normals:new Float32Array((cells+1)**2*3)};}
 advanceTile(tile,budget){const total=(tile.cells+1)**2,count=Math.min(budget,total-tile.cursor),column=tile.id%4,row=Math.floor(tile.id/4),size=REGION_SIZE/4;
 for(let k=0;k<count;k++){const i=tile.cursor++,x=i%(tile.cells+1),y=Math.floor(i/(tile.cells+1)),point=this.sample(-REGION_SIZE/2+(column+x/tile.cells)*size,-REGION_SIZE/2+(row+y/tile.cells)*size);tile.positions.set(point.position,i*3);tile.normals.set(point.normal,i*3);}
 tile.ready=tile.cursor===total;return count;}
 request(cells){if(this.transition||cells===this.target)return;this.target=cells;this.queue=[];
 // Retain only the active and requested level; stale generation work is dropped.
 for(const [key,tile]of this.cache)if(tile.cells!==this.current&&tile.cells!==cells)this.cache.delete(key);
 for(let id=0;id<16;id++){const key=this.key(id,cells);let tile=this.cache.get(key);if(!tile){tile=this.startTile(id,cells);this.cache.set(key,tile);}if(!tile.ready)this.queue.push(tile);}}
 update(distance,dt){this.request(desiredResolution(distance,this.current));let budget=this.samplesPerFrame;
 while(budget>0&&this.queue.length){const tile=this.queue[0];budget-=this.advanceTile(tile,budget);if(tile.ready)this.queue.shift();}
 let started=false;if(!this.transition&&this.current!==this.target&&!this.queue.length){started=true;this.transition={from:this.current,to:this.target,time:0};this.epoch++;}
 if(this.transition&&!started){this.transition.time=Math.min(1,this.transition.time+Math.max(0,Math.min(dt,.05))/.45);if(this.transition.time===1){this.current=this.transition.to;this.transition=null;this.epoch++;for(const [key,tile]of this.cache)if(tile.cells!==this.current)this.cache.delete(key);}}
 return this.state();}
 display(){const fine=this.transition?Math.max(this.transition.from,this.transition.to):this.current;return Array.from({length:16},(_,id)=>this.cache.get(this.key(id,fine)));}
 blend(tile){const tr=this.transition;if(!tr)return{positions:tile.positions,normals:tile.normals};
 const coarse=this.cache.get(this.key(tile.id,Math.min(tr.from,tr.to))),alpha=tr.to>tr.from?tr.time:1-tr.time;
 const positions=tile.morphPositions??=new Float32Array(tile.positions.length),normals=tile.morphNormals??=new Float32Array(tile.normals.length),p=[0,0,0],n=[0,0,0];
 for(let i=0;i<tile.positions.length/3;i++){const x=i%(tile.cells+1),y=Math.floor(i/(tile.cells+1));interpolateGrid(coarse.positions,coarse.cells,x/tile.cells,y/tile.cells,p);interpolateGrid(coarse.normals,coarse.cells,x/tile.cells,y/tile.cells,n);let length=0;
 for(let k=0;k<3;k++){positions[i*3+k]=p[k]*(1-alpha)+tile.positions[i*3+k]*alpha;normals[i*3+k]=n[k]*(1-alpha)+tile.normals[i*3+k]*alpha;length+=normals[i*3+k]**2;}length=Math.sqrt(length)||1;for(let k=0;k<3;k++)normals[i*3+k]/=length;}
 return{positions,normals};}
 state(){return{current:this.current,target:this.target,transition:this.transition?{...this.transition}:null,resident:this.cache.size,limit:32,queued:this.queue.length,epoch:this.epoch,cpuBytes:[...this.cache.values()].reduce((sum,t)=>sum+t.positions.byteLength+t.normals.byteLength+(t.morphPositions?.byteLength??0)+(t.morphNormals?.byteLength??0),0),scope:'Regional synchronized patch LOD; planetary quadtree remains pending'};}
}
