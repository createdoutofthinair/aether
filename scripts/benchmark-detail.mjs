// CPU development fixture, not a browser/GPU FPS measurement.
import * as T from '../dist/vendor/three.module.js';
import {generateReference} from '../dist/terrain-data.js?v=terrain-9';
import {installReference,detailCacheState} from '../dist/terrain-cache.js?v=terrain-9';
import {R,basinDirection,PlanetTerrain} from '../dist/terrain.js?v=terrain-9';
import {OutcropField} from '../dist/outcrops.js?v=terrain-9';
installReference(generateReference());const root=new T.Group(),terrain=new PlanetTerrain(root,new T.MeshStandardMaterial()),field=new OutcropField(root,{},terrain,{sediment:{value:.65}}),camera=basinDirection(700,250).multiplyScalar(R+650);
const times=[];let frames=0;do{const start=performance.now();field.update(camera);times.push(performance.now()-start);frames++;}while(field.entries.some(e=>!e.center)&&frames<180);
const initializationFrames=frames;for(let k=0;k<40;k++){terrain.frame++;const start=performance.now();field.update(camera);times.push(performance.now()-start);}
times.sort((a,b)=>a-b);console.log(JSON.stringify({formations:field.count,initializationFrames,placementCpuMedianMs:+times[Math.floor(times.length*.5)].toFixed(3),placementCpuP95Ms:+times[Math.floor(times.length*.95)].toFixed(3),cache:detailCacheState()}));
