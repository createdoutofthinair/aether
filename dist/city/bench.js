import {citySurfaceWebGL} from './surface-webgl.js';
import {CITY_LIGHTING,cityLighting} from './lighting.js';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {unpackShip,disposeShip} from '../render/ship-assets.js';
import {BUILDING_FAMILIES,PLANET_STYLES,architecturalRecipe,restoreArchitecture} from './architecture.js';
import {ARCHITECTURAL_KITS} from './design.js';
import {DRAFT_KEY} from './studio-state.js';
import {auditGeometry} from './geometry-audit.js';

const $=id=>document.getElementById(id),note=s=>$('status').textContent=s,params=new URLSearchParams(location.search);
let renderer,controls,root=null,current=null,worker=null,job=0,working=false,imported=null,duplicateMesh=null,suiteResults=[],dead=false,dirty=true;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,20000),sun=new T.DirectionalLight(0xfff0d2,3),fill=new T.HemisphereLight(0xc8dfe6,0xb8ad94,2.1),cutPlane=new T.Plane(new T.Vector3(0,-1,0),10000),partMaterials=new Map();
const clay=new T.MeshStandardMaterial({color:0xb9c4bc,roughness:.8}),normals=new T.MeshNormalMaterial(),wire=new T.MeshBasicMaterial({color:0x244f57,wireframe:true}),uvCanvas=document.createElement('canvas');uvCanvas.width=uvCanvas.height=128;
const uvContext=uvCanvas.getContext('2d');for(let y=0;y<8;y++)for(let x=0;x<8;x++){uvContext.fillStyle=(x+y)%2?'#568e91':'#f0e3ba';uvContext.fillRect(x*16,y*16,16,16);}
const checker=new T.CanvasTexture(uvCanvas);checker.colorSpace=T.SRGBColorSpace;checker.wrapS=checker.wrapT=T.RepeatWrapping;
const uvMaterial=new T.MeshBasicMaterial({map:checker}),diagnosticMaterials=[clay,normals,wire,uvMaterial];
scene.add(sun,sun.target,fill);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.07;sun.shadow.bias=-.00008;
const ground=new T.Mesh(new T.PlaneGeometry(20000,20000),new T.MeshStandardMaterial({color:0xc4c8b9,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;scene.add(ground);
function selectOptions(id,entries){$(id).replaceChildren(...entries.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));}
selectOptions('light',Object.entries(CITY_LIGHTING).map(([id,p])=>[id,p.label]));$('light').value='golden';
selectOptions('family',BUILDING_FAMILIES.map(f=>[f.id,f.label]));$('suite').textContent='Inspect all '+BUILDING_FAMILIES.length+' families';selectOptions('kit',Object.entries(ARCHITECTURAL_KITS).map(([id,k])=>[id,k.name]));selectOptions('planet',Object.entries(PLANET_STYLES).map(([id,s])=>[id,s.label]));
$('family').value=BUILDING_FAMILIES.some(f=>f.id===params.get('family'))?params.get('family'):'citadel';$('kit').value=Object.hasOwn(ARCHITECTURAL_KITS,params.get('kit'))?params.get('kit'):'aurelia';$('planet').value='garden';if(params.get('seed'))$('seed').value=params.get('seed');
function recipe(){return imported||architecturalRecipe($('family').value,$('seed').value||'AURELIA-01',Number($('profile').value),{style:$('planet').value,design:{kit:$('kit').value}});}
function request(recipe,lod=Number($('lod').value)){
 worker?.terminate();const id=++job;worker=new Worker(new URL('./studio-worker.js',import.meta.url),{type:'module'});
 return new Promise((resolve,reject)=>{worker.onmessage=({data})=>{if(data.id!==job)return;if(data.error)reject(Error(data.error));else resolve(data);};worker.onerror=e=>reject(Error(e.message));worker.postMessage({id,recipe,lod,wear:Number($('wear').value)});});
}
function release(){
 if(duplicateMesh){scene.remove(duplicateMesh);duplicateMesh.geometry.dispose();duplicateMesh.material.dispose();duplicateMesh=null;}
 if(root){scene.remove(root);for(const m of root.children)m.material=m.userData.original;disposeShip(root);root=null;}
}
function install(data){
 $('error').hidden=true;release();root=unpackShip(data.payload);const canonical=new Map();
 for(const mesh of root.children){
  const original=mesh.material;if(!canonical.has(original.name)){original.transparent=false;original.opacity=1;citySurfaceWebGL(original,T.ShaderChunk);canonical.set(original.name,original);}else original.dispose();
  mesh.material=canonical.get(original.name);mesh.userData.original=mesh.material;mesh.castShadow=mesh.receiveShadow=true;
 }
 for(const p of data.parts)for(const m of root.children.slice(p.start,p.start+p.count))Object.assign(m.userData,{moduleId:p.moduleId,kind:p.kind});
 root.visible=true;scene.add(root);root.updateMatrixWorld(true);const audit=auditGeometry(data.payload);current={...data,audit};
 const positions=[];for(const d of audit.duplicates){const m=data.payload.meshes[d.mesh];for(let j=0;j<3;j++){const i=m.index?m.index[d.triangle*3+j]:d.triangle*3+j;positions.push(...m.attributes.position.array.slice(i*3,i*3+3));}}
 if(positions.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));duplicateMesh=new T.Mesh(g,new T.MeshBasicMaterial({color:0xe3338c,side:T.DoubleSide,depthTest:false}));duplicateMesh.renderOrder=10;scene.add(duplicateMesh);}
 selectOptions('mass',[['all','All masses'],...data.assembly.volumes.map(v=>[v.id,v.label||v.id]),['foundation','Foundation'],['access','Access']]);
 $('name').textContent=data.recipe.label||BUILDING_FAMILIES.find(f=>f.id===data.recipe.family).label;$('title').textContent=`${data.recipe.family.toUpperCase()} / ${data.recipe.seed} / LOD ${$('lod').value}`;$('label').textContent=ARCHITECTURAL_KITS[data.recipe.design.kit].subtitle.toUpperCase();
 for(const [id,key]of [['invalid','invalid'],['degenerate','degenerate'],['normals','badNormals'],['duplicates','duplicateTriangles']])$(id).textContent=audit[key].toLocaleString();
 $('health').textContent=audit.ok?'Passed buffer checks':'Review flagged geometry';$('health').style.color=audit.ok?'#2d7371':'#a04739';$('stats').textContent=`${audit.triangles.toLocaleString()} TRI · ${data.stats.draws} DRAWS · ${data.assembly.volumes.length} MASSES`;
 const box=new T.Box3().setFromObject(root),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z,40);
 sun.position.copy(center).add(new T.Vector3(span,span*1.6,span*.8));sun.target.position.copy(center);sun.target.updateMatrixWorld();Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:.1,far:span*6});sun.shadow.camera.updateProjectionMatrix();
 fit();display();lighting();note(`Ready · exact production worker buffers · ${audit.ok?'audit passed':'review audit'}`);
}
function fit(view='perspective'){
 if(!root)return;const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),span=Math.max(size.y,size.x/Math.max(camera.aspect,.3),size.z,20),distance=span/(2*Math.tan(camera.fov*Math.PI/360))*1.35;
 const direction={front:[0,.08,1],back:[0,.08,-1],top:[0,1,.001],perspective:[.9,.45,1.4]}[view];camera.position.copy(center).add(new T.Vector3(...direction).normalize().multiplyScalar(distance));camera.near=Math.max(.05,span/3000);camera.far=Math.max(5000,distance*10);camera.updateProjectionMatrix();controls.target.copy(center);controls.update();
}
function display(){
 dirty=true;if(!root)return;const mode=$('mode').value,mass=$('mass').value,layer=$('layer').value,side=$('double').checked?T.DoubleSide:T.FrontSide;
 for(const mesh of root.children){
  mesh.visible=(mass==='all'||mass===mesh.userData.moduleId)&&(layer==='all'||layer===mesh.userData.kind);let material=mesh.userData.original;
  if(mode==='parts'){const id=mesh.userData.moduleId;if(!partMaterials.has(id)){const hash=[...id].reduce((a,c)=>a+c.charCodeAt(0),0);partMaterials.set(id,new T.MeshStandardMaterial({color:new T.Color().setHSL(hash*.071%1,.37,.6),roughness:.8}));}material=partMaterials.get(id);}
  else material=({clay,normals,wire,uv:uvMaterial})[mode]||material;
  if(material.side!==side){material.side=side;material.needsUpdate=true;}mesh.material=material;
 }
 if(duplicateMesh)duplicateMesh.visible=mode==='duplicates'&&mass==='all'&&layer==='all';
 const cut=Number($('cut').value);cutPlane.constant=current.audit.bounds.max[1]*cut/100;renderer.clippingPlanes=cut===100?[]:[cutPlane];$('cutValue').textContent=cut===100?'Off':cutPlane.constant.toFixed(1)+' m';
 controls.autoRotate=$('rotate').checked;controls.autoRotateSpeed=.7;
}
function lighting(){
 dirty=true;const p=cityLighting($('light').value);sun.color.set(p.sun);sun.intensity=p.intensity;fill.intensity=p.ambient;fill.color.set(p.horizon);fill.groundColor.set(p.ground);scene.background=new T.Color(p.horizon);scene.environmentIntensity=p.environment;renderer.toneMappingExposure=p.exposure*Number($('exposure').value);
 if(root){const box=new T.Box3().setFromObject(root),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z,40);sun.position.copy(center).add(new T.Vector3(...p.direction).normalize().multiplyScalar(span*3));sun.target.position.copy(center);sun.target.updateMatrixWorld();for(const material of new Set(root.children.map(m=>m.userData.original)))if(material.name==='Occupied rooms and wayfinding')material.emissiveIntensity=p.rooms;}
}

