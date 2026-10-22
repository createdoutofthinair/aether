// Independent WebGPU volume renderer. No starfield, credits or game state dependencies.
export const presets={
 veil:{seed:47,density:1.7,scale:1.8,turbulence:1.25,dust:1.4,emission:1.3,colorA:'#315bba',colorB:'#c661a9'},
 ember:{seed:128,density:2.1,scale:1.5,turbulence:1.5,dust:1.8,emission:1.6,colorA:'#ad351d',colorB:'#f5b264'},
 abyss:{seed:912,density:1.3,scale:2.2,turbulence:1.8,dust:2.3,emission:1.15,colorA:'#164c67',colorB:'#639baf'},
 orchid:{seed:306,density:2.2,scale:1.7,turbulence:1.1,dust:1.6,emission:1.35,colorA:'#532b94',colorB:'#d56ba4'}
};
const shader=`
struct Params{resolution:vec2f,time:f32,seed:f32,density:f32,scale:f32,turbulence:f32,dust:f32,colorA:vec4f,colorB:vec4f,emission:f32,steps:f32,pad:vec2f};
@group(0) @binding(0) var<uniform> u:Params;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
fn hash(p:vec3f)->f32{let q=fract(p*vec3f(.1031,.1030,.0973));let v=q+vec3f(dot(q,q.yxz+vec3f(33.33)));return fract((v.x+v.y)*v.z);}
fn noise(p:vec3f)->f32{let i=floor(p);let f=fract(p);let t=f*f*(vec3f(3.)-2.*f);return mix(mix(mix(hash(i),hash(i+vec3f(1,0,0)),t.x),mix(hash(i+vec3f(0,1,0)),hash(i+vec3f(1,1,0)),t.x),t.y),mix(mix(hash(i+vec3f(0,0,1)),hash(i+vec3f(1,0,1)),t.x),mix(hash(i+vec3f(0,1,1)),hash(i+vec3f(1,1,1)),t.x),t.y),t.z);}
fn fbm(p:vec3f)->f32{var q=p;var value=0.;var amp=.55;for(var i=0;i<4;i++){value+=noise(q)*amp;q=vec3f(q.y*.8+q.z*.6,q.x*.6-q.z*.8,q.x*.8-q.y*.6)*2.07+vec3f(13.7,7.1,19.3);amp*=.5;}return value;}
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f{
 let uv=(pixel.xy/u.resolution*2.-vec2f(1.))*vec2f(u.resolution.x/u.resolution.y,1.);
 let ray=normalize(vec3f(uv*.78,1.45));let origin=vec3f(0.,0.,-3.6);
 let seed=vec3f(u.seed*.173,u.seed*.419,u.seed*.071);let drift=vec3f(u.time*.008,-u.time*.003,0.);
 var trans=1.;var color=vec3f(0.);let steps=u32(u.steps);let stepSize=6.5/u.steps;
 let jitter=.5;
 for(var i=0u;i<96u;i++){if(i>=steps||trans<.015){break;}
 let p=origin+ray*((f32(i)+jitter)*stepSize);let q=p*u.scale*.72+seed+drift;
 let warp=vec3f(fbm(q*.7),fbm(q*.7+vec3f(7.3)),fbm(q*.7+vec3f(15.8)))-vec3f(.5);
 let n=fbm(q+warp*u.turbulence*2.4);
 let silhouette=vec2f((p.x+.5)*.38,(p.y+sin(p.x*.65)*.7)*.95);
 let pockets=smoothstep(.34,.63,fbm(q*.28+vec3f(80.)));
 let envelope=exp(-dot(silhouette,silhouette))*pockets*(1.-smoothstep(1.2,3.5,abs(p.z)));
 let filament=pow(max(0.,1.-abs(n-.5)*4.),2.);
 let gas=smoothstep(.49,.76,n)*u.density*envelope;
 let lane=smoothstep(.49,.69,fbm(q*.63+vec3f(23.1)))*u.dust;
 let extinction=gas*(.6+lane*2.8);let alpha=1.-exp(-extinction*stepSize*1.25);
 let tint=mix(u.colorA.rgb,u.colorB.rgb,clamp(n*.9+filament*.4+p.y*.06,0.,1.));
 let glow=tint*(.22+filament*1.4)*u.emission*exp(-lane*1.9);
 color+=trans*alpha*glow;trans*=1.-alpha;
 }
 let vignette=1.-.24*smoothstep(.4,2.3,length(uv));color=(vec3f(.0002,.0003,.0007)+color)*vignette;
 color=vec3f(1.)-exp(-color*1.65);return vec4f(pow(color,vec3f(.4545)),1.);
}`;
export class NebulaRenderer{
 async initialize(canvas){if(!navigator.gpu)throw Error('This nebula lab requires WebGPU. Enable hardware acceleration in a WebGPU-capable browser.');this.canvas=canvas;this.adapter=await navigator.gpu.requestAdapter();if(!this.adapter)throw Error('No WebGPU adapter is available.');this.device=await this.adapter.requestDevice();this.context=canvas.getContext('webgpu');if(!this.context)throw Error('WebGPU canvas initialization failed.');const format=navigator.gpu.getPreferredCanvasFormat();this.context.configure({device:this.device,format,alphaMode:'opaque'});const module=this.device.createShaderModule({code:shader});const compilation=await module.getCompilationInfo();const errors=compilation.messages.filter(m=>m.type==='error');if(errors.length)throw Error(errors.map(e=>e.message).join('; '));this.pipeline=await this.device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});this.buffer=this.device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.bind=this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.buffer}}]});this.device.lost.then(info=>{if(!this.disposed&&info.reason!=='destroyed')this.onError?.('WebGPU device lost. Reload the lab to recover.');});return this;}
 render(settings,time=0){if(this.disposed)return;const rgb=hex=>[(parseInt(hex.slice(1,3),16)/255)**2.2,(parseInt(hex.slice(3,5),16)/255)**2.2,(parseInt(hex.slice(5,7),16)/255)**2.2,1];const data=new Float32Array([this.canvas.width,this.canvas.height,time,settings.seed,settings.density,settings.scale,settings.turbulence,settings.dust,...rgb(settings.colorA),...rgb(settings.colorB),settings.emission,settings.steps||48,0,0]);this.device.queue.writeBuffer(this.buffer,0,data);const encoder=this.device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.bind);pass.draw(3);pass.end();this.device.queue.submit([encoder.finish()]);}
 dispose(){this.disposed=true;this.buffer?.destroy();this.context?.unconfigure();this.device?.destroy();}
}
