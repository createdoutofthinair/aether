import {createCreditsNebula} from './space-background.js';
import {Starfield} from '../space/starfield.js';
import {createTitleSequence} from './title-sequence.js';
import {getAudioManager} from '../audio/audio-manager.js';
import {creditsPlaylist} from '../audio/playlists.js';
const soundtrack=getAudioManager();
soundtrack.setPlaylist(creditsPlaylist,{loop:true});
const roll=document.querySelector('#roll'),viewport=document.querySelector('#viewport');
const pause=document.querySelector('#pause'),progress=document.querySelector('#progress'),status=document.querySelector('#status');
const stars=new Starfield(document.querySelector('#creditStars'));
const nebula=createCreditsNebula(document.querySelector('#creditNebula'));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let running=!reduced,position=0,last=0,end=1,speed=48,introTime=reduced?7.2:0;
const title=await createTitleSequence(document.querySelector('.title-stage'));
title.render(introTime,reduced);
function measure(){end=Math.max(1,roll.scrollHeight-viewport.clientHeight+60);position=Math.min(position,end);paint();}
function paint(){roll.style.transform=`translateY(${-position}px)`;progress.value=String(Math.round(position/end*1000));}
function update(){stars.setPlaying(running);soundtrack.setPlaying(running);pause.textContent=running?'Ⅱ Pause':'▶ Play';pause.setAttribute('aria-label',running?'Pause credits':'Play credits');status.textContent=position>=end?'COMPLETE':running?'ROLLING':'PAUSED';}
function seek(value){introTime=7.2;title.render(introTime,reduced);position=Math.max(0,Math.min(end,value));if(position>=end)running=false;paint();update();}
function restart(){nebula.restart();soundtrack.restart();introTime=reduced?7.2:0;title.render(introTime,reduced);position=0;running=true;last=0;paint();update();}
pause.addEventListener('click',()=>{if(position>=end){restart();return;}running=!running;last=0;update();});
document.querySelector('#restart').addEventListener('click',restart);document.querySelector('#replay').addEventListener('click',restart);
document.querySelector('#speed').addEventListener('change',e=>{speed=Number(e.target.value);});
progress.addEventListener('input',()=>seek(Number(progress.value)/1000*end));
viewport.addEventListener('wheel',e=>{e.preventDefault();running=false;seek(position+e.deltaY*(e.deltaMode===1?20:e.deltaMode===2?viewport.clientHeight:1));},{passive:false});
let touchY;
viewport.addEventListener('touchstart',e=>{touchY=e.touches[0].clientY;running=false;update();},{passive:true});
viewport.addEventListener('touchmove',e=>{if(touchY===undefined)return;e.preventDefault();const next=e.touches[0].clientY;seek(position+touchY-next);touchY=next;},{passive:false});
viewport.addEventListener('touchend',()=>{touchY=undefined;});
document.addEventListener('keydown',e=>{if(e.target.closest('button,input,select,a,summary'))return;if(e.code==='Space'){e.preventDefault();pause.click();}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();running=false;seek(e.key==='Home'?0:e.key==='End'?end:position+(e.key==='ArrowDown'?150:-150));}});
const fullscreen=document.querySelector('#fullscreen');if(!document.fullscreenEnabled)fullscreen.hidden=true;
fullscreen.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{status.textContent='UNAVAILABLE';}});
document.addEventListener('visibilitychange',()=>{last=0;});
new ResizeObserver(measure).observe(roll);window.addEventListener('resize',measure);
function frame(now){if(last&&running&&!document.hidden){const dt=Math.min((now-last)/1000,.1);nebula.tick(dt);introTime+=dt;const state=title.render(introTime,reduced);if(state.scroll)position=Math.min(end,position+dt*speed);paint();if(position>=end){running=false;update();}}nebula.tick(0);last=now;requestAnimationFrame(frame);}
measure();update();requestAnimationFrame(frame);

window.addEventListener('pagehide',event=>{soundtrack.pause();if(!event.persisted){title.dispose();stars.dispose();nebula.dispose();}});
window.addEventListener('pageshow',()=>soundtrack.setPlaying(running));
// Non-blocking diagnostics: audio failure never interrupts the credit roll.
soundtrack.addEventListener('error',event=>console.warn('Aether soundtrack unavailable',event.detail));
