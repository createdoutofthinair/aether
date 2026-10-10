import {crestSources} from './coastal-crests.js?v=terrain-17';
import {sprayEmitters} from './coastal-spray.js?v=terrain-17';
import {CoastalSolver} from './coastal-solver.js?v=terrain-17';
let solver,epoch,previous,time;
self.onmessage=({data})=>{try{if(data.type==='reset'){epoch=data.epoch;solver=new CoastalSolver(data.bed);solver.time=data.time;time=data.time;previous=solver.pixels();return;}if(!solver||data.epoch!==epoch)return;const started=performance.now(),target=Math.max(solver.time,Math.min(data.time,solver.time+.2));solver.advance(target);const current=solver.pixels(),old=previous.slice(),emitters=sprayEmitters(solver),crests=crestSources(solver);previous=current.slice();self.postMessage({epoch,previous:old,current,emitters,crests,previousTime:time,time:solver.time,cpuMs:performance.now()-started},[old.buffer,current.buffer,emitters.buffer,crests.buffer]);time=solver.time;}catch(error){self.postMessage({epoch:data.epoch,error:error.message});}};
