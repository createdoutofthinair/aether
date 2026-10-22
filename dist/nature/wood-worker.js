import {bakeWood} from './wood-model.js?v=growth-v3';
self.onmessage=({data})=>{const surface=bakeWood(data),cut=bakeWood({...data,type:'cut',size:512});self.postMessage({id:data.id,surface,cut},[surface.color,surface.normal,surface.packed,cut.color,cut.normal,cut.packed]);};
