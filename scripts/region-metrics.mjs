import * as T from '../dist/vendor/three.module.js';
import {height,R,basis} from '../dist/terrain.js';
export const sites=[{id:'badlands',lat:12,lon:-35},{id:'volcanic',lat:-10,lon:65},{id:'dunes',lat:8,lon:145}];
export function measure(site){const lat=site.lat*Math.PI/180,lon=site.lon*Math.PI/180,center=new T.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)),b=basis(center),values=[];let slopes=[];
 for(let j=0;j<41;j++)for(let i=0;i<41;i++){const n=center.clone().multiplyScalar(R).addScaledVector(b.east,(i-20)*250).addScaledVector(b.north,(j-20)*250).normalize();values.push(height(n));}
 for(let j=0;j<40;j++)for(let i=0;i<40;i++){const k=j*41+i;slopes.push(Math.hypot(values[k+1]-values[k],values[k+41]-values[k])/250);}
 const mean=values.reduce((a,b)=>a+b)/values.length;slopes.sort((a,b)=>a-b);return{min:Math.min(...values),max:Math.max(...values),relief:Math.max(...values)-Math.min(...values),std:Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/values.length),meanSlope:slopes.reduce((a,b)=>a+b)/slopes.length,p95Slope:slopes[Math.floor(slopes.length*.95)]};
}
