import * as T from 'three/webgpu';
import {applyShipLighting} from './ship-lighting.js';
import {activeFlights} from './ship-flight.js';
import {ResidentPool} from '../render/resident-pool.js';
import {unpackShip,disposeShip} from '../render/ship-assets.js';
export {batchShip} from '../render/ship-assets.js';
import {FLEET_VARIANTS,fleetSeed} from './ship-flight.js';
// Pipeline state is fixed when assets are hydrated. Fades only change uniforms.
export function setFlightOpacity(ship,opacity){for(const mesh of ship.children)mesh.material.opacity=opacity;}
export function createCreditsShips(canvas,{onProgress=()=>{}}={}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let renderer,scene,camera,clock=0,disposed=false,ready=false,pending=0,failed=false;
 const cache=new Map();let pool,worker,workerReject,resolveReady;
 const readiness=new Promise(resolve=>{resolveReady=resolve;});
 const metrics={prepared:0,active:0,spawnBuilds:0,warmupMs:0,resident:FLEET_VARIANTS};
 function build(key){return new Promise((resolve,reject)=>{workerReject=reject;worker.onmessage=({data})=>{if(data.id!==key)return;workerReject=null;if(data.error)reject(Error(data.error));else{const ship=unpackShip(data.payload);applyShipLighting(ship);scene.add(ship);resolve(ship);}};worker.onerror=e=>reject(Error(e.message));worker.postMessage({id:key,seed:fleetSeed(key)});});}
 async function warm(ship){if(disposed)return;ship.visible=true;ship.position.set(0,0,-50);ship.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});await renderer.compileAsync(scene,camera);if(disposed)return;await renderer.renderAsync(scene,camera);await renderer.backend.device.queue.onSubmittedWorkDone();if(disposed)return;ship.visible=false;ship.traverse(o=>{if(o.isMesh)o.frustumCulled=true;});metrics.prepared++;onProgress(metrics.prepared,FLEET_VARIANTS);}

 function fit(){if(!renderer||disposed)return;const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 const resize=new ResizeObserver(fit);resize.observe(canvas);
 function fail(error){if(disposed)return;failed=true;ready=false;canvas.hidden=true;resolveReady(false);pool?.dispose();worker?.terminate();console.info('Aether ship flybys unavailable:',error?.message||error);}
 const api={ready:readiness,metrics,tick(dt=0){if(disposed||failed||reduced.matches||document.hidden)return;clock+=Math.min(Math.max(dt,0),.1);// Follow the presentation clock; a 30 Hz cutoff causes uneven frame skipping.
  // Two in-flight submissions tolerate completion callback latency without an unbounded queue.
  if(!ready||pending>=2)return;
  const flights=activeFlights(clock),ids=new Set(flights.map(f=>f.index));for(const [index]of cache)if(!ids.has(index)){pool.release(index);cache.delete(index);}
  for(const f of flights){let ship=cache.get(f.index);if(!ship){ship=pool.acquire(f.index%FLEET_VARIANTS,f.index);if(!ship)continue;cache.set(f.index,ship);}
   ship.visible=true;ship.position.set(f.x,f.y,f.z);ship.scale.setScalar(f.scale);setFlightOpacity(ship,f.opacity);ship.userData.nebulaLighting.update(clock,ship.position);
  }metrics.active=cache.size;
  try{renderer.render(scene,camera);pending++;renderer.backend.device.queue.onSubmittedWorkDone().then(()=>{pending--;},error=>{pending--;fail(error);});}catch(error){fail(error);}
 },restart(){clock=0;cache.clear();pool?.reset();metrics.active=0;},dispose(){if(disposed)return;disposed=true;ready=false;resolveReady(false);resize.disconnect();workerReject?.(Error('Ship preparation cancelled'));worker?.terminate();pool?.dispose();cache.clear();renderer?.dispose();}};

 if(!reduced.matches)(async()=>{try{renderer=new T.WebGPURenderer({canvas,alpha:true,antialias:true});await renderer.init();if(disposed){renderer.dispose();return;}if(!renderer.backend.isWebGPUBackend)throw Error('Flybys require WebGPU');renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;scene=new T.Scene();camera=new T.PerspectiveCamera(45,1,.1,100000);
 // A distant oblique star carves the hull; space has almost no uniform fill.
 const key=new T.DirectionalLight(0xffeedb,1.8);key.position.set(-6,4,2);scene.add(key);
 const rim=new T.DirectionalLight(0x819bbb,.3);rim.position.set(4,-2,-4);scene.add(rim);fit();
 canvas.style.visibility='hidden';const warmupStart=performance.now();worker=new Worker(new URL('../render/ship-worker.js',import.meta.url),{type:'module'});
 pool=new ResidentPool({create:build,warm,destroy:ship=>{scene.remove(ship);disposeShip(ship);}});
 await pool.prepare(Array.from({length:FLEET_VARIANTS},(_,i)=>i));if(disposed)return;
 worker.terminate();worker=null;metrics.warmupMs=performance.now()-warmupStart;await renderer.renderAsync(scene,camera);canvas.style.visibility='';ready=true;resolveReady(true);
 renderer.backend.device.lost.then(info=>{if(!disposed&&info.reason!=='destroyed')fail(info.message);});
 }catch(error){if(!disposed)fail(error);}})();else resolveReady(false);return api;
}
