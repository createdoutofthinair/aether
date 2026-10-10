// Build input for Basis Universal. Requires Python/Pillow for image I/O.
// Retains exact slope-moment mip chains in uncompressed DDS input.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gaussianize} from '../dist/stochastic-material.js';
import {normalMomentMipmaps} from '../dist/normal-moments.js';
const out=process.argv[2]||'/tmp/aether-material-input';mkdirSync(out,{recursive:true});
const decode=(path,name)=>{const meta=JSON.parse(execFileSync('python',['-c','from PIL import Image; import json,sys; im=Image.open(sys.argv[1]).convert("RGBA");open(sys.argv[2],"wb").write(im.tobytes());print(json.dumps(list(im.size)))',path,`${out}/${name}.rgba`],{encoding:'utf8'}));return{pixels:new Uint8Array(readFileSync(`${out}/${name}.rgba`)),width:meta[0],height:meta[1]};};
const inverse=new Float32Array(256*3*4);
for(const [row,[name,file]]of [['rock','rock_boulder_dry_diff.jpg'],['sand','sandy_gravel_diff.jpg'],['mud','mud_cracked_dry_03_diff.jpg']].entries()){
 const {pixels,width,height}=decode(`dist/${file}`,name),data=gaussianize(pixels);inverse.set(data.inverse,row*256*4);writeFileSync(`${out}/${name}-gaussian.rgba`,data.encoded);
 execFileSync('python',['-c','from PIL import Image; import sys;Image.frombytes("RGBA",(int(sys.argv[2]),int(sys.argv[3])),open(sys.argv[1],"rb").read()).save(sys.argv[4])',`${out}/${name}-gaussian.rgba`,String(width),String(height),`${out}/${name}-gaussian.png`]);
}
writeFileSync('dist/material-histogram.json',JSON.stringify(Array.from(inverse)));
for(const [name,file]of [['rn','rock_boulder_dry_nor_gl.jpg'],['sn','sandy_gravel_nor_gl.jpg'],['mn','mud_cracked_dry_03_nor_gl.jpg']]){
 const {pixels,width,height}=decode(`dist/${file}`,name),levels=normalMomentMipmaps(pixels,width,height),header=Buffer.alloc(128);header.write('DDS ',0);header.writeUInt32LE(124,4);header.writeUInt32LE(0x2100f,8);header.writeUInt32LE(height,12);header.writeUInt32LE(width,16);header.writeUInt32LE(width*4,20);header.writeUInt32LE(levels.length,28);header.writeUInt32LE(32,76);header.writeUInt32LE(0x41,80);header.writeUInt32LE(32,88);header.writeUInt32LE(0xff,92);header.writeUInt32LE(0xff00,96);header.writeUInt32LE(0xff0000,100);header.writeUInt32LE(0xff000000,104);header.writeUInt32LE(0x401008,108);writeFileSync(`${out}/${name}-moments.dds`,Buffer.concat([header,...levels.map(l=>Buffer.from(l.data))]));
}
console.log('Prepared Gaussian albedo, inverse histogram and slope-moment DDS mip chains');
