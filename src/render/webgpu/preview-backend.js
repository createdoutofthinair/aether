import {AdaptiveRegionalLod} from '../../domain/adaptive-regional-lod.js';
import {previewSurface} from './terrain-preview.js?v=adaptive-lod-1';
import * as T from '../../vendor-gpu/three.webgpu.js';
import {validateTilePayload,assertSceneTileEpoch} from '../../domain/render-contracts.js';
export class PreviewBackend{
 constructor({canvas,forceWebGL=false,onLost,onError,tile}){this.options={forceWebGL};this.tile=validateTilePayload(tile);this.renderer=new T.WebGPURenderer({canvas,forceWebGL,antialias:true,alpha:false});this.disposed=false;const lost=this.renderer.onDeviceLost.bind(this.renderer),error=this.renderer.onError.bind(this.renderer);this.renderer.onDeviceLost=info=>{if(this.disposed)return;lost(info);onLost?.(info);};this.renderer.onError=info=>{if(this.disposed)return;error(info);onError?.(info);};}
 async initialize(){await this.renderer.init();if(this.disposed)return;this.scene=new T.Scene();this.scene.background=new T.Color('#101923');this.camera=new T.PerspectiveCamera(55,1,.5,60000);this.camera.up.set(0,1,0);
 this.surface=previewSurface();this.lod=new AdaptiveRegionalLod(this.surface.sample);this.meshes=new Map();this.lastFrame=null;this.lastUpdate=null;
 this.material=new T.MeshStandardNodeMaterial();this.syncPatches();
 this.scene.add(new T.HemisphereLight(0xc7e5ff,0x493a27,2));const sun=new T.DirectionalLight(0xffefda,3);sun.position.set(-400,700,200);this.scene.add(sun);this.scene.fog=new T.FogExp2('#101923',.000055);
 }
 applyScene(snapshot){assertSceneTileEpoch(snapshot,this.tile);this.snapshot=snapshot;this.camera.position.fromArray(snapshot.camera.position);this.camera.lookAt(new T.Vector3().fromArray(snapshot.camera.target));this.material.color.setRGB(...snapshot.material.colour,T.LinearSRGBColorSpace);this.material.roughness=snapshot.material.roughness;this.material.metalness=snapshot.material.metalness;}
 resize(width,height,dpr){if(!this.camera)return;this.renderer.setPixelRatio(Math.min(dpr,2));this.renderer.setSize(width,height,false);this.focalPixels=height*Math.min(dpr,2)/(2*Math.tan(this.camera.fov*Math.PI/360));this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
 syncPatches(){const display=this.lod.display(),visible=new Set(display.map(t=>this.lod.key(t.id,t.cells)));
 for(const tile of display){const key=this.lod.key(tile.id,tile.cells);let mesh=this.meshes.get(key);if(!mesh){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(tile.positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(tile.normals,3));const indices=new Uint16Array(tile.cells*tile.cells*6);let i=0;for(let y=0;y<tile.cells;y++)for(let x=0;x<tile.cells;x++){const a=y*(tile.cells+1)+x,b=a+tile.cells+1;indices.set([a,a+1,b,a+1,b+1,b],i);i+=6;}geometry.setIndex(new T.BufferAttribute(indices,1));mesh=new T.Mesh(geometry,this.material);mesh.frustumCulled=false;this.scene.add(mesh);this.meshes.set(key,mesh);}
 const blend=this.lod.blend(tile);mesh.geometry.attributes.position.array.set(blend.positions);mesh.geometry.attributes.normal.array.set(blend.normals);mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.attributes.normal.needsUpdate=true;mesh.visible=true;
 }
 for(const [key,mesh]of this.meshes){mesh.visible=visible.has(key);if(!this.lod.cache.has(key)){this.scene.remove(mesh);mesh.geometry.dispose();this.meshes.delete(key);}}
 }
 render(){if(this.disposed)return;const now=performance.now(),dt=this.lastFrame===null?0:(now-this.lastFrame)/1000;this.lastFrame=now;const state=this.lod.update(this.camera.position.toArray(),dt,this.focalPixels??700),updateKey=`${state.epoch}/${state.transition?.time??0}`;if(this.lastUpdate!==updateKey){this.syncPatches();this.lastUpdate=updateKey;}this.renderer.render(this.scene,this.camera);}

 capabilities(){return{framework:'Three.js',revision:T.REVISION,requested:this.options.forceWebGL?'WebGL fallback':'WebGPU preferred',actual:this.renderer.coordinateSystem===T.WebGPUCoordinateSystem?'WebGPU':'WebGL2 fallback',gpuTimerSupported:this.renderer.hasFeature('timestamp-query'),compute:this.renderer.coordinateSystem===T.WebGPUCoordinateSystem,tileVertices:this.lod.display().reduce((sum,t)=>sum+t.positions.length/3,0),lod:this.lod.state(),geometryBytesEstimate:[...this.meshes.values()].reduce((sum,m)=>sum+Object.values(m.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+m.geometry.index.array.byteLength,0)};}
 async dispose(){if(this.disposed)return;this.disposed=true;for(const mesh of this.meshes?.values()??[])mesh.geometry.dispose();this.meshes?.clear();this.material?.dispose();await this.renderer.dispose();}
}
