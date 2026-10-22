import {bakeSurface,filteredMips} from './surface.js';
self.onmessage=({data})=>{try{const maps=bakeSurface(data.recipe,data.size,data.bitmaps),levels=filteredMips(maps);self.postMessage({id:data.id,maps,levels},[...new Set(levels.flatMap(l=>['color','normal','surface','masks'].map(k=>l[k].buffer)))]);}catch(e){self.postMessage({id:data.id,error:e.message});}};
