// Pinned Three r186 texture handles. Atlas cells stay separate at every mip.
const pipelines=new WeakMap();
export async function filterImpostorAtlas(renderer,targets,tile){
 const device=renderer.backend.device;let cached=pipelines.get(device);
 if(!cached){const module=device.createShaderModule({label:'Impostor cell mip filter',code:`
 @group(0) @binding(0) var source:texture_2d<f32>;
 @vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
 @fragment fn fragment(@builtin(position) p:vec4f)->@location(0) vec4f{let xy=vec2i(p.xy)*2;return (textureLoad(source,xy,0)+textureLoad(source,xy+vec2i(1,0),0)+textureLoad(source,xy+vec2i(0,1),0)+textureLoad(source,xy+vec2i(1,1),0))*.25;}`});cached=new Map();pipelines.set(device,cached);for(const format of ['rgba8unorm-srgb','rgba16float'])cached.set(format,await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format}]},primitive:{topology:'triangle-list'}}));}
 const encoder=device.createCommandEncoder({label:'Per-view impostor mipmaps'});
 for(const [target,format]of targets){const texture=renderer.backend.get(target.texture).texture,pipeline=cached.get(format);if(!texture)throw Error('Impostor GPU texture unavailable');for(let mip=1;mip<=Math.log2(tile);mip++){
  const pass=encoder.beginRenderPass({colorAttachments:[{view:texture.createView({baseMipLevel:mip,mipLevelCount:1}),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:texture.createView({baseMipLevel:mip-1,mipLevelCount:1})}]}));pass.draw(3);pass.end();
 }}device.queue.submit([encoder.finish()]);await device.queue.onSubmittedWorkDone();
}
const validators=new WeakMap();
export async function validateImpostorGPU(renderer,target,tile,grid){
 const device=renderer.backend.device;let pipeline=validators.get(device);if(!pipeline){const module=device.createShaderModule({label:'Impostor coverage reduction',code:`
 @group(0) @binding(0) var image:texture_2d<f32>;
 @group(0) @binding(1) var<storage,read_write> counts:array<atomic<u32>>;
 @group(0) @binding(2) var<uniform> config:vec4u;
 @compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) p:vec3u){if(any(p.xy>=config.xy)){return;}if(textureLoad(image,vec2i(p.xy),0).a>0.){let cell=p.xy/config.z;atomicAdd(&counts[cell.y*config.w+cell.x],1u);}}`});pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}});validators.set(device,pipeline);}
 const bytes=grid*grid*4,counts=device.createBuffer({size:bytes,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),read=device.createBuffer({size:bytes,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),config=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 try{device.queue.writeBuffer(config,0,new Uint32Array([tile*grid,tile*grid,tile,grid]));const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:renderer.backend.get(target.texture).texture.createView({baseMipLevel:0,mipLevelCount:1})},{binding:1,resource:{buffer:counts}},{binding:2,resource:{buffer:config}}]}));pass.dispatchWorkgroups(Math.ceil(tile*grid/8),Math.ceil(tile*grid/8));pass.end();encoder.copyBufferToBuffer(counts,0,read,0,bytes);device.queue.submit([encoder.finish()]);await read.mapAsync(GPUMapMode.READ);const coverage=Array.from(new Uint32Array(read.getMappedRange())).map(n=>n/(tile*tile));read.unmap();if(coverage.some(n=>!n))throw Error('Empty GPU impostor capture');return coverage;}finally{counts.destroy();read.destroy();config.destroy();}
}
