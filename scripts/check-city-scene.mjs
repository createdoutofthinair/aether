// Optional local WebGPU visual review, not a screenshot CI pipeline.
// Reuses the production City Lab, renderer, worker, CSM and GTAO; only the
// fixture's initial controls select mesh-only rendering to omit atlas capture.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),output=resolve(process.env.CITY_SCENE_OUTPUT||'/tmp/aether-city-scene'),moduleName=process.env.CITY_GPU_PLAYWRIGHT||'playwright';
const {chromium}=await import(moduleName.startsWith('/')?pathToFileURL(moduleName).href:moduleName);
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://local');if(url.pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}
 let file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(resolve(root)+sep))throw Error('Outside root');
 if(url.pathname==='/scene.html'){
  let html=await readFile(resolve(root,'city-lab.html'),'utf8');html=html.replace('<script type="module" src="navigation.js"></script>','').replace('<option value="4">4</option><option value="6" selected>6</option>','<option value="4" selected>4</option><option value="6">6</option>').replace('<option value="auto">Automatic','<option value="auto">Automatic').replace('<option value="mesh">','<option value="mesh" selected>');res.setHeader('Content-Type','text/html');res.end(html);return;
 }
 res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,page;
try{
 await mkdir(output,{recursive:true});browser=await chromium.launch({headless:true,executablePath:process.env.CITY_GPU_CHROMIUM||undefined,args:JSON.parse(process.env.CITY_GPU_BROWSER_ARGS||'["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-webgpu","--use-angle=swiftshader","--enable-unsafe-swiftshader","--enable-features=Vulkan","--use-vulkan=swiftshader","--disable-vulkan-surface"]')});
 page=await browser.newPage({viewport:{width:Number(process.env.CITY_SCENE_WIDTH||1280),height:Number(process.env.CITY_SCENE_HEIGHT||900)}});const errors=[],base=`http://127.0.0.1:${server.address().port}`;
 await page.route('**/*',route=>route.request().url().startsWith(base+'/')||/^(blob:|data:)/.test(route.request().url())?route.continue():route.abort());
 page.on('pageerror',e=>{errors.push(e.message);console.log('Page error:',e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('Console error:',m.text().slice(0,180));}});
 await page.goto(base+'/scene.html');const adapter=await page.evaluate(async()=>!!await navigator.gpu?.requestAdapter());assert.equal(adapter,true,'This optional review requires a WebGPU adapter');
 console.log('Waiting for production city and its first CSM/GTAO frame.');
 await page.waitForFunction(()=>Number(document.body.dataset.frame)>1||document.body.dataset.gpuError||document.querySelector('#status').textContent.includes('failed'),{},{timeout:180000});
 assert.equal(await page.locator('body').getAttribute('data-gpu-error'),null);assert.ok(Number(await page.locator('body').getAttribute('data-frame'))>1);assert.deepEqual(errors,[]);
 const frames=async()=>{const frame=Number(await page.locator('body').getAttribute('data-frame'));await page.waitForFunction(n=>Number(document.body.dataset.frame)>n+1,frame,{timeout:90000});};
 const lights=(process.env.CITY_SCENE_PRESETS||'golden,day,overcast,raking,blue,night').split(',').filter(Boolean),layouts=(process.env.CITY_SCENE_LAYOUTS||'organic,ribbon,circular').split(',').filter(Boolean);
 for(const light of lights){await page.locator('#lighting').selectOption(light);await frames();await page.screenshot({path:output+'/'+light+'.png'});console.log('Rendered lighting:',light);}
 await page.locator('#lighting').selectOption('golden');
 for(const layout of layouts){await page.locator('#layout').selectOption(layout);await page.locator('#generate').click();await page.waitForFunction(()=>!document.querySelector('#generate').disabled,{},{timeout:120000});await frames();await page.screenshot({path:output+'/'+layout+'.png'});console.log('Rendered layout:',layout);}
 await page.locator('#street').click();await frames();await page.screenshot({path:output+'/street.png'});
 const download=page.waitForEvent('download');await page.locator('#report').click();await(await download).saveAs(output+'/measurements.json');
 const report=JSON.parse(await readFile(output+'/measurements.json','utf8'));assert.equal(report.backend,'WebGPU');assert.ok(report.shadowCasters>0);assert.equal(report.shadowCascades,3);assert.equal(report.occlusion,true);assert.deepEqual(errors,[]);
 await writeFile(output+'/result.json',JSON.stringify({backend:'WebGPU',presets:lights.length,layouts:layouts.length+1,errors,report},null,2));console.log('Production WebGPU city review passed:',output);
}catch(e){if(page){console.error('Last status:',await page.locator('#status').textContent().catch(()=>''));await page.screenshot({path:output+'/failure.png',timeout:10000}).catch(()=>{});}throw e;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
