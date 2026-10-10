"""Rebuild distributable KTX2 assets with a supplied Basis Universal binary."""
import concurrent.futures,json,subprocess,sys
from pathlib import Path
encoder=sys.argv[1];prepared=Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/aether-material-input');target=Path('dist/compressed');target.mkdir(exist_ok=True)
assets={
 'rock':('dist/rock_boulder_dry_diff.jpg',True,False),
 'sand':('dist/sandy_gravel_diff.jpg',True,False),
 'mud':('dist/mud_cracked_dry_03_diff.jpg',True,False),
 'rockGaussian':(str(prepared/'rock-gaussian.png'),False,False),
 'sandGaussian':(str(prepared/'sand-gaussian.png'),False,False),
 'mudGaussian':(str(prepared/'mud-gaussian.png'),False,False),
 'rn':(str(prepared/'rn-moments.dds'),False,True),
 'sn':(str(prepared/'sn-moments.dds'),False,True),
 'mn':(str(prepared/'mn-moments.dds'),False,True),
 'rs':('dist/rock_boulder_dry_surface.png',False,False),
 'ss':('dist/sandy_gravel_surface.png',False,False),
 'ms':('dist/mud_cracked_dry_03_surface.png',False,False),
 'rr':('dist/rock_boulder_dry_rough.jpg',False,False)}
def encode(item):
 name,(source,srgb,custom)=item;path=target/(name+'.ktx2');args=[encoder,'-file',source,'-output_file',str(path),'-max_threads','2','-y_flip']
 args+=['-srgb' if srgb else '-linear']
 args+=['-q','255','-comp_level','2'] if srgb else ['-uastc','-uastc_level','2']
 if not custom:args+=['-mipmap']
 result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 if result.returncode:raise RuntimeError(result.stdout[-4000:])
 print(name,path.stat().st_size,flush=True);return name
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(encode,assets.items()))
(target/'manifest.json').write_text(json.dumps({name:{'path':'./compressed/'+name+'.ktx2','srgb':args[1],'normalMoments':args[2]} for name,args in assets.items()},indent=2)+'\n')
