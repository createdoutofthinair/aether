@group(0) @binding(0) var<storage,read> params:array<u32>;
@group(0) @binding(1) var<storage,read_write> colors:array<u32>;
@group(0) @binding(2) var<storage,read_write> surfaces:array<u32>;
@group(0) @binding(3) var<storage,read_write> heights:array<f32>;
struct Config{width:u32,height:u32,size:u32,pad:u32};
@group(0) @binding(4) var<uniform> config:Config;
fn fp(z:u32,k:u32)->f32{return bitcast<f32>(params[z*80u+k]);}
fn hash(x:u32,y:u32,s:u32)->f32{var h=((x^s)*374761393u)^(y*668265263u);h=(h^(h>>13u))*1274126177u;return f32(h^(h>>16u))/4294967295.;}
fn srgb(v:f32)->f32{if(v<=.0031308){return v*12.92;}return 1.055*pow(v,1./2.4)-.055;}
fn pack(v:vec4f)->u32{let q=vec4u(floor(clamp(v,vec4f(0),vec4f(1))*255.+.5));return q.x|(q.y<<8u)|(q.z<<16u)|(q.w<<24u);}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) p:vec3u){
 if(p.x>=config.width||p.y>=config.height){return;}let z=p.x/config.size+(p.y/config.size)*4u;let n=f32(config.size);let core=n*.75;let uv=fract((vec2f(p.xy%config.size)+.5-vec2f(n/8.))/core);let seed=params[z*80u+28u];let grain=hash(u32(uv.x*core),u32(uv.y*core),seed);let paving=z==1u;
 let f=fract(uv*4.);let edge=min(min(f.x,1.-f.x),min(f.y,1.-f.y))*.5;let seam=select(0.,clamp((.009-edge)/.006,0.,1.),paving);let lip=select(0.,clamp((.021-edge)/.013,0.,1.)*(1.-seam),paving);let dirt=fp(z,12u)*clamp((.07-edge)/.07,0.,1.)*.35;
 let id=hash(u32(uv.x*4.),u32(uv.y*4.),seed+5u);let gain=1.+(grain-.5)*select(.11,.035,paving)+(id-.5)*select(0.,.035,paving)-seam*.3-dirt*.16;
 let base=vec3f(fp(z,0u),fp(z,1u),fp(z,2u))*gain;let rough=clamp(fp(z,9u)+(grain-.5)*select(.15,.06,paving)+dirt*.15+seam*.12,.22,.97);let height=(grain-.5)*select(.0014,.00025,paving)-seam*.003+lip*.0005;let index=p.y*config.width+p.x;
 colors[index]=pack(vec4f(srgb(max(0.,base.r)),srgb(max(0.,base.g)),srgb(max(0.,base.b)),1.));surfaces[index]=pack(vec4f(1.-seam*.32,rough,0.,.5+height*40.));heights[index]=height;
}
