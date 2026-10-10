import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {VALIDATION_PROFILES,VALIDATION_ROUTES} from '../../dist/validation.js';
const output='validation-results';
for(const profile of Object.keys(VALIDATION_PROFILES))test(profile,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 await mkdir(output,{recursive:true});
 const runs=[];
 try{await page.goto('http://127.0.0.1:5173/');
 await page.waitForFunction(()=>!!window.planetExplorer?.validationStart,{},{timeout:120000});
 await page.evaluate(p=>window.planetExplorer.validationProfile(p),profile);
 for(const route of VALIDATION_ROUTES){console.log(`${profile}: ${route}`);const start=await page.evaluate(({route,step})=>window.planetExplorer.validationStart(route,step),{route,step:process.env.CI?.1:1/60});if(!start.available){runs.push({route,skipped:start.reason});continue;}
 await page.evaluate(()=>window.planetExplorer.validationWait(30));
 await expect(page.locator('#loading')).toBeHidden({timeout:60000});
 await page.evaluate(()=>{window.planetExplorer.resetPerformance();window.planetExplorer.validationPlay();});
 for(const seconds of [0,3,6,9,12]){await page.evaluate(s=>window.planetExplorer.validationUntil(s),seconds);const png=await page.evaluate(()=>window.planetExplorer.validationCapture());await writeFile(`${output}/${profile}-${route}-${seconds}s.png`,Buffer.from(png.split(',')[1],'base64'));}
 runs.push({route,...await page.evaluate(()=>window.planetExplorer.performance())});}
 }finally{await writeFile(`${output}/${profile}.json`,JSON.stringify({profile,commit:process.env.GITHUB_SHA??null,ci:!!process.env.CI,errors,runs},null,2));}
 expect(errors,'Browser/renderer errors').toEqual([]);
});
