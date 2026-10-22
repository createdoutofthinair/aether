// Optional, local GPU regression. No CI screenshot job or production dependency.
// Supply a Playwright module / browser executable when they are not installed.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const moduleName=process.env.FOREST_GPU_PLAYWRIGHT||'playwright';
const {chromium}=await import(moduleName.startsWith('/')?pathToFileURL(moduleName).href:moduleName);
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/check.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><script type="importmap">{"imports":{"three":"/vendor-gpu/three.webgpu.js","three/webgpu":"/vendor-gpu/three.webgpu.js","three/tsl":"/vendor-gpu/three.tsl.js"}}</script>');return;}
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!path.startsWith(resolve(root)+sep))throw Error('Outside root');
  const data=await readFile(path);res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html'})[extname(path)]||'application/octet-stream');res.end(data);
 }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.FOREST_GPU_CHROMIUM||undefined,args:JSON.parse(process.env.FOREST_GPU_BROWSER_ARGS||'["--enable-unsafe-webgpu","--ignore-gpu-blocklist","--use-angle=swiftshader","--enable-unsafe-swiftshader"]')});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`http://127.0.0.1:${server.address().port}/check.html`);
 const result=await page.evaluate(async()=>{
  const T=await import('three/webgpu'),{uniform}=await import('three/tsl');
  const {bakeImpostor,impostorMaterial}=await import('/forest/impostor.js'),{instanceBucket,uploadBucket}=await import('/forest/assets.js');
  const renderer=new T.WebGPURenderer({antialias:true});await renderer.init();
  const device=renderer.backend.device,validation=[];device.addEventListener('uncapturederror',e=>validation.push(e.error.message));
  const source=new T.Group(),pillar=new T.Mesh(new T.BoxGeometry(1,4,1),new T.MeshBasicNodeMaterial({color:0x33ff33}));pillar.position.y=2;source.add(pillar);
  const atlas=await bakeImpostor(renderer,source),material=impostorMaterial(atlas,{sun:uniform(new T.Vector3(0,1,0)),debug:uniform(0)});
  const mesh=instanceBucket(new T.PlaneGeometry(atlas.span,atlas.span),material,25),scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1.5,.1,1000);
  camera.position.set(12,8,18);camera.lookAt(0,2,0);scene.add(mesh);renderer.setClearColor(0x303030,1);
  let index=0;for(let z=-6;z<=6;z+=3)for(let x=-6;x<=6;x+=3){mesh.setMatrixAt(index,new T.Matrix4().makeTranslation(x,2,z));for(const [k,v]of [['forestScale',1],['forestWidth',1],['forestTint',1],['forestFade',1]])mesh.geometry.attributes[k].setX(index,v);mesh.geometry.attributes.forestCenter.setXYZ(index,x,2,z);index++;}
  mesh.count=index;uploadBucket(mesh);
  // Offscreen output exercises WebGPU pipelines, MSAA and pixel readback. It
  // avoids headless browser swapchain limitations on software-only devices.
  const output=new T.RenderTarget(600,400,{samples:4});renderer.setRenderTarget(output);
  const countGreen=async()=>{renderer.render(scene,camera);await device.queue.onSubmittedWorkDone();const p=await renderer.readRenderTargetPixelsAsync(output,0,0,600,400);let n=0;for(let i=0;i<p.length;i+=4)if(p[i+1]>50&&p[i+1]>p[i]*1.5&&p[i+1]>p[i+2]*1.5)n++;return n;};
  const visiblePixels=await countGreen();
  for(let i=0;i<mesh.count;i++)mesh.geometry.attributes.forestCenter.setY(i,1000);
  uploadBucket(mesh);const movedPixels=await countGreen();
  const result={adapter:device.adapterInfo?.description,maxVertexBuffers:device.limits.maxVertexBuffers,instances:mesh.count,validatedCaptures:atlas.coverage.length,visiblePixels,movedPixels,validation};
  renderer.setRenderTarget(null);output.dispose();atlas.color.dispose();atlas.normal.dispose();mesh.geometry.dispose();mesh.dispose();material.dispose();pillar.geometry.dispose();pillar.material.dispose();renderer.dispose();return result;
 });
 assert.equal(result.instances,25);assert.equal(result.validatedCaptures,25);
 assert.ok(result.visiblePixels>2000,`Impostors missing from rendered pixels: ${result.visiblePixels}`);
 assert.equal(result.movedPixels,0,'Packed instance updates must reach the GPU');
 assert.deepEqual(result.validation,[]);assert.deepEqual(errors,[]);
 console.log('Forest GPU pixel regression passed:',JSON.stringify(result));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
