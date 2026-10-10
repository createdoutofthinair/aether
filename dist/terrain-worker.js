import {generateReference} from './terrain-data.js?v=terrain-10';
import {prepareDetail,generateDetailTile} from './terrain-detail.js?v=terrain-10';
const worlds=new Map();
self.onmessage=({data:{id,seed,type,tx,tz}})=>{try{
 let data=worlds.get(seed);if(!data){data=prepareDetail(generateReference(seed));worlds.set(seed,data);while(worlds.size>3)worlds.delete(worlds.keys().next().value);}
 if(type==='detail'){const result=generateDetailTile(data,tx,tz);self.postMessage({id,result},[result.values.buffer]);}
 else self.postMessage({id,result:data}); // Keep the worker's parent data for fine tiles.
}catch(error){self.postMessage({id,error:String(error)});}};
