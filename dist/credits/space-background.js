import {NebulaRenderer,presets} from '../nebula/renderer.js?v=volume-perf-8';
import {NEBULA_TRAVEL_SPEED} from './nebula-lighting.js';
import {AdaptiveNebulaQuality} from '../nebula/quality.js';
/** Background work cannot queue behind an unfinished GPU frame. */
export function createCreditsNebula(canvas){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const quality=new AdaptiveNebulaQuality({budgetMs:16,minScale:.5});
 let renderer,ready=false,disposed=false,clock=0,lastDraw=-1,dirty=true,observedFrame=0;
 const settings={...presets.veil,view:'flight',cycleLooks:true,stars:false,steps:40,density:.72,emission:1.35,travel:0};
 function fit(){const box=canvas.getBoundingClientRect();const scale=Math.min(.5,720/Math.max(box.width,1))*quality.scale;const width=Math.max(1,Math.round(box.width*scale)),height=Math.max(1,Math.round(box.height*scale));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;dirty=true;}}
 const resize=new ResizeObserver(fit);resize.observe(canvas);
 function disable(error){ready=false;canvas.hidden=true;console.info('Aether keeps the starfield background:',error?.message||error);renderer?.dispose();}
 const api={
  tick(dt=0){if(disposed)return;if(!reduced.matches)clock+=Math.min(dt,.1);if(!ready)return;
   if(renderer.completedFrames!==observedFrame&&renderer.completedFrames){observedFrame=renderer.completedFrames;if(quality.observe(renderer.frameTimeMs))fit();}
   if(renderer.framePending||(!dirty&&clock-lastDraw<1/24))return;
   settings.travel=clock*NEBULA_TRAVEL_SPEED;
   try{if(renderer.render(settings,clock)){lastDraw=clock;dirty=false;canvas.classList.add('ready');}}catch(error){disable(error);}
  },
  restart(){clock=0;lastDraw=-1;dirty=true;api.tick(0);},
  dispose(){disposed=true;ready=false;resize.disconnect();renderer?.dispose();}
 };
 (async()=>{try{renderer=new NebulaRenderer();await renderer.initialize(canvas);if(disposed){renderer.dispose();return;}renderer.onError=disable;ready=true;api.tick(0);}catch(error){disable(error);}})();
 return api;
}
