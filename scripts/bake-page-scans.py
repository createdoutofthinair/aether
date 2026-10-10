"""Build bounded, linear PBR mip pyramids from the existing source scans."""
import json,struct
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]/'dist'
materials=[('rock','rock_boulder_dry',3.24),('sand','sandy_gravel',4.),('mud','mud_cracked_dry_03',2.25)]
metadata={'version':1,'channels':10,'materials':[]};blocks=[];offset=0
for name,prefix,tile in materials:
 def load(suffix):return np.asarray(Image.open(root/(prefix+suffix)).convert('RGB'),dtype=np.float32)/255
 def reduce64(values):
  size=values.shape[0]
  while size>64:values=values.reshape(size//2,2,size//2,2,values.shape[2]).mean(axis=(1,3));size//=2
  return values
 c=load('_diff.jpg');c=reduce64(np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4))
 surface=load('_surface.png');surface[:,:,0]**=4;surface=reduce64(surface)
 normal=load('_nor_gl.jpg')*2-1;slopes=normal[:,:,:2]/np.maximum(.3,normal[:,:,2:3]);moments=np.sum(slopes*slopes,axis=2)
 normals=reduce64(np.concatenate([slopes,moments[:,:,None]],axis=2));size=64
 pixels=np.concatenate([c,surface,normals,np.ones((size,size,1),np.float32)],axis=2)
 entry={'id':name,'tileMetres':tile,'source':prefix,'levels':[]}
 while True:
  b=np.asarray(pixels,dtype='<f4').tobytes();entry['levels'].append({'size':size,'offset':offset,'bytes':len(b)});blocks.append(b);offset+=len(b)
  if size==1:break
  pixels=pixels.reshape(size//2,2,size//2,2,10).mean(axis=(1,3));size//=2
 metadata['materials'].append(entry)
header=json.dumps(metadata,separators=(',',':')).encode();(root/'page-scans.bin').write_bytes(b'AETPBR01'+struct.pack('<I',len(header))+header+b''.join(blocks))
print('page-scans.bin',12+len(header)+offset,'bytes; 3 linear/moment-preserving scanned PBR pyramids')
