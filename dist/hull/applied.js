// Shipyard opt-in material override, separate from deterministic credit seeds.
export async function appliedSurface(){
 const data=await new Promise((resolve,reject)=>{const req=indexedDB.open('aether-hull-materials',1);req.onupgradeneeded=()=>req.result.createObjectStore('recipes');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('recipes'),get=tx.objectStore('recipes').get('ship');get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);tx.oncomplete=()=>db.close();};});
 if(!data)throw Error('Apply a material from Material editor → Spacecraft first.');
 const bitmaps={};for(const [key,url]of Object.entries(data.images??{})){const image=await createImageBitmap(await(await fetch(url)).blob()),c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);image.close();bitmaps[key]={width:c.width,height:c.height,data:ctx.getImageData(0,0,c.width,c.height).data};}
 return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{worker.terminate();if(data.error)reject(Error(data.error));else resolve(data);};worker.onerror=e=>{worker.terminate();reject(Error(e.message));};worker.postMessage({id:1,recipe:data.recipe,size:512,bitmaps});});
}
