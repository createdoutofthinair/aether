// The source is Poly Haven's CC0 rock_face_01 proxy, not a material preview sphere.
// Pass the locally downloaded glTF, buffer, and meshoptimizer module paths.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [gltfPath,bufferPath,simplifierPath]=process.argv.slice(2);const {MeshoptSimplifier}=await import(pathToFileURL(simplifierPath));await MeshoptSimplifier.ready;
const gltf=JSON.parse(readFileSync(gltfPath)),buffer=readFileSync(bufferPath),primitive=gltf.meshes[0].primitives[0];
function accessor(i){const a=gltf.accessors[i],v=gltf.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3}[a.type],Type=a.componentType===5126?Float32Array:Uint16Array;return new Type(buffer.buffer,buffer.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*components).slice();}
const positions=accessor(primitive.attributes.POSITION),normals=accessor(primitive.attributes.NORMAL),uv=accessor(primitive.attributes.TEXCOORD_0),indices=Uint32Array.from(accessor(primitive.indices)),attributes=new Float32Array(positions.length/3*5);
for(let i=0;i<positions.length/3;i++)attributes.set([...normals.subarray(i*3,i*3+3),...uv.subarray(i*2,i*2+2)],i*5);
const [simplified,error]=MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,attributes,5,[.1,.1,.1,1,1],null,4500,.02);
const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<positions.length;i++) {min[i%3]=Math.min(min[i%3],positions[i]);max[i%3]=Math.max(max[i%3],positions[i]);}const dimensions=max.map((v,i)=>v-min[i]),count=simplified.length,output=new Float32Array(count*8);
for(let i=0;i<count;i++){const k=simplified[i];for(let c=0;c<3;c++)output[i*8+c]=(positions[k*3+c]-min[c])/dimensions[c]-(c===1?.1:.5);const nx=normals[k*3]*dimensions[0],ny=normals[k*3+1]*dimensions[1],nz=normals[k*3+2]*dimensions[2],len=Math.hypot(nx,ny,nz);output.set([nx/len,ny/len,nz/len,...uv.subarray(k*2,k*2+2)],i*8+3);}
mkdirSync('dist/scans',{recursive:true});writeFileSync('dist/scans/rock-face-01.bin',Buffer.from(output.buffer));writeFileSync('dist/scans/rock-face-01.json',JSON.stringify({count,dimensions,sourceTriangles:indices.length/3,triangles:count/3,simplificationRelativeError:error,source:'https://polyhaven.com/a/rock_face_01',author:'Dario Barresi',license:'CC0',format:'Float32 position(3), normal(3), uv(2); nonindexed'},null,2)+'\n');console.log({count,dimensions,error});
