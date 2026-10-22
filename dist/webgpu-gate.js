import {checkWebGPU} from './webgpu-check.js';
const gate=document.createElement('section');gate.id='gpuGate';gate.setAttribute('aria-label','Graphics compatibility');
gate.innerHTML=`<div class="gpu-wrap"><div class="gpu-hero"><div class="gpu-emblem"><img src="assets/aether-logo-reference.png" alt="Aether"></div><p class="gpu-kicker">AETHER · GRAPHICS COMPATIBILITY</p><h1>Preparing your universe</h1><p class="gpu-status" role="status" aria-live="polite">Checking WebGPU…</p><button id="gpuRetry" hidden>Check again</button></div><div id="gpuHelp" hidden></div></div>`;
document.body.append(gate);
const help=gate.querySelector('#gpuHelp'),status=gate.querySelector('.gpu-status'),retry=gate.querySelector('#gpuRetry');
const chromeHelp='https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips';
const cards=[
 ['chrome','Google Chrome','Windows · macOS · ChromeOS · Linux',`Update Chrome. Open <code>chrome://settings/system</code> and turn on <b>Use graphics acceleration when available</b>.|Relaunch Chrome. Open <code>chrome://gpu</code> and look for WebGPU under Graphics Feature Status.|Update your graphics driver if unavailable. Linux support depends on your GPU and driver.`,chromeHelp],
 ['edge','Microsoft Edge','Windows · macOS',`Update Edge. Open <code>edge://settings/system</code> and turn on <b>Use graphics acceleration when available</b>.|Restart Edge, then check WebGPU at <code>edge://gpu</code>.|If settings are managed by your organisation, ask your administrator to enable GPU access.`, 'https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/hardwareaccelerationmodeenabled'],
 ['firefox','Mozilla Firefox','Windows · macOS · Linux',`Update Firefox. WebGPU availability depends on your OS and GPU; Windows and Apple Silicon Macs have shipped support.|In Settings → General → Performance, use recommended performance settings, or enable hardware acceleration when available. Restart Firefox.|Check <code>about:support</code> for graphics diagnostics. If your platform is not supported, try a supported browser.`, 'https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API'],
 ['brave','Brave','Privacy-focused · desktop · Android',`Update Brave. On desktop, open <code>brave://settings/system</code> and enable graphics acceleration when available.|Restart Brave, then inspect WebGPU at <code>brave://gpu</code>. Availability can differ by platform and privacy settings.|If it remains unavailable, try an updated supported browser. Changing Shields or privacy settings is not guaranteed to enable WebGPU.`, 'https://support.brave.com/'],
 ['safari','Safari','Mac · iPhone · iPad',`Install the latest Safari and operating-system updates. Safari 26 introduced WebGPU, including iOS 26 and iPadOS 26.|On Mac, use System Settings → General → Software Update. On iPhone/iPad, use Settings → General → Software Update.|Current supported Safari versions enable WebGPU automatically. Older devices that cannot update may need a different device.`, 'https://webkit.org/blog/17333/webkit-features-in-safari-26-0/'],
 ['chrome','Android & other mobile browsers','Phones · tablets',`Update Android and your browser through system updates and the Play Store. Try current Chrome on a supported Android GPU.|Mobile support depends on OS, GPU and driver; there may be no acceleration switch. Open this site in the full browser rather than an in-app browser.|On iPhone/iPad, try current Safari first. Chrome, Edge, Brave and Firefox on iOS do not necessarily have the same WebGPU support as their desktop versions.`,chromeHelp]
];
help.innerHTML=`<div class="gpu-grid">${cards.map(([icon,name,platform,steps,url])=>`<article><header><img class="browser-icon" src="compatibility/${icon}.svg" alt="" width="32" height="32"><div><h2>${name}</h2><small>${platform}</small></div></header><ol>${steps.split('|').map(s=>`<li>${s}</li>`).join('')}</ol><a href="${url}" target="_blank" rel="noopener noreferrer">Browser help ↗</a>${icon==='firefox'?'<details><summary>Advanced: check the WebGPU preference</summary><p>On desktop, open <code>about:config</code> and search for <code>dom.webgpu.enabled</code>. If you deliberately disabled it, restore its default. Forcing it on an unsupported platform does not guarantee working GPU access.</p></details>':''}</article>`).join('')}</div><p class="gpu-note">Copy browser settings addresses into the address bar; browsers prevent websites from opening those internal pages. WebGPU also requires a compatible GPU, driver and HTTPS. Experimental flags cannot fix unsupported hardware.</p><p class="gpu-note">Browser marks belong to their respective owners. Logos sourced from <a href="https://github.com/alrra/browser-logos" target="_blank" rel="noopener noreferrer">Browser Logos</a>.</p>`;
let logoStarted=false;
async function startLogo(){
 if(logoStarted)return;logoStarted=true;
 try{
  const [T,{createEmblem}]=await Promise.all([import('./vendor-gpu/three.webgpu.js'),import('./viewer/emblem.js')]);
  const host=gate.querySelector('.gpu-emblem');
  const renderer=new T.WebGPURenderer({forceWebGL:true,alpha:true,antialias:true});await renderer.init();
  if(!gate.isConnected){renderer.dispose();return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;
  host.append(renderer.domElement);host.querySelector('img').style.visibility='hidden';
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,100);camera.position.set(0,0,10);
  const emblem=createEmblem(new T.MeshStandardMaterial({color:0xcbd1d8,metalness:.65,roughness:.28}));scene.add(emblem);
  scene.add(new T.HemisphereLight(0xffffff,0x283444,3));const key=new T.DirectionalLight(0xffffff,5);key.position.set(-3,4,6);scene.add(key);
  const resize=new ResizeObserver(()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);});resize.observe(host);
  let last=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dispose=()=>{renderer.setAnimationLoop(null);resize.disconnect();const mats=new Set();emblem.traverse(o=>{o.geometry?.dispose();if(o.material)mats.add(o.material);});mats.forEach(m=>m.dispose());renderer.dispose();};
  gate.disposeLogo=dispose;
  renderer.setAnimationLoop(t=>{if(document.hidden){last=t;return;}const dt=last?Math.min((t-last)/1000,.05):0;last=t;if(!reduced){emblem.userData.update?.(dt);emblem.rotation.y=Math.sin(t*.0003)*.16;}renderer.render(scene,camera);});
 }catch(error){console.info('Compatibility screen uses static emblem:',error.message);}
}
async function run(){
 retry.disabled=true;status.textContent='Checking WebGPU…';
 const result=await checkWebGPU();
 if(result.ok){gate.disposeLogo?.();gate.remove();document.documentElement.classList.remove('gpu-pending','gpu-blocked');await import('./shell.js');return;}
 document.documentElement.classList.replace('gpu-pending','gpu-blocked');gate.querySelector('h1').textContent='Your universe needs WebGPU';status.textContent=result.reason;help.hidden=false;retry.hidden=false;retry.disabled=false;startLogo();
}
retry.addEventListener('click',run);run();
