const menu=document.getElementById('workspaceMenu');
if(menu){const pages={explorer:'./index.html',materials:'./material-editor.html',gpu:'./webgpu-preview.html'};menu.value=location.pathname.endsWith('webgpu-preview.html')?'gpu':location.pathname.endsWith('material-editor.html')?'materials':'explorer';menu.addEventListener('change',()=>{if(pages[menu.value])location.href=pages[menu.value];});}
// Development areas share a top-level entry point across every workspace.
const nav=document.querySelector('nav.workspaceNav')||document.querySelector('header nav');
if(nav){
 const style=document.createElement('style');
 style.textContent='.dev-menu{position:relative;display:inline-block;margin-left:12px;font:12px Arial,sans-serif;color:#a6e3e8;z-index:50}.dev-menu summary{list-style:none;cursor:pointer;border:1px solid #4b7882;padding:9px 12px;border-radius:3px;white-space:nowrap}.dev-menu summary::-webkit-details-marker{display:none}.dev-menu summary:after{content:"⌄";margin-left:10px}.dev-menu summary:focus-visible,.dev-links a:focus-visible{outline:2px solid white;outline-offset:3px}.dev-links{position:absolute;top:44px;left:0;min-width:224px;padding:8px;background:#0d1c26;border:1px solid #3a5a66;box-shadow:0 15px 40px #0009;display:grid;text-align:left}.dev-links small{font:9px monospace;color:#8aabb8;padding:9px 10px}.dev-links a{padding:13px 10px;min-height:44px;display:flex;justify-content:space-between;color:#c2e5ed;text-decoration:none}.dev-links a:hover,.dev-links a[aria-current=page]{background:#203943}.dev-links a span{font:9px monospace;color:#b4d6da}';
 document.head.append(style);
 const dev=document.createElement('details');dev.className='dev-menu';
 dev.innerHTML='<summary aria-label="Development areas">DEV</summary><div class="dev-links"><small>DEVELOPMENT AREAS</small><a href="./logo-design.html">Object studio <span>02 / WEBGPU</span></a><a href="./hud-design.html">HUD design <span>01 / LAB</span></a><a href="./webgpu-preview.html">Renderer preview <span>WEBGPU</span></a><a href="./credits.html">Production credits <span>END TITLES</span></a><a href="./nebula-generator.html">Nebula generator <span>03 / LAB</span></a></div>';
 const current=dev.querySelector(`a[href="./${location.pathname.split('/').pop()}"]`);current?.setAttribute('aria-current','page');nav.append(dev);
 document.addEventListener('pointerdown',e=>{if(!dev.contains(e.target))dev.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dev.open){dev.open=false;dev.querySelector('summary').focus();}});
}
