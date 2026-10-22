import * as T from 'three/webgpu';
import {texture,vec3,positionLocal,time,sin,uniform,instanceIndex,float,frontFacing,mix} from 'three/tsl';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {generateTree} from './tree-model.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {species,leafMesh,random,selectLOD} from './leaf-model.js';
const $=id=>document.getElementById(id),status=$('status'),wind=uniform(.2);let renderer,controls,observer,worker,disposed=false;
try{
 if(!navigator.gpu||!await navigator.gpu.requestAdapter())throw Error('WebGPU unavailable. Enable hardware acceleration in a supported browser.');
 renderer=new T.WebGPURenderer({antialias:true});await renderer.init();if(!renderer.backend.isWebGPUBackend)throw Error('A WebGPU adapter is required.');
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;$('viewport').append(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color('#101a17');
 const camera=new T.PerspectiveCamera(33,1,.001,100);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
 const key=new T.DirectionalLight(0xfff2ce,3.5),fill=new T.HemisphereLight(0xc8e0e1,0x273b20,1.3);scene.add(key,fill);
 const rim=new T.DirectionalLight(0xe8f0d9,1.5);rim.position.set(-1,1,-2);scene.add(rim);
 observer=new ResizeObserver(()=>{const r=$('viewport').getBoundingClientRect();if(r.width&&r.height){camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);}});observer.observe($('viewport'));
 let meshes=[],maps=[],materials=[],geometries=[],job=0,currentLOD=0,lastTime=0,frames=0,acc=0,population=1,treeGroup=null,treeData=null,leafExtent=1;
 const workerURL=new URL('./leaf-worker.js',import.meta.url);worker=new Worker(workerURL,{type:'module'});
 function clear(){if(treeGroup){scene.remove(treeGroup);treeGroup.traverse(o=>{if(o.isInstancedMesh)o.dispose();o.geometry?.dispose();o.material?.dispose();});treeGroup=null;}for(const mesh of meshes){scene.remove(mesh);mesh.dispose();}geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());maps.forEach(x=>x.dispose());meshes=[];geometries=[];materials=[];maps=[];}
 function frame(){const p=species[$('species').value];controls.target.set(0,treeData?treeData.height*.48:0,0);const distance=treeData?treeData.height*2.5:population===1?p.length*2.6:p.length*12;camera.position.set(distance*.15,controls.target.y+distance*.12,distance);controls.minDistance=treeData?.15:p.length*.5;controls.maxDistance=treeData?50:8;camera.far=150;camera.updateProjectionMatrix();controls.update();}
 function architecture(){
  const mode=$('specimen').value;$('treeControls').hidden=mode==='leaf';$('population').disabled=mode!=='leaf';
  if(mode==='leaf'){treeData=null;return;}
  treeData=generateTree({species:$('species').value,seed:Number($('seed').value)||1,height:Number($('height').value),levels:Number($('branches').value),density:$('foliage').checked?Number($('density').value):0,leafScale:Number($('leafScale').value),mode});
  treeGroup=new T.Group();const parts=[],axis=new T.Vector3(0,1,0);
  for(const seg of treeData.segments){const start=new T.Vector3(...seg.start),end=new T.Vector3(...seg.end),d=end.clone().sub(start);const g=new T.CylinderGeometry(seg.r1,seg.r0,d.length(),seg.depth<2?10:5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(axis,d.clone().normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());parts.push(g);}
  const bark=new T.MeshStandardNodeMaterial({color:$('species').value==='birch'?0xaaa99b:0x514538,roughness:.96});
  // Object-space ridges remain stable on merged branches and need no texture upload.
  const grain=sin(positionLocal.y.mul(12).add(sin(positionLocal.x.mul(110)).mul(2)).add(positionLocal.z.mul(85))).mul(.11).add(.79);bark.colorNode=vec3($('species').value==='birch'?.67:.29,$('species').value==='birch'?.66:.24,$('species').value==='birch'?.59:.18).mul(grain);
  treeGroup.add(new T.Mesh(mergeGeometries(parts),bark));parts.forEach(g=>g.dispose());
  if(treeData.attachments.length){const stalks=new T.InstancedMesh(new T.CylinderGeometry(.0009,.0013,1,4),new T.MeshStandardNodeMaterial({color:0x637139,roughness:.85}),treeData.attachments.length),dummy=new T.Object3D();
   treeData.attachments.forEach((a,i)=>{const start=new T.Vector3(...a.anchor),end=new T.Vector3(...a.base),d=end.clone().sub(start);dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(axis,d.clone().normalize());dummy.scale.set(1,d.length(),1);dummy.updateMatrix();stalks.setMatrixAt(i,dummy.matrix);});stalks.computeBoundingSphere();treeGroup.add(stalks);}
  scene.add(treeGroup);
 }
 function bake(){const id=++job;status.textContent='Baking tissue in background…';worker.postMessage({id,key:$('species').value,seed:Number($('seed').value)||1,age:Number($('age').value)});}
 function tex(buffer,size,srgb=false){const t=new T.DataTexture(new Uint8Array(buffer),size,size);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=Math.min(8,renderer.getMaxAnisotropy());t.needsUpdate=true;maps.push(t);return t;}
 function geometry(rows,cols){const d=leafMesh(species[$('species').value],Number($('seed').value)||1,rows,cols,Number($('curl').value));const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(d.positions,3));g.setAttribute('uv',new T.BufferAttribute(d.uvs,2));g.setIndex(new T.BufferAttribute(d.indices,1));g.computeVertexNormals();geometries.push(g);return g;}
 let baked,hasFramed=false;
 function rebuild(data=baked){if(!data)return;const wasPopulation=population;clear();architecture();population=treeData?treeData.attachments.length:Number($('population').value);const p=species[$('species').value];
 const albedo=tex(data.color,data.size,true),normal=tex(data.normal,data.size),packed=tex(data.packed,data.size);
 const mode=$('view').value;let material;
 if(['albedo','normal','thickness'].includes(mode)){material=new T.MeshBasicNodeMaterial({side:T.DoubleSide});material.colorNode=mode==='albedo'?texture(albedo).rgb:mode==='normal'?texture(normal).rgb:vec3(texture(packed).r);}
 else{material=new T.MeshSSSNodeMaterial({map:albedo,normalMap:normal,roughness:p.roughness,roughnessMap:packed,metalness:0,side:T.DoubleSide,wireframe:mode==='wire'});
 material.normalScale.set(.55,.55);material.roughness=1;
 material.colorNode=texture(albedo).rgb.mul(mix(vec3(1.16,1.12,1.03),vec3(1),frontFacing));
 material.thicknessColorNode=texture(albedo).rgb.mul(texture(packed).r).mul(.42);material.thicknessScaleNode=float(2);material.thicknessPowerNode=float(2);material.thicknessAttenuationNode=float(.7);
 }
 // Static instance transforms; only a time uniform changes each frame. Anchor the petiole.
 const t=positionLocal.y.div(p.length).add(.5).clamp(0,1),phase=instanceIndex.toFloat().mul(2.399);
 const displacement=sin(time.mul(2.1).add(phase).add(t.mul(5))).mul(wind).mul(t.pow(2)).mul(p.length*.035);
 material.positionNode=positionLocal.add(vec3(displacement.mul(.3),0,displacement));materials.push(material);
 const rnd=random(Number($('seed').value)||1),matrices=[],dummy=new T.Object3D();
 leafExtent=1;
 for(let i=0;i<population;i++){
  if(treeData){const a=treeData.attachments[i],direction=new T.Vector3(...a.direction);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);dummy.rotateY(a.roll);dummy.scale.setScalar(a.scale);dummy.position.set(...a.base).addScaledVector(direction,p.length*a.scale*.5);leafExtent=Math.max(leafExtent,a.scale);}
  else{dummy.position.set(population===1?0:(rnd()-.5)*p.length*5,population===1?0:(rnd()-.5)*p.length*4,population===1?0:(rnd()-.5)*p.length*2);dummy.rotation.set(population===1?0:(rnd()-.5)*1.8,population===1?0:(rnd()-.5)*1.8,population===1?0:rnd()*Math.PI*2);dummy.scale.setScalar(population===1?1:.55+rnd()*.65);}
  dummy.updateMatrix();matrices.push(dummy.matrix.clone());}
 for(const [rows,cols] of [[64,16],[16,8],[4,4],[2,2]]){const mesh=new T.InstancedMesh(geometry(rows,cols),material,population);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();if(mesh.boundingSphere)mesh.boundingSphere.radius+=p.length*.06*leafExtent;scene.add(mesh);meshes.push(mesh);}
 $('latin').textContent=p.latin+' / '+Math.round(p.length*1000)+' mm';status.textContent='WEBGPU · seeded procedural tissue · GPU wind';if(!hasFramed||wasPopulation!==population){frame();hasFramed=true;}
 }
 worker.onmessage=({data})=>{if(data.id!==job||disposed)return;baked=data;rebuild();};worker.onerror=e=>{status.textContent='Leaf generation failed: '+e.message;};
 let debounce;for(const id of ['species','seed','age'])$(id).addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(bake,160);});
 for(const id of ['specimen','height','branches','density','leafScale','foliage'])$(id).onchange=()=>{hasFramed=false;rebuild();};
 $('curl').onchange=()=>rebuild();$('population').onchange=()=>rebuild();$('view').onchange=()=>rebuild();$('wind').oninput=()=>wind.value=Number($('wind').value);
 function light(){const a=Number($('light').value)*Math.PI/180;key.position.set(Math.sin(a)*2,.6,Math.cos(a)*2);}light();$('light').oninput=light;
 $('new').onclick=()=>{$('seed').value=1+Math.floor(Math.random()*999998);bake();};$('reset').onclick=frame;
 $('export').onclick=()=>{const recipe={schema:2,generator:'aether-nature-v2',specimen:$('specimen').value,height:Number($('height').value),levels:Number($('branches').value),density:Number($('density').value),leafScale:Number($('leafScale').value),foliage:$('foliage').checked,species:$('species').value,seed:Number($('seed').value),age:Number($('age').value),curl:Number($('curl').value)};const url=URL.createObjectURL(new Blob([JSON.stringify(recipe,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='aether-nature-recipe.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 renderer.setAnimationLoop(now=>{if(disposed||document.hidden)return;controls.update();if(meshes.length){const p=species[$('species').value],distance=Math.max(.001,camera.position.distanceTo(controls.target)),pixels=p.length*leafExtent*$('viewport').clientHeight/(2*distance*Math.tan(camera.fov*Math.PI/360));currentLOD=$('lod').value==='auto'?selectLOD(pixels,currentLOD):Number($('lod').value);meshes.forEach((m,i)=>m.visible=i===currentLOD);}
 renderer.render(scene,camera);if(lastTime){acc+=now-lastTime;frames++;}lastTime=now;if(acc>700){const tris=meshes[currentLOD]?.geometry.index.count/3*population||0;$('metrics').textContent=`${Math.round(frames*1000/acc)} FPS · LOD ${currentLOD} · ${tris.toLocaleString()} triangles · ${population.toLocaleString()} attached leaves${treeData?' · '+treeData.segments.length+' branch segments':''}`;frames=0;acc=0;}});
 renderer.backend.device.lost.then(info=>{if(!disposed)status.textContent='GPU device lost: '+info.message;});
 window.addEventListener('pagehide',()=>{disposed=true;clearTimeout(debounce);worker.terminate();observer.disconnect();renderer.setAnimationLoop(null);controls.dispose();clear();renderer.dispose();},{once:true});bake();
}catch(error){status.textContent=error.message;console.error(error);worker?.terminate();observer?.disconnect();controls?.dispose();renderer?.dispose();}
