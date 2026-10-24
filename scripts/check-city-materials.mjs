// Optional local visual review, never screenshot CI. Requires an existing GPU
// browser and Playwright, exactly like check-city-scene.mjs.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),output=resolve(process.env.CITY_MATERIAL_OUTPUT||'/tmp/aether-city-materials'),moduleName=process.env.CITY_GPU_PLAYWRIGHT||'playwright';
const {chromium}=await import(moduleName.startsWith('/')?pathToFileURL(moduleName).href:moduleName),server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://local');if(url.pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}const file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(resolve(root)+sep))throw Error('Outside root');res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;
try{
 await mkdir(output,{recursive:true});browser=await chromium.launch({headless:true,executablePath:process.env.CITY_GPU_CHROMIUM||undefined,args:JSON.parse(process.env.CITY_GPU_BROWSER_ARGS||'["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-webgpu","--use-angle=swiftshader","--enable-unsafe-swiftshader","--enable-features=Vulkan","--use-vulkan=swiftshader","--disable-vulkan-surface"]')});page=await browser.newPage({viewport:{width:1200,height:850}});const errors=[],base=`http://127.0.0.1:${server.address().port}`;await page.route('**/*',r=>r.request().url().startsWith(base+'/')||/^(blob:|data:)/.test(r.request().url())?r.continue():r.abort());page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text().slice(0,240));}});

 const {buildingMaterialRecipe,buildingMaterialPreset,BUILDING_FINISH_KEY}=await import('../dist/city/building-material.js');
 await page.addInitScript(({key,recipe})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(recipe));},{key:BUILDING_FINISH_KEY,recipe:process.env.CITY_MATERIAL_QUICK?{...buildingMaterialPreset('coastal'),resolution:1024}:buildingMaterialRecipe({resolution:512})});
 await page.goto(base+'/city-materials.html?legacy=1');
 const ready=()=>page.waitForFunction(()=>document.body.dataset.materialReady==='true'&&document.body.dataset.renderedBuild===document.body.dataset.build&&!document.body.dataset.error,{},{timeout:180000}),frame=async(action)=>{const n=Number(await page.locator('body').getAttribute('data-frame'));await action();await page.waitForFunction(n=>Number(document.body.dataset.frame)>n&&document.body.dataset.renderedBuild===document.body.dataset.build,n,{timeout:180000});},bake=async(action)=>{const n=Number(await page.locator('body').getAttribute('data-finish-version'));await action();await page.waitForFunction(n=>Number(document.body.dataset.finishVersion)>n&&document.body.dataset.baking==='false'&&document.body.dataset.renderedBuild===document.body.dataset.build,n,{timeout:180000});};
 await ready();
 if(process.env.CITY_MATERIAL_QUICK){
 await page.screenshot({path:output+'/building.png'});await frame(()=>page.locator('#mat-camera-coupon').click());await page.screenshot({path:output+'/material-panel.png'});await page.locator('#mat-zone').selectOption('1');await frame(()=>page.locator('#light').selectOption('day'));await page.screenshot({path:output+'/alloy-panel.png'});await frame(()=>page.locator('#mat-camera-detail').click());assert.equal(await page.locator('body').getAttribute('data-material-specimen'),'building');assert.deepEqual(errors,[]);await writeFile(output+'/result.json',JSON.stringify({backend:'WebGPU',errors,views:3,resolution:1024},null,2));console.log('Close-up material GPU inspection passed:',output);
 }else{
 await page.screenshot({path:output+'/building.png'});console.log('Captured material building.');
 await frame(()=>page.locator('#mat-camera-detail').click());await page.screenshot({path:output+'/facade.png'});console.log('Captured close finish.');
 await page.locator('#mat-tab-weather').click();await bake(async()=>{for(const [id,value]of [['wear','0.85'],['chips','0.8'],['grime','0.65'],['streaks','0.8']]){await page.locator('#mat-'+id).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);}await page.locator('#mat-bake').click();});await page.screenshot({path:output+'/weathered.png'});console.log('Captured weathered finish.');
 await page.locator('#mat-tab-inspect').click();await frame(()=>page.locator('#mat-channel').selectOption('3'));await page.screenshot({path:output+'/roughness.png'});
 await frame(()=>page.locator('#mat-channel').selectOption('5'));await page.screenshot({path:output+'/height.png'});
 await frame(()=>page.locator('#mat-channel').selectOption('2'));await page.screenshot({path:output+'/normal.png'});await frame(()=>page.locator('#mat-channel').selectOption('0'));
 const downloadPromise=page.waitForEvent('download');await page.locator('#mat-export').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'aether-building-material.json');await download.saveAs(output+'/material.json');const exported=JSON.parse(await readFile(output+'/material.json','utf8'));assert.equal(exported.zones[0].wear,.85);
 await bake(()=>page.locator('#mat-preset').selectOption('coastal'));await frame(()=>page.locator('#light').selectOption('raking'));await page.screenshot({path:output+'/coastal.png'});console.log('Captured coastal preset.');
 await bake(()=>page.locator('#mat-resolution').selectOption('1024'));await page.screenshot({path:output+'/fine-1024.png'});console.log('Captured 1024 finish.');
 const packPromise=page.waitForEvent('download');await page.locator('#mat-png').click();const pack=await packPromise;assert.equal(pack.suggestedFilename(),'aether-building-zone-1.zip');await pack.saveAs(output+'/material-pack.zip');
 await frame(()=>page.locator('#mat-camera-coupon').click());await page.screenshot({path:output+'/material-panel.png'});console.log('Captured material panel.');
 await page.locator('#mat-zone').selectOption('1');await frame(()=>page.locator('#light').selectOption('day'));await page.screenshot({path:output+'/alloy-panel.png'});console.log('Captured alloy panel.');
 await page.locator('#mat-save').click();const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),BUILDING_FINISH_KEY);assert.equal(saved.weather.rain,.75);
 const metrics=await page.locator('body').evaluate(e=>({...e.dataset}));assert.equal(metrics.error,undefined);assert.deepEqual(errors,[]);assert.equal(metrics.baking,'false');
 await page.goto(base+'/city-grammar.html');await page.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.finishVersion&&document.body.dataset.renderedBuild===document.body.dataset.build&&!document.body.dataset.error,{},{timeout:180000});assert.deepEqual(errors,[]);
 await writeFile(output+'/result.json',JSON.stringify({backend:'WebGPU',errors,views:10,metrics,savedRecipeApplied:true},null,2));console.log('Building material designer GPU inspection passed:',output);
}
}finally{await browser?.close();await new Promise(r=>server.close(r));}
