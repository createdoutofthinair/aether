struct Pixel{color:u32,normal:u32,surface:u32};
@group(0) @binding(0) var<storage,read> params:array<u32>;
@group(0) @binding(1) var<storage,read> a:array<Pixel>;
@group(0) @binding(2) var<storage,read> b:array<Pixel>;
@group(0) @binding(3) var<storage,read_write> outputPixels:array<Pixel>;
fn fp(k:u32)->f32{return bitcast<f32>(params[k]);}
fn unpack(v:u32)->vec4f{return vec4f(f32(v&255u),f32((v>>8u)&255u),f32((v>>16u)&255u),f32(v>>24u))/255.;}
fn pack(v:vec4f)->u32{let q=vec4u(floor(clamp(v,vec4f(0),vec4f(1))*255.+.5));return q.x|(q.y<<8u)|(q.z<<16u)|(q.w<<24u);}
fn lin(v:f32)->f32{if(v<=.04045){return v/12.92;}return pow((v+.055)/1.055,2.4);}
fn enc(v:f32)->f32{if(v<=.0031308){return v*12.92;}return 1.055*pow(max(0.,v),1./2.4)-.055;}
fn lc(c:vec3f)->vec3f{return vec3f(lin(c.r),lin(c.g),lin(c.b));}
fn sc(c:vec3f)->vec3f{return vec3f(enc(c.r),enc(c.g),enc(c.b));}
fn modulo(x:f32,n:f32)->f32{return x-floor(x/n)*n;}
fn sm(a:f32,b:f32,x:f32)->f32{let t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
fn hash2(x:u32,y:u32,s:u32)->u32{var h=((x^s)*374761393u)^(y*668265263u);h=(h^(h>>13u))*1274126177u;return h^(h>>16u);}
fn grad(h:u32,p:vec2f)->f32{switch(h&7u){case 0u:{return p.x;}case 1u:{return -p.x;}case 2u:{return p.y;}case 3u:{return -p.y;}case 4u:{return .7071*(p.x+p.y);}case 5u:{return .7071*(-p.x+p.y);}case 6u:{return .7071*(p.x-p.y);}default:{return -.7071*(p.x+p.y);}}}
fn noise(uv:vec2f,f:f32,seed:u32)->f32{let p=uv*f;let i=floor(p);let d=p-i;let t=d*d*d*(d*(d*6.-15.)+10.);let h00=hash2(u32(modulo(i.x,f)),u32(modulo(i.y,f)),seed);let h10=hash2(u32(modulo(i.x+1.,f)),u32(modulo(i.y,f)),seed);let h01=hash2(u32(modulo(i.x,f)),u32(modulo(i.y+1.,f)),seed);let h11=hash2(u32(modulo(i.x+1.,f)),u32(modulo(i.y+1.,f)),seed);return clamp(.5+.75*mix(mix(grad(h00,d),grad(h10,d-vec2f(1,0)),t.x),mix(grad(h01,d-vec2f(0,1)),grad(h11,d-vec2f(1,1)),t.x),t.y),0.,1.);}
fn field(uv:vec2f)->vec2f{let s=params[2];let f=noise(uv,4.,s)*.55+noise(uv,8.,s)*.28+noise(uv,16.,s)*.12+noise(uv,32.,s)*.05;let grain=noise(uv,64.,s);let kinds=array<f32,4>(.007,.003,.0003,.0008);let grains=array<f32,4>(.0015,.0004,.00005,.00012);return vec2f(f,(kinds[params[3]]*f+grains[params[3]]*grain)*fp(8u));}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) gid:vec3u){let n=params[1];if(gid.x>=n||gid.y>=n){return;}let g=f32(n)/8.;let core=f32(n)*.75;let uv=vec2f((modulo(f32(gid.x)-g,core)+.5)/core,(modulo(f32(gid.y)-g,core)+.5)/core);let i=gid.y*n+gid.x;
 if(params[0]==0u){let f=field(uv);let grain=noise(uv,64.,params[2]);let e=1./core;let dx=(field(uv+vec2f(e,0)).y-field(uv-vec2f(e,0)).y)*core/4.;let dy=(field(uv+vec2f(0,e)).y-field(uv-vec2f(0,e)).y)*core/4.;let normal=normalize(vec3f(-dx,-dy,1.));outputPixels[i]=Pixel(pack(vec4f(sc(vec3f(fp(4u),fp(5u),fp(6u))*(.7+f.x*.6+(grain-.5)*.08)),1.)),pack(vec4f(normal*.5+.5,1.)),pack(vec4f(clamp(1.-(1.-grain)*.08,0.,1.),clamp(fp(7u)+(f.x-.5)*.12,.12,.98),0.,.5+f.y*40.)));return;}
 let ca=unpack(a[i].color);let na=unpack(a[i].normal).rgb*2.-1.;let sa=unpack(a[i].surface);var color=ca.rgb;var normal=na;var surface=sa;
 if(params[0]==1u){color=sc(lc(color)*vec3f(fp(10u),fp(11u),fp(12u)));surface.g=clamp(surface.g*fp(7u),.04,.98);normal=normalize(vec3f(na.xy*fp(9u),na.z));}
 if(params[0]==2u){let f=noise(uv,8.,params[2]);let edge=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));let dirt=clamp(fp(22u)*(f*.3+(1.-sm(.005,.04,edge))*.6),0.,1.);let wet=fp(23u)*f;color=sc(lc(color)*(1.-dirt*.5)*(1.-wet*.2));surface.g=clamp(surface.g+dirt*.15-wet*.25,.12,.98);surface.b*=1.-dirt;}
 if(params[0]==3u){let cb=unpack(b[i].color);let nb=unpack(b[i].normal).rgb*2.-1.;let sb=unpack(b[i].surface);var m=1.;if(params[21]!=0u||params[15]!=1u){let f=noise(uv,max(1.,round(fp(17u))),params[16]);m=sm(1.-fp(18u)-fp(19u),1.-fp(18u)+fp(19u),f);if(fp(18u)<=0.){m=0.;}if(fp(18u)>=1.){m=1.;}if(params[20]!=0u){m=1.-m;}}if(params[15]==2u){m=clamp((1.-sa.r)*3.+m*.3,0.,1.);}if(params[15]==3u){m*=sm(.15,.85,uv.y);}var w=clamp(fp(13u)*m,0.,1.);w=clamp(w+(sb.a-sa.a)*fp(14u)*4.*w*(1.-w),0.,1.);color=sc(mix(lc(ca.rgb),lc(cb.rgb),w));normal=normalize(mix(na,nb,w));surface=mix(sa,sb,w);surface.g=sqrt(mix(sa.g*sa.g,sb.g*sb.g,w));}
 outputPixels[i]=Pixel(pack(vec4f(color,1.)),pack(vec4f(normal*.5+.5,1.)),pack(surface));
}
