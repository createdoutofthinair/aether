import * as T from './vendor/three.module.js';
import {height,basis,R,landing} from './terrain.js?v=terrain-8';
import {world,environment,mapDirection} from './world.js?v=terrain-8';

// Find an actual crossing of this world's height field, rather than placing
// the camera above a hard-coded sea that disappears when the seed changes.
export function findCoast(){
 if(!environment.waterEnabled)return null;
 let best=null,bestScore=-Infinity;
 for(const latitude of [-24,-12,0,12,24])for(let longitude=-180;longitude<180;longitude+=12){
  let a=new T.Vector3().copy(mapDirection((longitude+180)/360,.5-latitude/180));
  let b=new T.Vector3().copy(mapDirection((longitude+192)/360,.5-latitude/180));
  let ha=height(a)-world.water,hb=height(b)-world.water;
  if(ha*hb>=0)continue;
  for(let i=0;i<22;i++){const m=a.clone().lerp(b,.5).normalize(),hm=height(m)-world.water;if(hm*ha>0){a=m;ha=hm;}else{b=m;hb=hm;}}
  const shore=a.clone().lerp(b,.5).normalize(),{east,north}=basis(shore);
  const sample=(axis,offset)=>height(shore.clone().addScaledVector(axis,offset/R).normalize());
  const ge=(sample(east,60)-sample(east,-60))/120,gn=(sample(north,60)-sample(north,-60))/120,slope=Math.hypot(ge,gn);
  if(slope<.008||slope>.4)continue;
  const inland=east.multiplyScalar(ge).addScaledVector(north,gn).normalize();
  const site=shore.clone().addScaledVector(inland,140/R).normalize(),siteHeight=height(site);
  if(siteHeight<world.water+1)continue;
  const score=shore.dot(landing)*.5-Math.abs(slope-.10)*2;
  if(score>bestScore){bestScore=score;best={shore,site,inland,slope};}
 }
 return best;
}
