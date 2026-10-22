export async function checkWebGPU(env = globalThis, timeout = 10000) {
 if (!env.isSecureContext) return {ok:false, reason:'WebGPU needs a secure connection. Open this site using HTTPS (or localhost for development).'};
 if (!env.navigator.gpu) return {ok:false, reason:'This browser is not exposing WebGPU. Update your browser and check the steps below.'};
 let timer, expired=false;
 const probe=(async()=>{
  try {
   const adapter=await env.navigator.gpu.requestAdapter();
   if (!adapter) return {ok:false,reason:'WebGPU is present, but no compatible GPU is available. Check graphics acceleration, drivers and device support.'};
   if (expired) return {ok:false};
   const device=await adapter.requestDevice();
   device.destroy();
   return {ok:true};
  } catch { return {ok:false,reason:'The browser could not start a WebGPU device. Restart it, update your graphics driver and try again.'}; }
 })();
 try { return await Promise.race([probe,new Promise(resolve=>{timer=setTimeout(()=>{expired=true;resolve({ok:false,reason:'The GPU check timed out. Restart your browser and try again.'});},timeout);})]); }
 finally {clearTimeout(timer);}
}
