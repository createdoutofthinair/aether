import * as T from 'three/webgpu';
import {pass} from 'three/tsl';
import {bloom} from 'three/addons/tsl/display/BloomNode.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
/** Shared studio lifecycle for generated meshes and imported GLB scenes. */
export class ObjectViewer{
 async initialize(container){
  if(!navigator.gpu)throw Error('WebGPU is unavailable. Use a WebGPU-capable browser with hardware acceleration enabled.');
  if(!await navigator.gpu.requestAdapter())throw Error('No WebGPU adapter is available on this device.');
  this.renderer=new T.WebGPURenderer({antialias:true,alpha:false});await this.renderer.init();
  if(!this.renderer.backend.isWebGPUBackend)throw Error('This studio requires the WebGPU backend.');
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.toneMapping=T.ACESFilmicToneMapping;container.append(this.renderer.domElement);
  this.scene=new T.Scene();this.scene.background=new T.Color(0x020305);this.camera=new T.PerspectiveCamera(34,1,.01,1000);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.minDistance=.4;this.controls.maxDistance=100;this.controls.autoRotateSpeed=.6;
  const room=new RoomEnvironment();this.pmrem=new T.PMREMGenerator(this.renderer);this.env=this.pmrem.fromScene(room,.04);this.scene.environment=this.env.texture;room.dispose();
  this.key=new T.DirectionalLight(0xe8f1ff,6.5);this.key.position.set(-3,4,5);this.scene.add(this.key);
  this.rim=new T.DirectionalLight(0x79cfff,9);this.rim.position.set(3,1,-2);this.scene.add(this.rim);
  this.fill=new T.DirectionalLight(0x7998c3,1.3);this.fill.position.set(-4,-1,2);this.scene.add(this.fill);
  this.resize=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();if(!width||!height)return;this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height);});this.resize.observe(container);
  this.pipeline=new T.RenderPipeline(this.renderer);const scenePass=pass(this.scene,this.camera);const color=scenePass.getTextureNode('output');this.bloom=bloom(color,.18,.35,1.3);this.pipeline.outputNode=color.add(this.bloom);
  let previousTime;
  this.renderer.setAnimationLoop(time=>{const dt=previousTime===undefined?0:Math.min((time-previousTime)/1000,.05);previousTime=time;if(!document.hidden)this.object?.userData.update?.(dt);this.controls.update(dt);this.pipeline.render();});
  this.renderer.backend.device.lost.then(info=>{if(info.reason!=='destroyed')this.onError?.('The WebGPU device was lost. Reload this page to restart the studio.');});
  return this;
 }
 setObject(object,{disposePrevious=false}={}){const old=this.object;if(old){this.scene.remove(old);if(disposePrevious)this.disposeObject(old);}this.object=object;this.scene.add(object);this.frame();}
 frame(){if(!this.object)return;this.object.updateMatrixWorld(true);const box=new T.Box3().setFromObject(this.object);if(box.isEmpty())return;const center=box.getCenter(new T.Vector3());const size=box.getSize(new T.Vector3());const distance=Math.max(size.y,size.x/this.camera.aspect,size.z)*.5/Math.tan(T.MathUtils.degToRad(this.camera.fov/2))*1.32;this.controls.target.copy(center);this.camera.position.copy(center).add(new T.Vector3(.06,.025,1).normalize().multiplyScalar(distance));this.camera.near=Math.max(distance/1000,.001);this.camera.far=Math.max(distance*100,100);this.camera.updateProjectionMatrix();this.controls.minDistance=distance*.15;this.controls.maxDistance=distance*6;this.controls.update();}
 disposeObject(object){const geometries=new Set(),materials=new Set(),textures=new Set();object.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
 dispose(){this.renderer.setAnimationLoop(null);this.resize.disconnect();this.controls.dispose();if(this.object)this.disposeObject(this.object);this.pipeline.dispose();this.bloom.dispose();this.env.dispose();this.pmrem.dispose();this.renderer.dispose();}
}
