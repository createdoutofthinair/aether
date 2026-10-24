struct Pixel{color:u32,normal:u32,surface:u32};
@group(0) @binding(0) var<storage,read> colors:array<u32>;
@group(0) @binding(1) var<storage,read> normals:array<u32>;
@group(0) @binding(2) var<storage,read> surfaces:array<u32>;
@group(0) @binding(3) var<storage,read_write> packed:array<Pixel>;
@group(0) @binding(4) var<storage,read> inputPixels:array<Pixel>;
@group(0) @binding(5) var<storage,read_write> outColors:array<u32>;
@group(0) @binding(6) var<storage,read_write> outNormals:array<u32>;
@group(0) @binding(7) var<storage,read_write> outSurfaces:array<u32>;
@compute @workgroup_size(64) fn interleave(@builtin(global_invocation_id) gid:vec3u){let i=gid.x;if(i>=arrayLength(&packed)){return;}packed[i]=Pixel(colors[i],normals[i],surfaces[i]);}
@compute @workgroup_size(64) fn split(@builtin(global_invocation_id) gid:vec3u){let i=gid.x;if(i>=arrayLength(&inputPixels)){return;}outColors[i]=inputPixels[i].color;outNormals[i]=inputPixels[i].normal;outSurfaces[i]=inputPixels[i].surface;}
