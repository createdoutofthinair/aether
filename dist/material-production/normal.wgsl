@group(0) @binding(0) var<storage,read> heights:array<f32>;
@group(0) @binding(1) var<storage,read_write> normals:array<u32>;
struct Config{width:u32,height:u32,size:u32,pad:u32};
@group(0) @binding(2) var<uniform> config:Config;
fn h(x:i32,y:i32,cell:vec2u)->f32{let n=i32(config.size);let g=n/8;let core=n*3/4;let px=((x-g)%core+core)%core+g;let py=((y-g)%core+core)%core+g;return heights[(cell.y*config.size+u32(py))*config.width+cell.x*config.size+u32(px)];}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) gid:vec3u){if(gid.x>=config.width||gid.y>=config.height){return;}let cell=gid.xy/config.size;let xy=vec2i(gid.xy%config.size);let spacing=2./(f32(config.size)*.75);let dx=(h(xy.x+1,xy.y,cell)-h(xy.x-1,xy.y,cell))/(2.*spacing);let dy=(h(xy.x,xy.y+1,cell)-h(xy.x,xy.y-1,cell))/(2.*spacing);let v=normalize(vec3f(-dx,-dy,1.));let q=vec3u(floor((v*.5+.5)*255.+.5));normals[gid.y*config.width+gid.x]=q.x|(q.y<<8u)|(q.z<<16u)|0xff000000u;}
