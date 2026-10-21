// Match the cockpit plate's intrinsic coordinates. Artwork and HUD share this frame.
export const HUD_FRAME = Object.freeze({width:1678,height:937});
export function fitHudFrame(width,height){
 const w=Math.max(0,Number.isFinite(width)?width:0);
 const h=Math.max(0,Number.isFinite(height)?height:0);
 const scale=Math.min(w/HUD_FRAME.width,h/HUD_FRAME.height);
 return {scale,width:HUD_FRAME.width*scale,height:HUD_FRAME.height*scale,
  left:(w-HUD_FRAME.width*scale)/2,top:(h-HUD_FRAME.height*scale)/2};
}
export function mountHudLayout(viewport,scene){
 const portrait=matchMedia('(max-width: 900px) and (max-aspect-ratio: 6/5)');
 const update=()=>{
  const frame=fitHudFrame(viewport.clientWidth,viewport.clientHeight);
  viewport.dataset.layout=portrait.matches?'portrait':'cockpit';
  scene.style.setProperty('--scene-scale',String(frame.scale));
  scene.classList.add('layout-ready');
 };
 const observer=new ResizeObserver(update);observer.observe(viewport);
 portrait.addEventListener('change',update);update();
 return ()=>{observer.disconnect();portrait.removeEventListener('change',update);};
}
