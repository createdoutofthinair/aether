// Optional local WebGPU pixel check. No CI screenshot workflow.
// CITY_GPU_PLAYWRIGHT=/absolute/playwright/index.mjs
// CITY_GPU_CHROMIUM=/absolute/chromium node scripts/check-city-gpu.mjs
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),moduleName=process.env.CITY_GPU_PLAYWRIGHT||'playwright';
const {chromium}=await import(moduleName.startsWith('/')?pathToFileURL(moduleName).href:moduleName);
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/check.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><script type="importmap">{"imports":{"three":"/vendor-gpu/three.webgpu.js","three/webgpu":"/vendor-gpu/three.webgpu.js","three/tsl":"/vendor-gpu/three.tsl.js","three/addons/":"/vendor-gpu/addons/"}}</script>');return;}
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!path.startsWith(resolve(root)+sep))throw Error('Outside root');
  res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));
 }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CITY_GPU_CHROMIUM||undefined,args:JSON.parse(process.env.CITY_GPU_BROWSER_ARGS||'["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-webgpu","--ignore-gpu-blocklist","--use-angle=swiftshader","--enable-unsafe-swiftshader"]')});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`http://127.0.0.1:${server.address().port}/check.html`);
 const result=await page.evaluate(async()=>{
  const T=await import('three/webgpu'),{uniform}=await import('three/tsl'),{restoreLibrary}=await import('/city/assets.js'),{bakeImpostor,impostorMaterial}=await import('/forest/impostor.js'),{instanceBucket,uploadBucket}=await import('/forest/assets.js'),{compactReadback}=await import('/render/readback.js');
  const worker=new Worker('/city/worker.js',{type:'module'}),data=await new Promise((resolve,reject)=>{worker.onmessage=({data})=>{if(!data.progress)data.error?reject(Error(data.error)):resolve(data);};worker.onerror=e=>reject(Error(e.message));worker.postMessage({id:1,type:'library',seed:'GPU-CONCORD',wear:.35});});worker.terminate();
  const library=restoreLibrary(data,{debug:uniform(0)}),renderer=new T.WebGPURenderer({antialias:true,reversedDepthBuffer:true});await renderer.init();renderer.toneMapping=T.ACESFilmicToneMapping;
  const device=renderer.backend.device,validation=[];device.addEventListener('uncapturederror',e=>validation.push(e.error.message));
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1.6,.1,5000),light=new T.DirectionalLight(0xffe5cc,3);scene.background=new T.Color(0x080d14);light.position.set(200,300,100);scene.add(light,new T.HemisphereLight(0xbdddea,0x465744,2));camera.position.set(700,800,1750);camera.lookAt(170,45,455);
  const target=new T.RenderTarget(640,400,{samples:4});target.texture.colorSpace=T.SRGBColorSpace;const meshes=[],imps=[],atlases=[],captures=[];
  function place(mesh,v,i,lod){const x=(i%4)*115+(lod===3?v.atlas.center.x:0),z=Math.floor(i/4)*130+(lod===3?v.atlas.center.z:0),s=1;mesh.setMatrixAt(0,new T.Matrix4().makeTranslation(x,lod===3?v.atlas.center.y:0,z));mesh.count=1;const a=mesh.geometry.attributes;a.forestCenter.setXYZ(0,x,lod===3?v.atlas.center.y:0,z);for(const [k,value]of [['forestScale',s],['forestWidth',1],['forestTint',1],['forestFade',1],['forestLevel',lod]])a[k].setX(0,value);uploadBucket(mesh);scene.add(mesh);}
  for(let i=0;i<library.variants.length;i++){
   const v=library.variants[i];v.atlas=await bakeImpostor(renderer,v.capture,{tile:96,encodeEmission:true});atlases.push(v.atlas);captures.push(v.atlas.coverage.length);
   for(const source of v.lods[1]){const mesh=instanceBucket(source.geometry,source.material,1);place(mesh,v,i,1);meshes.push(mesh);}
   const material=impostorMaterial(v.atlas,{sun:uniform(new T.Vector3(.4,.8,.3).normalize()),debug:uniform(0)}),g=new T.PlaneGeometry(v.atlas.span,v.atlas.span),imp=instanceBucket(g,material,1);g.dispose();place(imp,v,i,3);imp.visible=false;imps.push(imp);
  }
  async function pixels(){renderer.setRenderTarget(target);renderer.render(scene,camera);await device.queue.onSubmittedWorkDone();const raw=await renderer.readRenderTargetPixelsAsync(target,0,0,640,400),p=compactReadback(raw,640,400);let occupied=0,brightness=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>90){occupied++;brightness+=p[i]+p[i+1]+p[i+2];}return{occupied,mean:brightness/Math.max(1,occupied)/3};}
  const meshPixels=await pixels();meshes.forEach(m=>m.visible=false);imps.forEach(m=>m.visible=true);const impostorPixels=await pixels();
  // Force a material swap back to meshes; impostor admission must not mutate
  // or dispose shared geometry, maps or node materials.
  meshes.forEach(m=>m.visible=true);imps.forEach(m=>m.visible=false);const restoredPixels=await pixels();
  renderer.setRenderTarget(null);target.dispose();for(const mesh of [...meshes,...imps]){mesh.dispose();mesh.geometry.dispose();}imps.forEach(m=>m.material.dispose());atlases.forEach(a=>{a.color.dispose();a.normal.dispose();});library.dispose();renderer.dispose();return{captures,meshPixels,impostorPixels,restoredPixels,validation};
 });
 assert.deepEqual(result.captures,Array(48).fill(25));assert.ok(result.meshPixels.occupied>2000);assert.ok(result.meshPixels.mean>45,'Architectural PBR must not compile to a black albedo');assert.ok(result.impostorPixels.occupied>result.meshPixels.occupied*.35,'Distant representation must preserve population coverage');assert.deepEqual(result.restoredPixels,result.meshPixels);assert.deepEqual(result.validation,[]);assert.deepEqual(errors,[]);
 console.log('City GPU pixels: 1200 capture directions, PBR + packed instancing, non-aligned atlas readback, impostor coverage, mesh restoration and zero device validation errors passed:',JSON.stringify(result));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
