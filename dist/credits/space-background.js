import {NebulaRenderer,presets} from '../nebula/renderer.js?v=credit-space-5';
/** Optional background; the credits, music and Canvas starfield never await it. */
export function createCreditsNebula(canvas){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let renderer,ready=false,disposed=false,clock=0,lastDraw=-1,dirty=true;
 const settings={...presets.veil,view:'flight',cycleLooks:true,stars:false,steps:40,density:.72,emission:1.35,travel:0};
 const resize=new ResizeObserver(()=>{const box=canvas.getBoundingClientRect();const scale=Math.min(.5,720/Math.max(box.width,1));canvas.width=Math.max(1,Math.round(box.width*scale));canvas.height=Math.max(1,Math.round(box.height*scale));dirty=true;});resize.observe(canvas);
 function disable(error){ready=false;canvas.hidden=true;console.info('Aether keeps the starfield background:',error?.message||error);renderer?.dispose();}
 const api={
  tick(dt=0){if(disposed)return;if(!reduced.matches)clock+=Math.min(dt,.1);if(!ready)return;if(!dirty&&clock-lastDraw<1/24)return;settings.travel=clock*.85;try{renderer.render(settings,clock);lastDraw=clock;dirty=false;canvas.classList.add('ready');}catch(error){disable(error);}},
  restart(){clock=0;lastDraw=-1;dirty=true;api.tick(0);},
  dispose(){disposed=true;ready=false;resize.disconnect();renderer?.dispose();}
 };
 (async()=>{try{renderer=new NebulaRenderer();await renderer.initialize(canvas);if(disposed){renderer.dispose();return;}renderer.onError=disable;ready=true;api.tick(0);}catch(error){disable(error);}})();
 return api;
}
