import {gaussianize} from './stochastic-material.js?v=terrain-8';
self.onmessage=({data})=>{try{const result=gaussianize(data.pixels);self.postMessage({result},[result.encoded.buffer,result.inverse.buffer]);}catch(e){self.postMessage({error:String(e)});}};
