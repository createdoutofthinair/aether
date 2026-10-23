import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export const groups=['site','nature','city','engine'];
export function testGroup(path){
 if(/test-city(?:-[\w-]+)?\.mjs$/.test(path))return 'city';
 if(/test-(forest(?:-transitions)?|wood|leaves|tree-model)\.mjs$/.test(path))return 'nature';
 if(/test-(resident-pool|hull-materials|credit-ships|credit-recorder|ship-finishes|ships|hud|emblem-orbit|nebula-performance|foundation-build)\.mjs$/.test(path))return 'site';
 return 'engine'; // New unclassified tests remain covered by full/core checks.
}
export function plan(paths,{full=false}={}){
 const selected=new Set();let shaders=false,rover=false,deploy=false;
 for(const path of paths){
  if(/^(docs\/|README(?:\.|$)|LICENSE(?:\.|$))/.test(path)||path.endsWith('.md'))continue;
  deploy ||= path.startsWith('dist/')||/^(src\/|package(?:-lock)?\.json$|scripts\/build-|scripts\/vendor-)/.test(path);
  if(/^dist\/render\/readback\.js$/.test(path)){selected.add('nature');selected.add('city');continue;}
  if(/^dist\/render\/surface-atlas\.js$/.test(path)){selected.add('site');selected.add('city');continue;}
  if(/^dist\/(city\/|(?:city|architecture)-lab\.html$)/.test(path)){selected.add('city');continue;}
  if(/^dist\/forest\/(impostor|assets|coverage|octahedral)\.js$/.test(path)){selected.add('nature');selected.add('city');continue;}
  if(/^(?:src|dist)\/render\/(?:resident-pool|ship-assets|ship-worker)\.js$/.test(path)){selected.add('site');selected.add('city');continue;}
  if(/^(dist\/(?:nature|forest)\/|dist\/forest-lab\.html$|dist\/nature-studio\.html$)/.test(path)){selected.add('nature');continue;}
  if(/^dist\/(hull\/(surface|material)\.js|ships\/blueprint\.js)$/.test(path)){selected.add('site');selected.add('city');continue;}
  if(/^dist\/(hull\/|ships\/|credits\/|hud\/|viewer\/|nebula\/|audio\/|assets\/|(?:spaceship-studio|credits|hud-design|logo-design|nebula-generator|nebula-studio)\.html$)/.test(path)){selected.add('site');continue;}
  if(/^dist\/.*\.css$/.test(path)){selected.add('site');continue;}
  if(/^dist\/(shell|navigation|index|entry|webgpu|startup|capability)/.test(path)){full=true;continue;}
  if(path==='dist/rover.glb.gz'){rover=true;selected.add('engine');continue;}
  if(path.startsWith('scripts/test-')){selected.add(testGroup(path));continue;}
  if(/^(dist\/|src\/)/.test(path)){selected.add('engine');shaders=true;continue;}
  // CI, dependencies, build tools and unknown paths default to full coverage.
  full=true;
 }
 if(full){groups.forEach(g=>selected.add(g));shaders=true;rover=true;}
 const active=groups.filter(g=>selected.has(g));return{groups:active,siteOnly:active.length===1&&active[0]==='site',shaders,rover,build:full||deploy||active.length>0,deploy:full||deploy};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let paths=[],full=process.env.CI_FULL==='true';
 if(!full){
  const base=process.env.CI_BASE,head=process.env.CI_HEAD;
  if(!base||!head||/^0+$/.test(base))full=true;
  else try{paths=execFileSync('git',['diff','--name-only','--no-renames','-z',base,head],{encoding:'utf8'}).split('\0').filter(Boolean);}catch{full=true;}
 }
 const result=plan(paths,{full});console.log(JSON.stringify({paths,...result},null,2));
 if(process.env.GITHUB_OUTPUT)for(const [key,value]of Object.entries(result))appendFileSync(process.env.GITHUB_OUTPUT,`${key}=${JSON.stringify(value)}\n`);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,`### Selected CI checks\n\n${result.groups.join(', ')||'Documentation only'}; shaders: ${result.shaders}; rover: ${result.rover}; build: ${result.build}.\n`);
}
