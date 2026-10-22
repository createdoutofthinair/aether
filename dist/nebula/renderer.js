// Independent WebGPU volume renderer. No starfield, credits or game state dependencies.
export const presets={
 veil:{composition:'Cool blue wisps below a broken rose emission front; pale gold only along the boundary.',stretch:3.8,layers:.8,porosity:.75,saturation:.9,colorC:'#dfb47b',shape:0,size:2.8,seed:47,density:.85,scale:1.8,turbulence:1.5,dust:1.4,emission:.8,colorA:'#386fab',colorB:'#bd5377'},
 ember:{composition:'Copper outer arcs surrounding a cooler teal inner rim, with sparse amber knots.',stretch:3.2,layers:.8,porosity:.72,saturation:.95,colorC:'#d8a24c',shape:1,size:2.5,seed:128,density:1,scale:1.5,turbulence:1.6,dust:1.6,emission:.9,colorA:'#bf5e2f',colorB:'#438d99'},
 abyss:{composition:'Mostly dark dust; a one-sided blue reflection edge and a few separated rust-coloured tips.',stretch:3.7,layers:.7,porosity:.85,saturation:.85,colorC:'#ba6f43',shape:2,size:3,seed:912,density:.75,scale:2.2,turbulence:1.8,dust:2.1,emission:.65,colorA:'#354253',colorB:'#5288b5'},
 orchid:{composition:'A cyan lobe and a muted magenta lobe separated by a dark saddle; violet at their overlap.',stretch:3.5,layers:.8,porosity:.75,saturation:.95,colorC:'#8267bb',shape:3,size:2.7,seed:306,density:.9,scale:1.7,turbulence:1.4,dust:1.5,emission:.8,colorA:'#419ca1',colorB:'#b9548d'},
 helix:{composition:'Narrow red filaments within a faint navy sheath, with gold confined to branching junctions.',stretch:3.6,layers:.8,porosity:.8,saturation:.95,colorC:'#c6a15c',shape:4,size:2.8,seed:672,density:1.05,scale:2.2,turbulence:1.1,dust:1.4,emission:.85,colorA:'#314d87',colorB:'#b44842'},
 pearl:{composition:'A cool blue outer shell, a nearly neutral inner surface, and isolated warm knots on one side.',stretch:3,layers:.8,porosity:.78,saturation:.85,colorC:'#cf9555',shape:5,size:2.5,seed:811,density:.9,scale:1.5,turbulence:1,dust:1.6,emission:.8,colorA:'#568cb0',colorB:'#999eac'}
};
const shader=`
struct Params{resolution:vec2f,time:f32,seed:f32,density:f32,scale:f32,turbulence:f32,dust:f32,colorA:vec4f,colorB:vec4f,emission:f32,steps:f32,pad:vec2f,colorC:vec4f,form:vec4f};
@group(0) @binding(0) var<uniform> u:Params;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
fn hash(p:vec3f)->f32{let q=fract(p*vec3f(.1031,.1030,.0973));let v=q+vec3f(dot(q,q.yxz+vec3f(33.33)));return fract((v.x+v.y)*v.z);}
fn noise(p:vec3f)->f32{let i=floor(p);let f=fract(p);let t=f*f*(vec3f(3.)-2.*f);return mix(mix(mix(hash(i),hash(i+vec3f(1,0,0)),t.x),mix(hash(i+vec3f(0,1,0)),hash(i+vec3f(1,1,0)),t.x),t.y),mix(mix(hash(i+vec3f(0,0,1)),hash(i+vec3f(1,0,1)),t.x),mix(hash(i+vec3f(0,1,1)),hash(i+vec3f(1,1,1)),t.x),t.y),t.z);}
fn fbm(p:vec3f)->f32{var q=p;var value=0.;var amp=.55;for(var i=0;i<4;i++){value+=noise(q)*amp;q=vec3f(q.y*.8+q.z*.6,q.x*.6-q.z*.8,q.x*.8-q.y*.6)*2.07+vec3f(13.7,7.1,19.3);amp*=.5;}return value;}
fn starLayer(uv:vec2f,scale:f32)->f32{let grid=uv*scale;let cell=floor(grid);let h=hash(vec3f(cell,u.seed));let center=vec2f(hash(vec3f(cell,71.)),hash(vec3f(cell,19.)));let d=length(fract(grid)-center);let pixel=scale/u.resolution.y;return select(0.,(1.-smoothstep(pixel*.25,pixel*1.4,d))*(.18+h*.45),h>.9985);}
fn silhouette(p:vec3f,kind:f32)->f32{
 let edge=length(p)+.16*(fbm(p*4.+vec3f(19.))-.5);
 let boundary=1.-smoothstep(.6,.98,edge);
 var form=exp(-dot(p*vec3f(1.0,1.45,1.4),p*vec3f(1.0,1.45,1.4)));
 if(kind>.5&&kind<1.5){form=exp(-pow((length(p.xy)-.52)*7.,2.)-p.z*p.z*12.);}
 if(kind>1.5&&kind<2.5){let axis=vec3f(p.x+sin(p.y*4.)*.15,p.y,p.z);form=exp(-axis.x*axis.x*7.-axis.z*axis.z*10.-axis.y*axis.y*1.8);}
 if(kind>2.5&&kind<3.5){let a=p-vec3f(.34,.15,0.);let b=p+vec3f(.34,.15,0.);form=exp(-dot(a*2.7,a*2.7))+exp(-dot(b*2.7,b*2.7));}
 if(kind>3.5&&kind<4.5){let curve=vec2f(p.x-sin(p.y*5.)*.3,p.z-cos(p.y*5.)*.22);form=exp(-dot(curve,curve)*28.-p.y*p.y*1.8);}
 if(kind>4.5){form=exp(-pow((length(p)-.59)*9.,2.));}
 return form*boundary;
}
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f{
 let uv=(pixel.xy/u.resolution*2.-vec2f(1.))*vec2f(u.resolution.x/u.resolution.y,1.);
 let ray=normalize(vec3f(uv*.78,1.45));let flight=u.colorB.a>.5;let travel=u.pad.x;
 var trans=1.;var color=vec3f(0.);let steps=u32(u.steps);let radius=u.colorA.a;
 let cell=floor(travel/64.);
 for(var cloud=0;cloud<4;cloud++){
  if(!flight&&cloud>0){break;}
  let id=cell+f32(cloud)-1.;let salt=hash(vec3f(id,u.seed,42.));
  var center=vec3f(sin(id*2.4)*2.1,cos(id*1.7)*.65,id*64.+40.-travel);
  if(!flight){center=vec3f(0.,0.,radius*u.form.x*2.25);}
  // Intersect a rotated ellipsoid, so the traversal bound follows elongated gas.
  var axes=vec3f(u.form.x,1.25,.8)*radius;
  if(u.pad.y>1.5&&u.pad.y<2.5){axes=vec3f(1.25,u.form.x,.8)*radius;}
  let angle=-.28+sin(id*1.8)*.24;let c=cos(angle);let s=sin(angle);
  let rd=vec3f(c*ray.x-s*ray.y,s*ray.x+c*ray.y,ray.z)/axes;
  let rc=vec3f(c*center.x-s*center.y,s*center.x+c*center.y,center.z)/axes;
  let aa=dot(rd,rd);let bb=dot(rd,rc);let disc=bb*bb-aa*(dot(rc,rc)-1.44);
  if(disc<=0.){continue;}
  let near=max(0.,(bb-sqrt(disc))/aa);let far=(bb+sqrt(disc))/aa;if(far<=near){continue;}
  let stepSize=(far-near)/u.steps;
  let seed=vec3f(u.seed*.173,u.seed*.419,u.seed*.071)+vec3f(salt*17.);
  for(var i=0u;i<96u;i++){if(i>=steps||trans<.02){break;}
   let world=ray*(near+(f32(i)+.5)*stepSize);let local=world-center;
   let p=vec3f(c*local.x-s*local.y,s*local.x+c*local.y,local.z)/axes;
   let q=p*u.scale*2.8+seed+vec3f(u.time*.004,0.,0.);
   let warp=vec3f(fbm(q*.7),fbm(q*.7+vec3f(7.3)),fbm(q*.7+vec3f(15.8)))-vec3f(.5);
   let n=fbm(q+warp*u.turbulence*1.7);
   let envelope=silhouette(p+warp*.22,u.pad.y);
   let visibility=select(1.,1.-smoothstep(62.,84.,center.z),flight);
   // Thresholded structures rather than a continuously filled cloud.
   let coarseField=fbm(p*3.8+seed*.31+vec3f(81.));
   let holes=smoothstep(.32+u.form.z*.15,.55+u.form.z*.1,coarseField);
   let ridged=pow(max(0.,1.-abs(n-.51)*13.),4.);
   let cross=fbm(q*.72+vec3f(47.));
   let branches=pow(max(0.,1.-abs(cross-.49)*16.),5.);
   let fragments=smoothstep(.50,.69,n)*.45;
   let structure=(max(ridged*.8,branches*.55)+fragments)*holes;
   let halo=smoothstep(.45,.66,n)*.008;
   let gas=(structure+halo)*u.density*envelope*visibility;
   let dustField=fbm(q*.62+vec3f(23.1));
   let lane=smoothstep(.48,.67,dustField)*u.dust;
   let dustGas=lane*envelope*visibility*.095;
   let extinction=gas*.65+dustGas;
   let alpha=1.-exp(-extinction*stepSize*.8);
   // Different spatial emission distributions, not one recoloured noise blend.
   let region=fbm(p*3.5+seed*.37+vec3f(41.));
   let depth=fbm(vec3f(p.xy*5.,p.z*2.)+seed*.19+vec3f(9.));
   let perturb=(region-.5)*.28;
   let band=p.y+sin(p.x*5.)*.12+perturb;
   var weights=vec3f((1.-smoothstep(-.1,.18,band))*.65,smoothstep(.0,.24,band)*.9,exp(-pow((band-.06)*22.,2.))*.28);
   if(u.pad.y>.5&&u.pad.y<1.5){
    let r=length(p.xy)+perturb;
    weights=vec3f(smoothstep(.45,.63,r)*1.05,(1.-smoothstep(.42,.56,r))*.8,smoothstep(.56,.7,depth)*smoothstep(.15,.5,p.x)*.75);
   }
   if(u.pad.y>1.5&&u.pad.y<2.5){
    let edge=p.x+sin(p.y*4.)*.13+perturb;
    weights=vec3f(.04,smoothstep(-.08,.22,edge)*.8,smoothstep(.3,.6,p.y)*smoothstep(.53,.67,depth)*.8);
   }
   if(u.pad.y>2.5&&u.pad.y<3.5){
    let split=p.x+perturb;
    weights=vec3f((1.-smoothstep(-.2,-.02,split))*.95,smoothstep(.05,.25,split)*.95,exp(-split*split*60.)*.25);
   }
   if(u.pad.y>3.5&&u.pad.y<4.5){
    let spine=abs(p.y-sin(p.x*7.)*.16+perturb);
    let branch=abs(p.y+sin(p.x*5.+1.)*.25);
    weights=vec3f(.25,exp(-spine*spine*100.)*1.2,exp(-branch*branch*110.)*smoothstep(.51,.65,region)*.85);
   }
   if(u.pad.y>4.5){
    let r=length(p)+perturb;
    weights=vec3f(smoothstep(.52,.7,r)*.9,(1.-smoothstep(.48,.61,r))*.28,smoothstep(.14,.42,p.x)*smoothstep(.53,.69,depth)*1.2);
   }
   let selective=.35+smoothstep(.39,.62,region)*.65;
   let neutral=vec3f(.009);
   let palette=(u.colorA.rgb*weights.x+u.colorB.rgb*weights.y+u.colorC.rgb*weights.z)*u.form.y*selective;
   let luminance=dot(palette,vec3f(.2126,.7152,.0722));
   let restrained=mix(vec3f(luminance),palette,u.form.w);
   let light=(neutral+restrained)*u.emission*exp(-lane*1.7);
   let source=light*gas/max(extinction,.00001);
   color+=trans*alpha*source;trans*=1.-alpha;
  }
 }
 let stars=starLayer(uv,150.)+starLayer(uv+vec2f(1.37),245.);
 color+=trans*vec3f(.75,.85,1.)*stars*.45;
 color=vec3f(1.)-exp(-color*1.65);return vec4f(pow(color,vec3f(.4545)),1.);

}`;
export class NebulaRenderer{
 async initialize(canvas){if(!navigator.gpu)throw Error('This nebula lab requires WebGPU. Enable hardware acceleration in a WebGPU-capable browser.');this.canvas=canvas;this.adapter=await navigator.gpu.requestAdapter();if(!this.adapter)throw Error('No WebGPU adapter is available.');this.device=await this.adapter.requestDevice();this.context=canvas.getContext('webgpu');if(!this.context)throw Error('WebGPU canvas initialization failed.');const format=navigator.gpu.getPreferredCanvasFormat();this.context.configure({device:this.device,format,alphaMode:'opaque'});const module=this.device.createShaderModule({code:shader});const compilation=await module.getCompilationInfo();const errors=compilation.messages.filter(m=>m.type==='error');if(errors.length)throw Error(errors.map(e=>e.message).join('; '));this.pipeline=await this.device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});this.buffer=this.device.createBuffer({size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.bind=this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.buffer}}]});this.device.lost.then(info=>{if(!this.disposed&&info.reason!=='destroyed')this.onError?.('WebGPU device lost. Reload the lab to recover.');});return this;}
 render(settings,time=0){if(this.disposed)return;const rgb=hex=>[(parseInt(hex.slice(1,3),16)/255)**2.2,(parseInt(hex.slice(3,5),16)/255)**2.2,(parseInt(hex.slice(5,7),16)/255)**2.2,1];const data=new Float32Array([this.canvas.width,this.canvas.height,time,settings.seed,settings.density,settings.scale,settings.turbulence,settings.dust,...rgb(settings.colorA).slice(0,3),settings.size||2.8,...rgb(settings.colorB).slice(0,3),settings.view==='study'?0:1,settings.emission,settings.steps||48,settings.travel||0,settings.shape||0,...rgb(settings.colorC||'#e7a15a'),settings.stretch||3,settings.layers??.55,settings.porosity??.75,settings.monochrome?0:(settings.saturation??.4)]);this.device.queue.writeBuffer(this.buffer,0,data);const encoder=this.device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.bind);pass.draw(3);pass.end();this.device.queue.submit([encoder.finish()]);}
 dispose(){this.disposed=true;this.buffer?.destroy();this.context?.unconfigure();this.device?.destroy();}
}
