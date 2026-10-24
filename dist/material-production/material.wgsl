// CPU building-material.js parity port. Explicit unorm8 packing matches assets.
@group(0) @binding(0) var<storage,read> params:array<u32>;
@group(0) @binding(1) var<storage,read_write> colors:array<u32>;
@group(0) @binding(2) var<storage,read_write> surfaces:array<u32>;
@group(0) @binding(3) var<storage,read_write> heights:array<f32>;
struct Config { width:u32,height:u32,size:u32,pad:u32 };
@group(0) @binding(4) var<uniform> config:Config;
fn fp(z:u32,k:u32)->f32{return bitcast<f32>(params[z*80u+k]);}
fn smoothRange(a:f32,b:f32,x:f32)->f32{let t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
fn modulo(x:f32,n:f32)->f32{return x-floor(x/n)*n;}
fn hash2(x:u32,y:u32,s:u32)->u32{var h=((x^s)*374761393u)^(y*668265263u);h=(h^(h>>13u))*1274126177u;return h^(h>>16u);}
fn grad(h:u32,p:vec2f)->f32{switch(h&7u){case 0u:{return p.x;}case 1u:{return -p.x;}case 2u:{return p.y;}case 3u:{return -p.y;}case 4u:{return .7071*(p.x+p.y);}case 5u:{return .7071*(-p.x+p.y);}case 6u:{return .7071*(p.x-p.y);}default:{return -.7071*(p.x+p.y);}}}
fn fade(t:vec2f)->vec2f{return t*t*t*(t*(t*6.-15.)+10.);}
fn noise(uv:vec2f,fx:f32,fy:f32,z:u32)->f32{
 let core=f32(config.size)*.75;let weight=1.-smoothRange(core*.18,core*.45,max(fx,fy));if(weight<=0.){return .5;}
 let p=uv*vec2f(fx,fy);let i=floor(p);let d=p-i;let f=fade(d);let s=params[z*80u+28u];
 let h00=hash2(u32(modulo(i.x,fx)),u32(modulo(i.y,fy)),s);let h10=hash2(u32(modulo(i.x+1.,fx)),u32(modulo(i.y,fy)),s);let h01=hash2(u32(modulo(i.x,fx)),u32(modulo(i.y+1.,fy)),s);let h11=hash2(u32(modulo(i.x+1.,fx)),u32(modulo(i.y+1.,fy)),s);
 let n=clamp(.5+.75*mix(mix(grad(h00,d),grad(h10,d-vec2f(1,0)),f.x),mix(grad(h01,d-vec2f(0,1)),grad(h11,d-vec2f(1,1)),f.x),f.y),0.,1.);return mix(.5,n,weight);
}
fn fbm(uv:vec2f,f:f32,z:u32)->f32{return noise(uv,f,f,z)*.55+noise(uv,f*2.,f*2.,z)*.28+noise(uv,f*4.,f*4.,z)*.12+noise(uv,f*8.,f*8.,z)*.05;}
fn runoff(u:f32,v:f32,z:u32)->f32{
 let down=1.-v;let wander=(noise(vec2f(u,v),4.,4.,z)-.5)*.006;let cell=i32(floor(u*12.));var value=0.;
 for(var j=-1;j<=1;j++){let source=u32(((cell+j)%12+12)%12);let at=32u+source*4u;let su=fp(z,at);let length=fp(z,at+1u);if(fp(z,at+3u)<.5||down>length){continue;}
 let delta=modulo(u-su+wander+.5,1.)-.5;let width=max(.75/(f32(config.size)*.75),fp(z,at+2u)*(.3+.7*(1.-down/length)));let d=delta/width;value+=(exp(-d*d*.5)+exp(-d*d/18.)*.09)*(1.-smoothRange(length*.65,length,down))*exp(-down*1.2);
 }return clamp(value,0.,1.)*fp(z,15u)*(.25+.75*fp(z,22u));
}
fn srgb(v:f32)->f32{if(v<=.0031308){return v*12.92;}return 1.055*pow(v,1./2.4)-.055;}
fn pack4(v:vec4f)->u32{let a=vec4u(floor(clamp(v,vec4f(0),vec4f(1))*255.+.5));return a.x|(a.y<<8u)|(a.z<<16u)|(a.w<<24u);}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) gid:vec3u){
 if(gid.x>=config.width||gid.y>=config.height){return;}let n=f32(config.size);let guard=n/8.;let core=n*.75;let lx=gid.x%config.size;let ly=gid.y%config.size;let z=gid.x/config.size+(gid.y/config.size)*4u;let index=gid.y*config.width+gid.x;
 let u=(modulo(f32(lx)-guard,core)+.5)/core;let v=(modulo(f32(ly)-guard,core)+.5)/core;let panels=vec2f(fp(z,18u),fp(z,19u));let panel=vec2f(modulo(u*panels.x,1.),modulo(v*panels.y,1.));let ex=min(panel.x,1.-panel.x)*2./panels.x;let ey=min(panel.y,1.-panel.y)*2./panels.y;let edge=min(ex,ey);let joint=1.-smoothRange(.002,.009,edge);let lip=(1.-smoothRange(.009,.022,edge))*(1.-joint);
 let warp=(noise(vec2f(u,v),4.,4.,z)-.5)*.035;let cloud=fbm(vec2f(u+warp,v),2.,z);let meso=fbm(vec2f(u-warp,v),8.,z);let fine=noise(vec2f(u,v),128.,128.,z);let pores=smoothRange(.67,.84,noise(vec2f(u+warp,v),64.,64.,z))*fp(z,21u);
 let grain=(noise(vec2f(u,v),192.,192.,z)-.5)*fp(z,10u);var brushing=0.;if(fp(z,24u)>.5){brushing=(noise(vec2f(u,v),192.,8.,z)-.5)*.00018;}
 let chip=(1.-smoothRange(.008,.065,edge))*smoothRange(.42,.65,meso)*fp(z,12u)*fp(z,13u);var exposed=chip;if(fp(z,24u)>.5){exposed=1.;}let oxide=exposed*fp(z,16u)*fp(z,12u)*smoothRange(.35,.7,cloud);let drip=runoff(u,panel.y,z);let dirt=clamp(fp(z,14u)*(joint*.5+drip*.9+smoothRange(.43,.73,cloud)*.22),0.,.8);let deposit=fp(z,17u)*(joint*.38+drip*.55)*(.3+fp(z,22u)*.7);let damp=fp(z,23u)*smoothRange(.3,.68,cloud);
 let h=clamp((-joint*.0019+lip*.0004-pores*.0009*fp(z,10u)-chip*.0013+oxide*.0005+deposit*.00018+(meso-.5)*.00022+grain*.00013+brushing)*fp(z,11u),-.011,.011);heights[index]=h;
 let base=vec3f(fp(z,0u),fp(z,1u),fp(z,2u));let sub=vec3f(fp(z,3u),fp(z,4u),fp(z,5u));let rust=vec3f(fp(z,6u),fp(z,7u),fp(z,8u));let dust=vec3f(fp(z,29u),fp(z,30u),fp(z,31u));
 let variation=noise((floor(vec2f(u,v)*panels)+vec2f(.37,.19))/panels,16.,16.,z)-.5;var color=base*(1.+(cloud-.5)*.12+(fine-.5)*.014+variation*.12);color=mix(color,sub,chip*.9);color=mix(color,rust,oxide*.85);color=mix(color,dust,deposit*.25);color*=1.-dirt*.48;color=mix(color,color*.7,damp);color=mix(color,vec3f(.52),deposit*.12);colors[index]=pack4(vec4f(srgb(max(0.,color.r)),srgb(max(0.,color.g)),srgb(max(0.,color.b)),1.));
 let rough=clamp(fp(z,9u)+(meso-.5)*.16*fp(z,10u)+pores*.07+joint*.1+oxide*.24+dirt*.16+deposit*.12-damp*.35,.12,.98);let metal=exposed*fp(z,20u)*(1.-oxide)*(1.-dirt*.8)*(1.-deposit);surfaces[index]=pack4(vec4f(clamp(1.-joint*.25-pores*.15-chip*.07,0.,1.),rough,metal,.5+h*40.));
}
