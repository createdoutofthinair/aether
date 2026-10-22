export const OCT_GRID=5;
const norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
export function octDirection(x,y,grid=OCT_GRID){const u=x/(grid-1),v=y/(grid-1),a=u+v-1,b=u-v;return norm([a,1-Math.abs(a)-Math.abs(b),b]);}
export function octEncode(direction,grid=OCT_GRID){const [x,y,z]=direction,l=Math.abs(x)+Math.abs(y)+Math.abs(z)||1;return[(x/l+z/l+1)*.5*(grid-1),(x/l-z/l+1)*.5*(grid-1)];}
export function octFrames(direction,grid=OCT_GRID){const p=octEncode(direction,grid),x=Math.min(grid-2,Math.max(0,Math.floor(p[0]))),y=Math.min(grid-2,Math.max(0,Math.floor(p[1]))),fx=p[0]-x,fy=p[1]-y;return fx+fy<=1?{frames:[[x,y],[x+1,y],[x,y+1]],weights:[1-fx-fy,fx,fy]}:{frames:[[x+1,y+1],[x,y+1],[x+1,y]],weights:[fx+fy-1,1-fx,1-fy]};}
export function captureBasis(d){const h=Math.hypot(d[0],d[2]),right=h<1e-7?[1,0,0]:[d[2]/h,0,-d[0]/h],up=[d[1]*right[2]-d[2]*right[1],d[2]*right[0]-d[0]*right[2],d[0]*right[1]-d[1]*right[0]];return{right,up};}
export function reprojectPoint(point,ray,capture,depth){const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),distance=(dot(point,capture)+depth)/Math.max(.05,dot(ray,capture));return{point:point.map((v,i)=>v-ray[i]*distance),distance};}
// Validate the final GPU atlas, including the texture-copy path, before use.
export function validateAtlasCoverage(pixels,tile,grid=OCT_GRID){
 const side=tile*grid;
 if(pixels.length!==side*side*4)throw Error('Incomplete forest atlas readback');
 const coverage=[];
 for(let row=0;row<grid;row++)for(let col=0;col<grid;col++){
  let occupied=0;
  for(let y=0;y<tile;y++)for(let x=0;x<tile;x++)if(pixels[((row*tile+y)*side+col*tile+x)*4+3]>0)occupied++;
  if(!occupied)throw Error(`Empty forest atlas capture ${col},${row}`);
  coverage.push(occupied/(tile*tile));
 }
 return coverage;
}
