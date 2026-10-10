const menu=document.getElementById('workspaceMenu');
if(menu){menu.value=location.pathname.endsWith('material-editor.html')?'materials':'explorer';menu.addEventListener('change',()=>{location.href=menu.value==='materials'?'./material-editor.html':'./index.html';});}
