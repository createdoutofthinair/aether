import {composeMaterialPage} from './material-pages.js?v=terrain-12';
let world=null,epoch=0;
self.onmessage=({data})=>{if(data.type==='world'){world=data.data;epoch=data.epoch;return;}if(data.epoch!==epoch||!world)return;try{const result=composeMaterialPage(world,data.tx,data.ty);self.postMessage({epoch,key:data.key,result},[result.pixels.buffer,result.color.buffer,result.surface.buffer]);}catch(error){self.postMessage({epoch,key:data.key,error:String(error)});}};
