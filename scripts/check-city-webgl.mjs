// Optional manual visual review. Never run in screenshot CI or as an engine
// backend. Supply existing Playwright / Chromium paths; no browser downloads.
// CITY_WEBGL_PLAYWRIGHT=/path/to/playwright/index.mjs
// CITY_WEBGL_CHROMIUM=/path/to/chromium node scripts/check-city-webgl.mjs
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),moduleName=process.env.CITY_WEBGL_PLAYWRIGHT||'playwright',output=resolve(process.env.CITY_WEBGL_OUTPUT||'/tmp/aether-webgl-review');
const {chromium}=await import(moduleName.startsWith('/')?pathToFileURL(moduleName).href:moduleName);
const server=createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);if(pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}
 const path=resolve(root,'.'+pathname);if(!path.startsWith(resolve(root)+sep))throw Error('Outside root');res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));
}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,page,progress;
try{
 await mkdir(output,{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:process.env.CITY_WEBGL_CHROMIUM||undefined,args:JSON.parse(process.env.CITY_WEBGL_BROWSER_ARGS||'["--no-sandbox","--disable-dev-shm-usage"]')});
 page=await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1});const errors=[],base=`http://127.0.0.1:${server.address().port}`;
 // This isolated graphics test only serves our own local repository.
 await page.route('**/*',route=>route.request().url().startsWith(base+'/')||/^(blob:|data:)/.test(route.request().url())?route.continue():route.abort());
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/architecture-bench.html');
 await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Ready')||!document.getElementById('error').hidden,{},{timeout:60000});
 assert.equal(await page.locator('#error').isVisible(),false,await page.locator('#error').textContent());
 console.log('WebGL context ready; capturing materials and diagnostic modes.');
 await page.screenshot({path:output+'/materials.png'});
 for(const mode of ['normals','wire','parts','uv']){await page.locator('#mode').selectOption(mode);await page.screenshot({path:output+'/'+mode+'.png'});}
 await page.locator('#mode').selectOption('materials');await page.getByRole('button',{name:'Inspect all 20 families',exact:true}).click();
 console.log('Rendering the 20-family contact sheet.');
 progress=setInterval(()=>page.locator('#status').textContent().then(s=>console.log(s),()=>{}),10000);
 await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Family review complete'),{},{timeout:300000});
 clearInterval(progress);progress=null;
 assert.match(await page.locator('#status').textContent(),/20\/20 built · 0 flagged/);
 assert.equal(await page.locator('#gallery .specimen').count(),20);
 await page.locator('#gallery').screenshot({path:output+'/families.png'});
 for(const [id,value]of [['family','dome'],['family','helix'],['lod','2'],['profile','1']]){
  await page.locator('#'+id).selectOption(value);await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Ready'),{},{timeout:60000});
  assert.equal(await page.locator('#health').textContent(),'Passed buffer checks');
 }
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export audit + camera',exact:true}).click();await(await download).saveAs(output+'/audit.json');
 const audit=JSON.parse(await readFile(output+'/audit.json','utf8'));assert.equal(audit.suite.length,20);assert.ok(audit.suite.every(s=>s.audit.ok));assert.equal(audit.audit.ok,true);assert.deepEqual(errors,[]);
 await writeFile(output+'/result.json',JSON.stringify({webgl:true,families:20,errors,output},null,2));console.log('WebGL visual review passed: actual production worker, PBR + four diagnostic modes, 20 family renders, curved/twisted masses, LOD/composition changes, audit export and no shader/runtime errors. Output:',output);
}catch(error){
 if(page){console.error('Last bench status:',await page.locator('#status').textContent().catch(()=>''));await page.screenshot({path:output+'/failure.png',timeout:10000}).catch(()=>{});}
 throw error;
}finally{clearInterval(progress);await browser?.close();await new Promise(resolve=>server.close(resolve));}
