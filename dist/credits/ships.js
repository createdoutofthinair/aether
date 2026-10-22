import * as T from 'three/webgpu';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {blueprint} from '../ships/blueprint.js';
import {shipModel} from '../ships/model.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {activeFlights} from './ship-flight.js';
// Bake the kit's hundreds of meshes into one draw per material, once per ship.
export function batchShip(root){
 root.updateMatrixWorld(true);const byMaterial=new Map(),source=new Set();
 root.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);source.add(o.geometry);if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(geometry);});
 const batched=new T.Group();for(const [material,geometries]of byMaterial){const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)throw Error('Ship batching failed');material.transparent=true;const mesh=new T.Mesh(geometry,material);batched.add(mesh);}source.forEach(g=>g.dispose());return batched;
}
function disposeShip(ship){ship.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
export function createCreditsShips(canvas){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let environment,pmrem,renderer,scene,camera,clock=0,disposed=false,ready=false,pending=false,lastDraw=-1,failed=false;
 const cache=new Map();
 function fit(){if(!renderer||disposed)return;const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 const resize=new ResizeObserver(fit);resize.observe(canvas);
 function fail(error){failed=true;ready=false;canvas.hidden=true;console.info('Aether ship flybys unavailable:',error?.message||error);}
 const api={tick(dt=0){if(disposed||failed||reduced.matches||document.hidden)return;clock+=Math.min(Math.max(dt,0),.1);if(!ready||pending||clock-lastDraw<1/30)return;
  const flights=activeFlights(clock,camera.aspect),ids=new Set(flights.map(f=>f.index));for(const [index,ship]of cache)if(!ids.has(index)){scene.remove(ship);disposeShip(ship);cache.delete(index);}
  for(const f of flights){let ship=cache.get(f.index);if(!ship){let plan=blueprint(f.seed);for(let n=1;plan.count>4&&n<=64;n++)plan=blueprint(f.seed+'-'+n);ship=batchShip(shipModel(plan,{roughness:Math.max(.42,plan.appearance.roughness)}));cache.set(f.index,ship);scene.add(ship);}
   const halfHeight=-f.z*Math.tan(T.MathUtils.degToRad(camera.fov/2));ship.position.set(f.x*halfHeight*camera.aspect,f.y*halfHeight,f.z);ship.scale.setScalar(f.scale);
   // Nose follows the diagonal flight, with a restrained banking angle.
   ship.rotation.set(.15,f.side>0?Math.PI*.65:-Math.PI*.65,f.side*.18);ship.traverse(o=>{if(o.material)o.material.opacity=f.opacity;});
  }
  try{renderer.render(scene,camera);lastDraw=clock;pending=true;renderer.backend.device.queue.onSubmittedWorkDone().then(()=>{pending=false;},fail);}catch(error){fail(error);}
 },restart(){clock=0;lastDraw=-1;for(const ship of cache.values()){scene?.remove(ship);disposeShip(ship);}cache.clear();},dispose(){if(disposed)return;disposed=true;ready=false;resize.disconnect();for(const ship of cache.values())disposeShip(ship);cache.clear();environment?.dispose();pmrem?.dispose();renderer?.dispose();}};
 if(!reduced.matches)(async()=>{try{renderer=new T.WebGPURenderer({canvas,alpha:true,antialias:true});await renderer.init();if(disposed){renderer.dispose();return;}if(!renderer.backend.isWebGPUBackend)throw Error('Flybys require WebGPU');renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;scene=new T.Scene();camera=new T.PerspectiveCamera(45,1,.1,400);
 const key=new T.DirectionalLight(0xdcecff,2.4);key.position.set(-4,5,6);scene.add(key);const rim=new T.DirectionalLight(0x91b8d0,1.4);rim.position.set(3,-1,-4);scene.add(rim);scene.add(new T.AmbientLight(0x9daec5,.65));const room=new RoomEnvironment();pmrem=new T.PMREMGenerator(renderer);environment=pmrem.fromScene(room,.08);room.dispose();scene.environment=environment.texture;scene.environmentIntensity=.5;fit();ready=true;renderer.backend.device.lost.then(info=>{if(!disposed&&info.reason!=='destroyed')fail(info.message);});
 }catch(error){fail(error);}})();return api;
}
