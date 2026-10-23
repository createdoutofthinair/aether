// Optional local visual review, never screenshot CI. Requires an existing GPU
// browser and Playwright, exactly like check-city-scene.mjs.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),output=resolve(process.env.CITY_GRAMMAR_OUTPUT||'/tmp/aether-city-grammar'),moduleName=process.env.CITY_GPU_PLAYWRIGHT||'playwright';
const {chromium}=await import(moduleName.startsWith('/')?pathToFileURL(moduleName).href:moduleName),server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://local');if(url.pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}const file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(resolve(root)+sep))throw Error('Outside root');res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;
try{
 await mkdir(output,{recursive:true});browser=await chromium.launch({headless:true,executablePath:process.env.CITY_GPU_CHROMIUM||undefined,args:JSON.parse(process.env.CITY_GPU_BROWSER_ARGS||'["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-webgpu","--use-angle=swiftshader","--enable-unsafe-swiftshader","--enable-features=Vulkan","--use-vulkan=swiftshader","--disable-vulkan-surface"]')});page=await browser.newPage({viewport:{width:1200,height:850}});const errors=[],base=`http://127.0.0.1:${server.address().port}`;await page.route('**/*',r=>r.request().url().startsWith(base+'/')||/^(blob:|data:)/.test(r.request().url())?r.continue():r.abort());page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text().slice(0,240));}});
 await page.goto(base+'/city-grammar.html');
 const ready=()=>page.waitForFunction(()=>document.body.dataset.ready==='true'&&!document.body.dataset.error,{},{timeout:180000}),frame=async()=>{const n=Number(await page.locator('body').getAttribute('data-frame'));await page.locator('#light').dispatchEvent('change');await page.waitForFunction(n=>Number(document.body.dataset.frame)>n,n,{timeout:180000});},build=async(action)=>{const n=Number(await page.locator('body').getAttribute('data-build'));await action();await page.waitForFunction(n=>Number(document.body.dataset.build)>n,n,{timeout:180000});await frame();};
 await ready();await frame();await page.screenshot({path:output+'/building.png'});console.log('Captured native building.');
 await page.locator('#detail').click();await frame();await page.screenshot({path:output+'/detail.png'});console.log('Captured true apertures and modules.');
 await build(()=>page.locator('#world').selectOption('arid'));await page.locator('#detail').click();await page.locator('#light').selectOption('raking');await frame();await page.screenshot({path:output+'/arid-detail.png'});console.log('Captured arid construction.');
 await build(()=>page.locator('#gallery').click());await page.locator('#light').selectOption('day');await frame();await page.screenshot({path:output+'/compositions.png'});console.log('Captured 12 compositions.');
 const metrics=await page.locator('body').evaluate(e=>({...e.dataset}));assert.equal(metrics.error,undefined);assert.deepEqual(errors,[]);await writeFile(output+'/result.json',JSON.stringify({backend:'WebGPU',errors,views:4,metrics},null,2));console.log('Native construction GPU inspection passed:',output);

}finally{await browser?.close();await new Promise(r=>server.close(r));}
