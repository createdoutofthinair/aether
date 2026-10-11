import {systemExplorer} from './system-ui.js?v=terrain-19';
try{await import('./app.js?v=manual-review-1');}catch(error){console.error(error);document.getElementById('loading').hidden=true;document.getElementById('message').textContent='3D exploration could not start. The solar-system map is still available.';systemExplorer.unavailable();}
