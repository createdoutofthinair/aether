import * as T from '../../vendor-gpu/three.webgpu.js';
import {validateTilePayload,assertSceneTileEpoch} from '../../domain/render-contracts.js';
export class PreviewBackend{
 constructor({canvas,forceWebGL=false,onLost,onError,tile}){this.options={forceWebGL};this.tile=validateTilePayload(tile);this.renderer=new T.WebGPURenderer({canvas,forceWebGL,antialias:true,alpha:false});this.disposed=false;const lost=this.renderer.onDeviceLost.bind(this.renderer),error=this.renderer.onError.bind(this.renderer);this.renderer.onDeviceLost=info=>{if(this.disposed)return;lost(info);onLost?.(info);};this.renderer.onError=info=>{if(this.disposed)return;error(info);onError?.(info);};}
 async initialize(){await this.renderer.init();if(this.disposed)return;this.scene=new T.Scene();this.scene.background=new T.Color('#101923');this.camera=new T.PerspectiveCamera(55,1,.5,12000);this.camera.up.set(0,1,0);
 this.geometry=new T.BufferGeometry();this.geometry.setAttribute('position',new T.BufferAttribute(this.tile.positions,3));this.geometry.setIndex(new T.BufferAttribute(this.tile.indices,1));this.geometry.computeVertexNormals();
 this.material=new T.MeshStandardNodeMaterial();this.scene.add(new T.Mesh(this.geometry,this.material));
 this.scene.add(new T.HemisphereLight(0xc7e5ff,0x493a27,2));const sun=new T.DirectionalLight(0xffefda,3);sun.position.set(-400,700,200);this.scene.add(sun);this.scene.fog=new T.FogExp2('#101923',.00035);
 }
 applyScene(snapshot){assertSceneTileEpoch(snapshot,this.tile);this.camera.position.fromArray(snapshot.camera.position);this.camera.lookAt(new T.Vector3().fromArray(snapshot.camera.target));this.material.color.setRGB(...snapshot.material.colour,T.LinearSRGBColorSpace);this.material.roughness=snapshot.material.roughness;this.material.metalness=snapshot.material.metalness;}
 resize(width,height,dpr){if(!this.camera)return;this.renderer.setPixelRatio(Math.min(dpr,2));this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
 render(){if(!this.disposed)this.renderer.render(this.scene,this.camera);}
 capabilities(){return{framework:'Three.js',revision:T.REVISION,requested:this.options.forceWebGL?'WebGL fallback':'WebGPU preferred',actual:this.renderer.coordinateSystem===T.WebGPUCoordinateSystem?'WebGPU':'WebGL2 fallback',gpuTimerSupported:this.renderer.hasFeature('timestamp-query'),compute:this.renderer.coordinateSystem===T.WebGPUCoordinateSystem,tileVertices:this.tile.positions.length/3,geometryBytesEstimate:this.tile.positions.byteLength+this.geometry.attributes.normal.array.byteLength+this.tile.indices.byteLength};}
 async dispose(){if(this.disposed)return;this.disposed=true;this.geometry?.dispose();this.material?.dispose();await this.renderer.dispose();}
}
