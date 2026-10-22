export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const mul=(a,s)=>a.map(v=>v*s);
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const length=a=>Math.hypot(...a);
export const normalize=a=>mul(a,1/(length(a)||1));
export const lerp=(a,b,t)=>add(mul(a,1-t),mul(b,t));
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export function basis(tangent,previous){const t=normalize(tangent);let n=previous?sub(previous,mul(t,dot(previous,t))):cross(t,Math.abs(t[1])>.9?[0,0,1]:[0,1,0]);if(length(n)<1e-5)n=cross(t,[1,0,0]);n=normalize(n);return {t,n,b:normalize(cross(t,n))};}
export function sample(branch,t){const f=clamp(t)*(branch.points.length-1),i=Math.min(branch.points.length-2,Math.floor(f)),q=f-i;return lerp(branch.points[i],branch.points[i+1],q);}
export function tangent(branch,t){const e=.002;return normalize(sub(sample(branch,Math.min(1,t+e)),sample(branch,Math.max(0,t-e))));}
export function radiusAt(branch,t){const f=clamp(t)*(branch.radii.length-1),i=Math.min(branch.radii.length-2,Math.floor(f));return branch.radii[i]*(1-(f-i))+branch.radii[i+1]*(f-i);}
