export const LOD_FADE_SECONDS=.55;
export function advanceLOD(tree,desired,now){
 if(tree.lod<0){tree.lod=tree.from=desired;tree.changed=-Infinity;tree.pending=desired;tree.pendingSince=now;}
 const progress=Math.min(1,(now-tree.changed)/LOD_FADE_SECONDS);
 // Complete a transition before accepting another target; demand must then
 // remain stable for a short dwell period. Budget-rank noise cannot restart it.
 if(progress>=1){if(tree.pending!==desired){tree.pending=desired;tree.pendingSince=now;}if(tree.lod!==desired&&now-tree.pendingSince>=.22){tree.from=tree.lod;tree.lod=desired;tree.changed=now;}}
 return Math.max(0,Math.min(1,(now-tree.changed)/LOD_FADE_SECONDS));
}
export function snappedShadowAnchor(position,direction,span=60,resolution=2048){
 const n=Math.hypot(...direction),d=direction.map(x=>x/n),r=[d[2],0,-d[0]],rl=Math.hypot(...r);for(let i=0;i<3;i++)r[i]/=rl;const u=[d[1]*r[2]-d[2]*r[1],d[2]*r[0]-d[0]*r[2],d[0]*r[1]-d[1]*r[0]],step=span/resolution,dot=a=>a.reduce((s,v,i)=>s+v*position[i],0),x=Math.round(dot(r)/step)*step,y=Math.round(dot(u)/step)*step,z=Math.round(dot(d));return r.map((v,i)=>v*x+u[i]*y+d[i]*z);
}
export function lodVisibility(threshold,fade,outgoing=false){return outgoing?threshold>=1-fade:threshold<fade;}
