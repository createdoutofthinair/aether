import {compileGraph} from './model.js';
import {executeCPU,packMaps} from './pixels.js';
import {loadSource} from './assets.js';
self.onmessage=async({data})=>{try{const program=compileGraph(data.graph),start=performance.now(),out=await executeCPU(program,data.size,loadSource),sourceMs=performance.now()-start,packStart=performance.now(),bytes=packMaps(out,program.graph);self.postMessage({id:data.id,bytes,timings:{sourceMs,mipMs:performance.now()-packStart,totalMs:performance.now()-start}},[bytes.buffer]);}catch(e){self.postMessage({id:data.id,error:e.message});}};