async function build(){if(working||!renderer)return;working=true;note('Generating and clipping building surfaces…');try{install(await request(recipe()));}catch(e){note('Build failed');$('error').hidden=false;$('error').textContent=e.message;}finally{working=false;}}
function load(document){imported=restoreArchitecture(document);$('family').value=imported.family;$('kit').value=imported.design.kit;$('planet').value=imported.style;$('seed').value=imported.seed;$('profile').value=imported.profile;build();}
function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function suite(){
 if(working||!renderer)return;working=true;const original=recipe(),originalMode=$('mode').value,originalMass=$('mass').value;let failed=0;suiteResults=[];$('gallery').replaceChildren();$('gallery').hidden=false;$('suite').disabled=true;$('mode').value='materials';$('layer').value='all';$('cut').value=100;$('rotate').checked=false;
 try{
  for(const [i,family]of BUILDING_FAMILIES.entries()){
   note(`Inspecting ${i+1}/${BUILDING_FAMILIES.length} · ${family.label}…`);const specimen=architecturalRecipe(family.id,original.seed,Number($('profile').value),{style:original.style,design:original.design}),data=await request(specimen);install(data);renderer.render(scene,camera);
   const thumbnail=document.createElement('canvas');thumbnail.width=320;thumbnail.height=240;const ctx=thumbnail.getContext('2d'),canvas=renderer.domElement,scale=Math.min(320/canvas.width,240/canvas.height);ctx.fillStyle='#cbdde0';ctx.fillRect(0,0,320,240);ctx.drawImage(canvas,(320-canvas.width*scale)/2,(240-canvas.height*scale)/2,canvas.width*scale,canvas.height*scale);
   const a=current.audit,record={family:family.id,seed:specimen.seed,lod:Number($('lod').value),audit:{...a,duplicates:undefined}};suiteResults.push(record);if(!a.ok)failed++;
   const button=document.createElement('button'),image=document.createElement('img'),label=document.createElement('span'),small=document.createElement('small');button.className='specimen';image.src=thumbnail.toDataURL('image/png');image.alt=family.label;label.textContent=family.label;small.textContent=`${Math.round(a.triangles/1000)}k triangles · ${a.ok?'passed':a.duplicateTriangles+' duplicate faces'}`;label.append(small);button.append(image,label);button.onclick=()=>{if(working)return;imported=null;$('family').value=family.id;build();};$('gallery').append(button);
  }
 }catch(e){note(e.message);failed++;}finally{install(await request(original));$('mode').value=originalMode;$('mass').value=originalMass;display();working=false;$('suite').disabled=false;note(`Family review complete · ${suiteResults.length}/${BUILDING_FAMILIES.length} built · ${failed} flagged. Click a specimen below to inspect.`);}
}
$('generate').onclick=()=>{imported=null;build();};for(const id of ['family','kit','planet','profile','seed'])$(id).onchange=()=>{imported=null;build();};for(const id of ['lod','wear'])$(id).onchange=build;
for(const id of ['mode','mass','layer','double','rotate'])$(id).onchange=display;$('cut').oninput=display;for(const id of ['light','exposure'])$(id).oninput=lighting;
for(const view of ['fit','front','back','top'])$(view).onclick=()=>fit(view==='fit'?'perspective':view);
$('draft').onclick=()=>{try{const draft=localStorage.getItem(DRAFT_KEY);if(!draft)throw Error('No saved Architecture Lab draft on this origin. Import an exported recipe instead.');load(JSON.parse(draft));}catch(e){note(e.message);}};
$('import').onclick=()=>$('file').click();$('file').onchange=async()=>{try{const file=$('file').files[0];if(file)load(JSON.parse(await file.text()));}catch(e){note(e.message);}finally{$('file').value='';}};
$('suite').onclick=suite;$('report').onclick=()=>{if(current)download('aether-geometry-audit.json',{schema:'aether.geometry-review/1',renderer:'WebGL2 diagnostic / Three r186',recipe:current.recipe,lod:Number($('lod').value),wear:Number($('wear').value),audit:current.audit,camera:{position:camera.position.toArray(),target:controls.target.toArray(),fov:camera.fov},display:{mode:$('mode').value,layer:$('layer').value,mass:$('mass').value,cut:Number($('cut').value),backFaces:$('double').checked,light:$('light').value,exposure:Number($('exposure').value)},suite:suiteResults});};
try{
 renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;$('viewport').prepend(renderer.domElement);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.addEventListener('change',()=>dirty=true);controls.minDistance=3;controls.maxDistance=12000;
 // A procedural exterior reflection field, not the black default environment.
 const sky=document.createElement('canvas');sky.width=512;sky.height=256;const ctx=sky.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,256);for(const [stop,color]of [[0,'#82b0cc'],[.47,'#dce8df'],[.55,'#ece3c9'],[1,'#858e78']])gradient.addColorStop(stop,color);ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);ctx.fillStyle='#fff2d4';ctx.beginPath();ctx.ellipse(130,70,25,20,0,0,Math.PI*2);ctx.fill();const skyTexture=new T.CanvasTexture(sky);skyTexture.colorSpace=T.SRGBColorSpace;skyTexture.mapping=T.EquirectangularReflectionMapping;const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(skyTexture);scene.environment=environment.texture;scene.environmentIntensity=.8;skyTexture.dispose();pmrem.dispose();
 const resize=new ResizeObserver(()=>{const rect=$('viewport').getBoundingClientRect();renderer.setSize(rect.width,rect.height);dirty=true;camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();});resize.observe($('viewport'));
 let previous=0;renderer.setAnimationLoop(now=>{if(dead||document.hidden)return;controls.update(previous?Math.min(.1,(now-previous)/1000):0);previous=now;if(dirty||controls.autoRotate){renderer.render(scene,camera);dirty=false;}});build();
 window.addEventListener('pagehide',()=>{dead=true;worker?.terminate();resize.disconnect();renderer.setAnimationLoop(null);controls.dispose();release();diagnosticMaterials.forEach(m=>m.dispose());partMaterials.forEach(m=>m.dispose());checker.dispose();ground.geometry.dispose();ground.material.dispose();environment.dispose();renderer.dispose();},{once:true});
}catch(e){$('error').hidden=false;$('error').textContent='WebGL 2 test scene could not start: '+e.message;note('Renderer unavailable');}
