import {generateReference} from './terrain-data.js?v=terrain-7';
self.onmessage=({data:{id,seed}})=>{try{const result=generateReference(seed);self.postMessage({id,result},[result.height.buffer,result.masks.buffer]);}catch(error){self.postMessage({id,error:String(error)});}};
