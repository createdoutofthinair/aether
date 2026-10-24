@group(0) @binding(0) var<storage,read> c0:array<u32>;
@group(0) @binding(1) var<storage,read> n0:array<u32>;
@group(0) @binding(2) var<storage,read> s0:array<u32>;
@group(0) @binding(3) var<storage,read_write> c1:array<u32>;
@group(0) @binding(4) var<storage,read_write> n1:array<u32>;
@group(0) @binding(5) var<storage,read_write> s1:array<u32>;
struct Config{width:u32,height:u32,size:u32,pad:u32};
@group(0) @binding(6) var<uniform> config:Config;
fn unpack(v:u32)->vec4f{return vec4f(f32(v&255u),f32((v>>8u)&255u),f32((v>>16u)&255u),f32(v>>24u))/255.;}
fn pack(v:vec4f)->u32{let q=vec4u(floor(clamp(v,vec4f(0),vec4f(1))*255.+.5));return q.x|(q.y<<8u)|(q.z<<16u)|(q.w<<24u);}
fn linear(v:f32)->f32{if(v<=.04045){return v/12.92;}return pow((v+.055)/1.055,2.4);}
fn srgb(v:f32)->f32{if(v<=.0031308){return v*12.92;}return 1.055*pow(v,1./2.4)-.055;}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) gid:vec3u){if(gid.x>=config.width||gid.y>=config.height){return;}var color=vec3f(0);var normal=vec3f(0);var surface=vec4f(0);var rr=0.;for(var y=0u;y<2u;y++){for(var x=0u;x<2u;x++){let i=(gid.y*2u+y)*(config.width*2u)+gid.x*2u+x;let c=unpack(c0[i]);let n=unpack(n0[i]);let s=unpack(s0[i]);color+=vec3f(linear(c.r),linear(c.g),linear(c.b))*.25;normal+=(n.rgb*2.-1.)*.25;surface+=s*.25;rr+=s.g*s.g*.25;}}let len=length(normal);let variance=max(0.,1.-min(1.,len));surface.g=clamp(sqrt(rr+variance),.18,.98);let index=gid.y*config.width+gid.x;c1[index]=pack(vec4f(srgb(color.r),srgb(color.g),srgb(color.b),1.));n1[index]=pack(vec4f(normal/max(len,.000001)*.5+.5,1.));s1[index]=pack(surface);}
