import {BackendSession} from '../backend-session.js';
import {sceneSnapshot} from '../../domain/render-contracts.js';
import {previewTile} from './terrain-preview.js?v=regional-lod-1';
import {PreviewBackend} from './preview-backend.js?v=regional-lod-1';
const $=id=>document.getElementById(id),host=$('previewViewport'),status=$('previewStatus');
let lastStatus=0;
let frame=null,previous=null,intervals=[],yaw=.7,starting=false,active=true;
function stop(){if(frame!==null)cancelAnimationFrame(frame);frame=null;previous=null;}
const session=new BackendSession(options=>new PreviewBackend(options));
function failure(message){stop();active=false;status.textContent=message;$('recoverPreview').hidden=false;}
function snapshot(tile){const radius=Number($('distance').value),elevation=Number($('elevation').value);return sceneSnapshot({epoch:tile.epoch,origin:tile.origin,camera:{position:[Math.sin(yaw)*radius,elevation,Math.cos(yaw)*radius],target:[0,0,0]},material:{id:'terrain-proof',colour:[.43,.32,.21],roughness:Number($('roughness').value),metalness:0}});}
let tile;
if(new URLSearchParams(location.search).get('backend')==='webgl')$('previewBackend').value='webgl';
function resize(){session.resize(innerWidth,innerHeight,devicePixelRatio);}
function tick(now){if(!active||document.hidden||session.state!=='ready'){frame=null;return;}
 try{session.applyScene(snapshot(tile));session.render();if(now-lastStatus>500){const caps=session.capabilities();status.textContent=`${caps.actual} · ${caps.lod.current}×${caps.lod.current} per patch · ${caps.lod.queued?`${caps.lod.queued} patches loading`:caps.lod.transition?'Blending detail':'Ready'}`;lastStatus=now;}if(previous!==null){intervals.push(now-previous);if(intervals.length>600)intervals.shift();}previous=now;
 }catch(error){failure('Rendering stopped: '+error.message);return;}frame=requestAnimationFrame(tick);}
async function start(){if(starting)return;starting=true;stop();active=false;$('recoverPreview').hidden=true;$('previewBackend').disabled=true;status.textContent='Initializing renderer…';intervals=[];
 try{await session.dispose();host.replaceChildren();const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Experimental terrain renderer preview');host.append(canvas);
 tile=previewTile();const ready=await session.initialize({canvas,tile,forceWebGL:$('previewBackend').value==='webgl',onLost:()=>failure('Graphics device/context lost. Restart the preview or return to the explorer.'),onError:error=>failure('Graphics error: '+(error?.message??String(error)))});
 if(!ready)return;resize();session.applyScene(snapshot(tile));active=true;const caps=session.capabilities();status.textContent=`${caps.actual} · Three.js r${caps.revision} · ${caps.tileVertices.toLocaleString()} vertices`;frame=requestAnimationFrame(tick);
 }catch(error){await session.dispose();failure('Preview unavailable: '+error.message+' · The planet explorer remains available.');}
 finally{starting=false;$('previewBackend').disabled=false;}}
$('previewBackend').onchange=start;$('recoverPreview').onclick=start;
$('exportPreviewMetrics').onclick=()=>{const sorted=intervals.slice().sort((a,b)=>a-b),percentile=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]??null;
 const report={capturedAt:new Date().toISOString(),scope:'Regional LOD proof; not full planetary explorer or visual acceptance',browser:navigator.userAgent,secureContext:isSecureContext,webgpuAPI:!!navigator.gpu,state:session.state,capabilities:session.capabilities(),viewport:[innerWidth,innerHeight],dpr:Math.min(devicePixelRatio,2),frameInterval:{samples:sorted.length,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99)},gpuTime:null,gpuTimeNote:'Timestamp support reported; GPU timings are not collected in this bootstrap',scene:tile?snapshot(tile):null};
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='aether-renderer-preview.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
let pointer=null;host.addEventListener('pointerdown',e=>{pointer=e.clientX;e.target.setPointerCapture(e.pointerId);});host.addEventListener('pointermove',e=>{if(pointer===null)return;yaw-=(e.clientX-pointer)*.005;pointer=e.clientX;});for(const name of ['pointerup','pointercancel'])host.addEventListener(name,()=>pointer=null);
addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{stop();if(active&&!document.hidden)frame=requestAnimationFrame(tick);});
addEventListener('pagehide',()=>{active=false;stop();void session.dispose();});
window.aetherRendererPreview={state:()=>({state:session.state,capabilities:session.capabilities()}),restart:start};
await start();
