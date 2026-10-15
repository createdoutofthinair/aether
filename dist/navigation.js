const menu=document.getElementById('workspaceMenu');
if(menu){const pages={explorer:'./index.html',materials:'./material-editor.html',gpu:'./webgpu-preview.html'};menu.value=location.pathname.endsWith('webgpu-preview.html')?'gpu':location.pathname.endsWith('material-editor.html')?'materials':'explorer';menu.addEventListener('change',()=>{if(pages[menu.value])location.href=pages[menu.value];});}
