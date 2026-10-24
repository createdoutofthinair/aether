// Optional local visual review, never screenshot CI. Requires an existing GPU
// browser and Playwright, exactly like check-city-scene.mjs.
import assert from 'node:assert/strict';
import {rgbaPNG} from '../dist/material-studio/png.js';
import {decodeMaterialPack} from '../dist/material-production/pack.js';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),output=resolve(process.env.MATERIAL_STUDIO_OUTPUT||'/tmp/aether-material-studio'),moduleName=process.env.CITY_GPU_PLAYWRIGHT||'playwright';
const {chromium}=await import(moduleName.startsWith('/')?pathToFileURL(moduleName).href:moduleName),server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://local');if(url.pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}const file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(resolve(root)+sep))throw Error('Outside root');res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;
try{
 await mkdir(output,{recursive:true});browser=await chromium.launch({headless:true,executablePath:process.env.CITY_GPU_CHROMIUM||undefined,args:JSON.parse(process.env.CITY_GPU_BROWSER_ARGS||'["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-webgpu","--use-angle=swiftshader","--enable-unsafe-swiftshader","--enable-features=Vulkan","--use-vulkan=swiftshader","--disable-vulkan-surface"]')});page=await browser.newPage({viewport:{width:1200,height:850}});const errors=[],base=`http://127.0.0.1:${server.address().port}`;await page.route('**/*',r=>r.request().url().startsWith(base+'/')||/^(blob:|data:)/.test(r.request().url())?r.continue():r.abort());page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text().slice(0,240));}});





 await page.goto(base+'/surface-environment.html?standalone=1');await page.waitForFunction(()=>document.body.dataset.environmentReady==='true'||document.body.dataset.error,{},{timeout:180000});assert.equal(await page.locator('body').getAttribute('data-error'),null);await page.screenshot({path:output+'/assembly-enhanced.png'});
 const update=async action=>{const frame=await page.locator('body').getAttribute('data-frame');await action();await page.waitForFunction(n=>document.body.dataset.busy==='false'&&Number(document.body.dataset.frame)>Number(n),frame,{timeout:180000});assert.equal(await page.locator('body').getAttribute('data-error'),null);};
 await update(()=>page.locator('#enhanced').uncheck());await page.screenshot({path:output+'/assembly-baseline.png'});await update(()=>page.locator('#enhanced').check());await update(()=>page.locator('#close').click());await page.screenshot({path:output+'/wall-drain.png'});await update(()=>page.locator('#contact').click());await page.screenshot({path:output+'/ground-contact.png'});await update(()=>page.locator('#corner').click());await page.screenshot({path:output+'/corner.png'});
 await page.getByLabel('Prepared building finish').selectOption('1');await page.waitForFunction(()=>document.body.dataset.busy==='false');await page.screenshot({path:output+'/alloy.png'});
 if(!process.env.CITY_ENVIRONMENT_QUICK){
 await page.goto(base+'/material-editor.html?standalone=1');await page.waitForFunction(()=>document.body.dataset.studioReady==='true'||document.body.dataset.studioError,{},{timeout:180000});await page.getByLabel('Live',{exact:true}).uncheck();await page.getByLabel('Preview shape').selectOption('assembly');await page.waitForFunction(()=>document.body.dataset.surfaceSpecimen==='assembly',{},{timeout:180000});await page.getByLabel('Environment detail').uncheck();await page.waitForFunction(()=>document.body.dataset.surfaceEnvironment==='false');await page.getByLabel('Environment detail').check();await page.waitForFunction(()=>document.body.dataset.surfaceEnvironment==='true');await page.screenshot({path:output+'/designer-assembly.png'});
 await page.goto(base+'/city-grammar.html');await page.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.renderedBuild===document.body.dataset.build&&!document.body.dataset.error,{},{timeout:240000});await page.locator('#entry').click();await page.screenshot({path:output+'/native-building.png'});assert.equal(await page.locator('body').getAttribute('data-error'),null);
 }
 assert.deepEqual(errors,[]);await writeFile(output+'/result.json',JSON.stringify({errors,checks:['assembled shader / context anchors','baseline / enhanced','drain / ground / corner','metal finish',...(process.env.CITY_ENVIRONMENT_QUICK?[]:['designer integration','native building'])]},null,2));console.log('Surface environment WebGPU visual validation passed:',output);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
