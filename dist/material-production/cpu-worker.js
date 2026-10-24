import {bakeCPU} from './cpu.js';
self.onmessage=({data})=>{try{const result=bakeCPU(data.recipe,data.size,progress=>self.postMessage({id:data.id,progress}));self.postMessage({id:data.id,...result},[result.bytes.buffer]);}catch(e){self.postMessage({id:data.id,error:e.message});}};
