// A single composition carries the solid insignia into its vector credit-roll form.
export function titleState(seconds,reduced=false){
 const clamp=v=>Math.max(0,Math.min(1,v));
 const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
 const dissolve=reduced?1:ease((seconds-3.2)/2.5);
 return {reveal:reduced?1:ease(seconds/1.8),dissolve,settle:reduced?1:ease(seconds/3.2),scroll:reduced||seconds>=7.2};
}
export async function createTitleSequence(stage){
 const canvasHost=stage.querySelector('.title-solid'),svg=stage.querySelector('svg');
 let renderer,scene,camera,emblem,materials=[],disposed=false;
 const api={ready:false,render(seconds,reduced=false){
   const state=titleState(seconds,reduced);stage.style.setProperty('--solid',String(state.reveal*(1-state.dissolve)));stage.style.setProperty('--vector',String(state.dissolve));stage.style.setProperty('--draw',String(1-state.dissolve));stage.style.setProperty('--flare',String(Math.sin(state.dissolve*Math.PI)*.75));
   stage.classList.toggle('title-resolved',state.dissolve===1);
   if(renderer&&!disposed&&state.dissolve<1){emblem.rotation.y=(1-state.settle)*-.42;emblem.rotation.x=(1-state.settle)*.12;emblem.scale.setScalar(.92+.08*state.settle);scene.children.filter(o=>o.isDirectionalLight)[0].position.x=-5+10*Math.min(seconds/5.7,1);renderer.render(scene,camera);}
   return state;
 },dispose(){disposed=true;resize?.disconnect();if(emblem){const geometries=new Set();emblem.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());}materials.forEach(m=>m.dispose());environment?.dispose();pmrem?.dispose();renderer?.dispose();renderer?.domElement.remove();}};
 let resize,environment,pmrem;
 try{
  const [T,{createEmblem},{RoomEnvironment}]=await Promise.all([import('three/webgpu'),import('../viewer/emblem.js?v=orbit-clearance-2'),import('three/addons/environments/RoomEnvironment.js')]);
  if(disposed)return api;
  renderer=new T.WebGPURenderer({alpha:true,antialias:true});await renderer.init();if(disposed){renderer.dispose();return api;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;canvasHost.append(renderer.domElement);
  scene=new T.Scene();camera=new T.OrthographicCamera(-3,3,3,-3,.1,50);camera.position.set(0,.1,12);camera.lookAt(0,.1,0);
  const metal=new T.MeshPhysicalMaterial({color:0xbccbd6,metalness:1,roughness:.25,clearcoat:.25});emblem=createEmblem(metal);scene.add(emblem);
  emblem.traverse(o=>{if(o.material&&!materials.includes(o.material))materials.push(o.material);});
  const room=new RoomEnvironment();pmrem=new T.PMREMGenerator(renderer);environment=pmrem.fromScene(room,.04);room.dispose();scene.environment=environment.texture;scene.environmentIntensity=.85;
  const key=new T.DirectionalLight(0xe6f4ff,7);key.position.set(-5,4,6);scene.add(key);const rim=new T.DirectionalLight(0x71d9ff,10);rim.position.set(4,2,-3);scene.add(rim);scene.add(new T.AmbientLight(0x96b9df,.5));
  // Project the actual settled 3D geometry: the line image and solid share contours.
  emblem.updateMatrixWorld(true);camera.updateMatrixWorld(true);const ns='http://www.w3.org/2000/svg';const group=document.createElementNS(ns,'g');group.setAttribute('class','projected-logo');
  emblem.traverse(o=>{if(!o.isMesh)return;const edges=new T.EdgesGeometry(o.geometry,35),p=edges.attributes.position,v=new T.Vector3();let d='';for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(camera);d+=(i%2?'L':'M')+((v.x+1)*300).toFixed(2)+','+((1-v.y)*300).toFixed(2);}edges.dispose();if(d){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('pathLength','1');group.append(path);}});
  // A smooth orbital silhouette remains readable after the solid planet dissolves.
  svg.replaceChildren(group);resize=new ResizeObserver(()=>{if(disposed)return;const size=canvasHost.clientWidth;if(size)renderer.setSize(size,size);});resize.observe(canvasHost);
  api.ready=true;
 }catch(error){console.warn('Aether title uses vector fallback:',error.message);renderer?.dispose();renderer=undefined;canvasHost.replaceChildren();}
 return api;
}
