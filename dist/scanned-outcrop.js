export async function loadScannedOutcrop(T){
 const [metadata,buffer]=await Promise.all([fetch('./scans/rock-face-01.json').then(r=>{if(!r.ok)throw Error('Scan metadata unavailable');return r.json();}),fetch('./scans/rock-face-01.bin').then(r=>{if(!r.ok)throw Error('Scan geometry unavailable');return r.arrayBuffer();})]);
 if(metadata.count*8*4!==buffer.byteLength||!metadata.dimensions.every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid scanned geometry');
 const data=new Float32Array(buffer),positions=new Float32Array(metadata.count*3),normals=positions.slice(),uv=new Float32Array(metadata.count*2);
 for(let i=0;i<metadata.count;i++){positions.set(data.subarray(i*8,i*8+3),i*3);normals.set(data.subarray(i*8+3,i*8+6),i*3);uv.set(data.subarray(i*8+6,i*8+8),i*2);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('normal',new T.BufferAttribute(normals,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();return{geometry,metadata};
}
