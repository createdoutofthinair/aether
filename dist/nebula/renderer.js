// Independent WebGPU volume renderer. No starfield, credits or game state dependencies.
export const presets={
 veil:{shape:0,size:2.8,seed:47,density:1.7,scale:1.8,turbulence:1.25,dust:1.4,emission:1.3,colorA:'#315bba',colorB:'#c661a9'},
 ember:{shape:1,size:2.5,seed:128,density:2.1,scale:1.5,turbulence:1.5,dust:1.8,emission:1.6,colorA:'#ad351d',colorB:'#f5b264'},
 abyss:{shape:2,size:3.0,seed:912,density:1.3,scale:2.2,turbulence:1.8,dust:2.3,emission:1.15,colorA:'#164c67',colorB:'#639baf'},
 orchid:{shape:3,size:2.7,seed:306,density:2.2,scale:1.7,turbulence:1.1,dust:1.6,emission:1.35,colorA:'#532b94',colorB:'#d56ba4'},
 helix:{shape:4,size:2.8,seed:672,density:2.8,scale:2.2,turbulence:.8,dust:1.2,emission:1.8,colorA:'#154c87',colorB:'#db7559'},
 pearl:{shape:5,size:2.5,seed:811,density:2.3,scale:1.5,turbulence:.65,dust:1.6,emission:1.6,colorA:'#386a81',colorB:'#d4c0a1'}
};
const shader=`
struct Params{resolution:vec2f,time:f32,seed:f32,density:f32,scale:f32,turbulence:f32,dust:f32,colorA:vec4f,colorB:vec4f,emission:f32,steps:f32,pad:vec2f};
@group(0) @binding(0) var<uniform> u:Params;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
fn hash(p:vec3f)->f32{let q=fract(p*vec3f(.1031,.1030,.0973));let v=q+vec3f(dot(q,q.yxz+vec3f(33.33)));return fract((v.x+v.y)*v.z);}
fn noise(p:vec3f)->f32{let i=floor(p);let f=fract(p);let t=f*f*(vec3f(3.)-2.*f);return mix(mix(mix(hash(i),hash(i+vec3f(1,0,0)),t.x),mix(hash(i+vec3f(0,1,0)),hash(i+vec3f(1,1,0)),t.x),t.y),mix(mix(hash(i+vec3f(0,0,1)),hash(i+vec3f(1,0,1)),t.x),mix(hash(i+vec3f(0,1,1)),hash(i+vec3f(1,1,1)),t.x),t.y),t.z);}
fn fbm(p:vec3f)->f32{var q=p;var value=0.;var amp=.55;for(var i=0;i<4;i++){value+=noise(q)*amp;q=vec3f(q.y*.8+q.z*.6,q.x*.6-q.z*.8,q.x*.8-q.y*.6)*2.07+vec3f(13.7,7.1,19.3);amp*=.5;}return value;}
fn starLayer(uv:vec2f,scale:f32)->f32{let grid=uv*scale;let cell=floor(grid);let h=hash(vec3f(cell,u.seed));let center=vec2f(hash(vec3f(cell,71.)),hash(vec3f(cell,19.)));let d=length(fract(grid)-center);let pixel=scale/u.resolution.y;return select(0.,(1.-smoothstep(pixel*.25,pixel*1.4,d))*(.18+h*.45),h>.9985);}
fn silhouette(p:vec3f,kind:f32)->f32{
 let boundary=1.-smoothstep(.72,1.,length(p));
 var form=exp(-dot(p*vec3f(1.1,2.8,1.4),p*vec3f(1.1,2.8,1.4)));
 if(kind>.5&&kind<1.5){form=exp(-pow((length(p.xy)-.52)*7.,2.)-p.z*p.z*12.);}
 if(kind>1.5&&kind<2.5){let axis=vec3f(p.x+sin(p.y*4.)*.15,p.y,p.z);form=exp(-axis.x*axis.x*20.-axis.z*axis.z*14.-axis.y*axis.y*1.8);}
 if(kind>2.5&&kind<3.5){let a=p-vec3f(.34,.15,0.);let b=p+vec3f(.34,.15,0.);form=exp(-dot(a*2.7,a*2.7))+exp(-dot(b*2.7,b*2.7));}
 if(kind>3.5&&kind<4.5){let curve=vec2f(p.x-sin(p.y*5.)*.3,p.z-cos(p.y*5.)*.22);form=exp(-dot(curve,curve)*28.-p.y*p.y*1.8);}
 if(kind>4.5){form=exp(-pow((length(p)-.59)*9.,2.));}
 return form*boundary;
}
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f{
 let uv=(pixel.xy/u.resolution*2.-vec2f(1.))*vec2f(u.resolution.x/u.resolution.y,1.);
 let ray=normalize(vec3f(uv*.78,1.45));let flight=u.colorB.a>.5;let travel=u.pad.x;
 var trans=1.;var color=vec3f(0.);let steps=u32(u.steps);let radius=u.colorA.a;
 let cell=floor(travel/32.);
 for(var cloud=0;cloud<4;cloud++){
  if(!flight&&cloud>0){break;}
  let id=cell+f32(cloud)-1.;let salt=hash(vec3f(id,u.seed,42.));
  var center=vec3f(sin(id*2.4)*2.1,cos(id*1.7)*.65,id*32.+20.-travel);
  if(!flight){center=vec3f(0.,0.,6.);}
  // Analytic bounded-volume intersection keeps the rest of the frame empty space.
  let projection=dot(ray,center);let disc=projection*projection-dot(center,center)+radius*radius;
  if(disc<=0.){continue;}
  let near=max(0.,projection-sqrt(disc));let far=projection+sqrt(disc);if(far<=near){continue;}
  let stepSize=(far-near)/u.steps;
  let seed=vec3f(u.seed*.173,u.seed*.419,u.seed*.071)+vec3f(salt*17.);
  for(var i=0u;i<96u;i++){if(i>=steps||trans<.02){break;}
   let world=ray*(near+(f32(i)+.5)*stepSize);let p=(world-center)/radius;
   let q=p*u.scale*2.8+seed+vec3f(u.time*.004,0.,0.);
   let warp=vec3f(fbm(q*.7),fbm(q*.7+vec3f(7.3)),fbm(q*.7+vec3f(15.8)))-vec3f(.5);
   let n=fbm(q+warp*u.turbulence*1.7);
   let envelope=silhouette(p+warp*.16,u.pad.y);
   let visibility=select(1.,1.-smoothstep(62.,84.,center.z),flight);
   let gas=smoothstep(.37,.72,n)*u.density*envelope*visibility;
   let lane=smoothstep(.46,.69,fbm(q*.63+vec3f(23.1)))*u.dust;
   let extinction=gas*(.65+lane*2.8);let alpha=1.-exp(-extinction*stepSize*1.7);
   let filament=pow(max(0.,1.-abs(n-.5)*4.),2.);
   let tint=mix(u.colorA.rgb,u.colorB.rgb,clamp(n*.8+filament*.35+p.y*.15,0.,1.));
   let glow=tint*(.25+filament*1.8)*u.emission*exp(-lane*1.6);
   color+=trans*alpha*glow;trans*=1.-alpha;
  }
 }
 let stars=starLayer(uv,150.)+starLayer(uv+vec2f(1.37),245.);
 color+=trans*vec3f(.75,.85,1.)*stars*.45;
 color=vec3f(1.)-exp(-color*1.65);return vec4f(pow(color,vec3f(.4545)),1.);

}`;
export class NebulaRenderer{
 async initialize(canvas){if(!navigator.gpu)throw Error('This nebula lab requires WebGPU. Enable hardware acceleration in a WebGPU-capable browser.');this.canvas=canvas;this.adapter=await navigator.gpu.requestAdapter();if(!this.adapter)throw Error('No WebGPU adapter is available.');this.device=await this.adapter.requestDevice();this.context=canvas.getContext('webgpu');if(!this.context)throw Error('WebGPU canvas initialization failed.');const format=navigator.gpu.getPreferredCanvasFormat();this.context.configure({device:this.device,format,alphaMode:'opaque'});const module=this.device.createShaderModule({code:shader});const compilation=await module.getCompilationInfo();const errors=compilation.messages.filter(m=>m.type==='error');if(errors.length)throw Error(errors.map(e=>e.message).join('; '));this.pipeline=await this.device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});this.buffer=this.device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.bind=this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.buffer}}]});this.device.lost.then(info=>{if(!this.disposed&&info.reason!=='destroyed')this.onError?.('WebGPU device lost. Reload the lab to recover.');});return this;}
 render(settings,time=0){if(this.disposed)return;const rgb=hex=>[(parseInt(hex.slice(1,3),16)/255)**2.2,(parseInt(hex.slice(3,5),16)/255)**2.2,(parseInt(hex.slice(5,7),16)/255)**2.2,1];const data=new Float32Array([this.canvas.width,this.canvas.height,time,settings.seed,settings.density,settings.scale,settings.turbulence,settings.dust,...rgb(settings.colorA).slice(0,3),settings.size||2.8,...rgb(settings.colorB).slice(0,3),settings.view==='study'?0:1,settings.emission,settings.steps||48,settings.travel||0,settings.shape||0]);this.device.queue.writeBuffer(this.buffer,0,data);const encoder=this.device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.bind);pass.draw(3);pass.end();this.device.queue.submit([encoder.finish()]);}
 dispose(){this.disposed=true;this.buffer?.destroy();this.context?.unconfigure();this.device?.destroy();}
}
