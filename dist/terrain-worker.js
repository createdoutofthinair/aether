import {referenceKey} from './planet-profiles.js?v=foundation-1';
import {generateReference} from './terrain-data.js?v=foundation-1';
import {prepareDetail,generateDetailTile} from './terrain-detail.js?v=foundation-1';
const worlds=new Map();
self.onmessage=({data:{id,seed,type,tx,tz,config,environment}})=>{try{
 const key=referenceKey(seed,config,environment);let data=worlds.get(key);if(!data){data=prepareDetail(generateReference(seed,{config,environment}));worlds.set(key,data);while(worlds.size>3)worlds.delete(worlds.keys().next().value);}
 if(type==='detail'){const result=generateDetailTile(data,tx,tz);self.postMessage({id,result},[result.values.buffer]);}
 else self.postMessage({id,result:data}); // Keep the worker's parent data for fine tiles.
}catch(error){self.postMessage({id,error:String(error)});}};
