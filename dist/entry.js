import {systemExplorer} from './system-ui.js?v=terrain-6';
try{await import('./app.js?v=terrain-6');}catch(error){console.error(error);document.getElementById('loading').hidden=true;document.getElementById('message').textContent='3D exploration could not start. The solar-system map is still available.';systemExplorer.unavailable();}
