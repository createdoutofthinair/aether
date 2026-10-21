import {BackendSession} from '../backend-session.js';
import {sceneSnapshot} from '../../domain/render-contracts.js';
import {previewTile,previewSurface} from './terrain-preview.js?v=adaptive-lod-1';
import {PreviewBackend} from './preview-backend.js?v=adaptive-lod-1';
const $=id=>document.getElementById(id),host=$('previewViewport'),status=$('previewStatus');
let lastStatus=0;
let frame=null,previous=null,intervals=[],yaw=.7,starting=false,active=true;
function stop(){if(frame!==null)cancelAnimationFrame(frame);frame=null;previous=null;}
const session=new BackendSession(options=>new PreviewBackend(options));
function failure(message){stop();active=false;status.textContent=message;$('recoverPreview').hidden=false;}
function snapshot(tile){const radius=Number($('distance').value),elevation=Number($('elevation').value);return sceneSnapshot({epoch:tile.epoch,origin:tile.origin,camera:{position:[focusTarget[0]+Math.sin(yaw)*radius,focusTarget[1]+elevation,focusTarget[2]+Math.cos(yaw)*radius],target:focusTarget},material:{id:'terrain-proof',colour:[.43,.32,.21],roughness:Number($('roughness').value),metalness:0}});}
let tile,focusSurface;const focus=[0,0];let focusTarget=[0,0,0];
if(new URLSearchParams(location.search).get('backend')==='webgl')$('previewBackend').value='webgl';
function resize(){session.resize(innerWidth,innerHeight,devicePixelRatio);}
function tick(now){if(!active||document.hidden||session.state!=='ready'){frame=null;return;}
 try{session.applyScene(snapshot(tile));session.render();if(now-lastStatus>500){const caps=session.capabilities();status.textContent=`${caps.actual} · ${caps.lod.current} cells per patch edge · ${caps.lod.queued?`${caps.lod.queued} patches loading`:caps.lod.transition?'Blending detail':'Ready'}`;lastStatus=now;}if(previous!==null){intervals.push(now-previous);if(intervals.length>600)intervals.shift();}previous=now;
 }catch(error){failure('Rendering stopped: '+error.message);return;}frame=requestAnimationFrame(tick);}
async function start(){if(starting)return;starting=true;stop();active=false;$('recoverPreview').hidden=true;$('previewBackend').disabled=true;status.textContent='Initializing renderer…';intervals=[];
 try{await session.dispose();host.replaceChildren();const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Experimental terrain renderer preview');host.append(canvas);
 tile=previewTile();focusSurface=previewSurface();focusTarget=focusSurface.sample(...focus).position;const ready=await session.initialize({canvas,tile,forceWebGL:$('previewBackend').value==='webgl',onLost:()=>failure('Graphics device/context lost. Restart the preview or return to the explorer.'),onError:error=>failure('Graphics error: '+(error?.message??String(error)))});
 if(!ready)return;resize();session.applyScene(snapshot(tile));active=true;const caps=session.capabilities();status.textContent=`${caps.actual} · Three.js r${caps.revision} · ${caps.tileVertices.toLocaleString()} vertices`;frame=requestAnimationFrame(tick);
 }catch(error){await session.dispose();failure('Preview unavailable: '+error.message+' · The planet explorer remains available.');}
 finally{starting=false;$('previewBackend').disabled=false;}}
$('previewBackend').onchange=start;$('recoverPreview').onclick=start;
$('exportPreviewMetrics').onclick=()=>{const sorted=intervals.slice().sort((a,b)=>a-b),percentile=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]??null;
 const report={capturedAt:new Date().toISOString(),scope:'Regional LOD proof; not full planetary explorer or visual acceptance',browser:navigator.userAgent,secureContext:isSecureContext,webgpuAPI:!!navigator.gpu,state:session.state,capabilities:session.capabilities(),viewport:[innerWidth,innerHeight],dpr:Math.min(devicePixelRatio,2),frameInterval:{samples:sorted.length,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99)},gpuTime:null,gpuTimeNote:'Timestamp support reported; GPU timings are not collected in this bootstrap',scene:tile?snapshot(tile):null};
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='aether-renderer-preview.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
let pointer=null;host.addEventListener('pointerdown',e=>{pointer=[e.clientX,e.clientY];e.target.setPointerCapture(e.pointerId);});host.addEventListener('pointermove',e=>{if(pointer===null)return;const dx=e.clientX-pointer[0],dy=e.clientY-pointer[1];if(e.shiftKey&&focusSurface){focus[0]=Math.max(-1500,Math.min(1500,focus[0]-dx*2));focus[1]=Math.max(-1500,Math.min(1500,focus[1]+dy*2));focusTarget=focusSurface.sample(...focus).position;}else yaw-=dx*.005;pointer=[e.clientX,e.clientY];});for(const name of ['pointerup','pointercancel'])host.addEventListener(name,()=>pointer=null);
addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{stop();if(active&&!document.hidden)frame=requestAnimationFrame(tick);});
addEventListener('pagehide',()=>{active=false;stop();void session.dispose();});
window.aetherRendererPreview={state:()=>({state:session.state,capabilities:session.capabilities()}),restart:start};
await start();
