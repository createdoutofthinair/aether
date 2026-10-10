// Connected spherical drainage. Longitude wraps; both poles are single graph nodes.
// Resolution is deliberately regional: fine authored terrain remains a residual.
export const PLANET_DATA_VERSION=1;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const planetDataKey=(config,environment)=>JSON.stringify([PLANET_DATA_VERSION,...['seed','relief','temperature','water','pressure','activity'].map(k=>config[k]),environment.waterEnabled,environment.iceEnabled,environment.basin]);
export function generatePlanetData(config,environment,sampleHeight,{width=256,height=129,passes=6}={}){
 const w=width,h=height,count=w*(h-2)+2,last=count-1;
 const index=(x,y)=>y<=0?0:y>=h-1?last:1+(y-1)*w+((x%w+w)%w);
 const direction=(x,y)=>{const lat=Math.PI/2-y/(h-1)*Math.PI,lon=x/w*2*Math.PI-Math.PI;return{x:Math.cos(lat)*Math.sin(lon),y:Math.sin(lat),z:Math.cos(lat)*Math.cos(lon)};};
 const positions=Array.from({length:count},(_,k)=>k===0?direction(0,0):k===last?direction(0,h-1):direction((k-1)%w,1+Math.floor((k-1)/w)));
 const neighbours=Array.from({length:count},(_,k)=>{if(k===0)return Array.from({length:w},(_,x)=>index(x,1));if(k===last)return Array.from({length:w},(_,x)=>index(x,h-2));const x=(k-1)%w,y=1+Math.floor((k-1)/w);return [...new Set([index(x-1,y),index(x+1,y),index(x,y-1),index(x,y+1),index(x-1,y-1),index(x+1,y-1),index(x-1,y+1),index(x+1,y+1)])];});
 const original=Float32Array.from(positions,sampleHeight),elevation=original.slice(),sediment=new Float32Array(count);
 const spacing=60000*Math.PI/(h-1),distance=(a,b)=>60000*Math.hypot(positions[a].x-positions[b].x,positions[a].y-positions[b].y,positions[a].z-positions[b].z);
 let flow,parent,order,filled;const heap=[];
 const push=(k,level)=>{let i=heap.length;heap.push([k,level]);while(i){const p=(i-1)>>1;if(heap[p][1]<=level)break;heap[i]=heap[p];i=p;}heap[i]=[k,level];};
 const pop=()=>{const root=heap[0],end=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][1]<heap[c][1])c++;if(heap[c][1]>=end[1])break;heap[i]=heap[c];i=c;}heap[i]=end;}return root;};
 function route(){
  const visited=new Uint8Array(count);parent=new Int32Array(count);parent.fill(-1);filled=elevation.slice();order=[];heap.length=0;
  let outlets=0,minimum=0;for(let k=0;k<count;k++){if(elevation[k]<elevation[minimum])minimum=k;if(environment.waterEnabled&&elevation[k]<=config.water){visited[k]=1;push(k,elevation[k]);outlets++;}}
  if(!outlets){visited[minimum]=1;push(minimum,elevation[minimum]);}
  while(heap.length){const [k,level]=pop();order.push(k);for(const q of neighbours[k])if(!visited[q]){visited[q]=1;parent[q]=k;filled[q]=Math.max(elevation[q],level+.00001);push(q,filled[q]);}}
  flow=new Float32Array(count);for(let k=0;k<count;k++)flow[k]=k===0||k===last?.25:Math.max(.01,Math.sqrt(1-positions[k].y**2));
  for(let i=order.length-1;i>=0;i--){const k=order[i];if(parent[k]>=0)flow[parent[k]]+=flow[k];}
 }
 const strength=config.pressure<.05?.04:config.temperature< -15?.16:config.temperature>60?.12:.75;
 for(let pass=0;pass<passes;pass++){
  route();const change=new Float32Array(count);
  for(let i=order.length-1;i>=0;i--){const k=order[i],q=parent[k];if(q<0)continue;const drop=elevation[k]-elevation[q];if(drop<=0)continue;const slope=drop/Math.max(1,distance(k,q));const erosion=Math.min(drop*.04,2.5,strength*Math.sqrt(flow[k])*slope*2);change[k]-=erosion;change[q]+=erosion*.7;sediment[q]+=erosion*.7;}
  for(let k=0;k<count;k++)elevation[k]+=change[k];
 }
 route();const residual=new Float32Array(w*h),masks=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=index(x,y),p=y*w+x;let slope=0,shelter=0;
  for(const q of neighbours[k]){const d=Math.max(1,distance(k,q));slope=Math.max(slope,Math.abs(elevation[q]-elevation[k])/d);shelter+=1/(1+Math.max(0,(elevation[q]-elevation[k])/d)**2);}
  const drainage=clamp(Math.log2(1+flow[k])/14),soil=clamp(.32+sediment[k]*.035+drainage*.25-slope*1.4),exposure=clamp(slope*2+(original[k]-elevation[k])*.05-soil*.2);
  residual[p]=elevation[k]-original[k];masks.set([soil,exposure,drainage,shelter/neighbours[k].length].map(v=>Math.round(clamp(v)*255)),p*4);
 }
 return{key:planetDataKey(config,environment),config:{...config},environment:{...environment},width:w,height:h,residual,masks,stats:{version:PLANET_DATA_VERSION,nodes:count,spacingMetres:spacing,passes,maximumFlow:Math.max(...flow),maximumCorrection:Math.max(...residual.map(Math.abs)),bytes:residual.byteLength+masks.byteLength}};
}
const cubic=(a,b,c,d,t)=>b+.5*t*(c-a+t*(2*a-5*b+4*c-d+t*(3*(b-c)+d-a)));
export function samplePlanetData(data,n){
 if(!data)return null;const w=data.width,h=data.height,u=(.5+Math.atan2(n.x,n.z)/(2*Math.PI))*w,v=(.5-Math.asin(clamp(n.y,-1,1))/Math.PI)*(h-1),i=Math.floor(u),j=Math.floor(v),tx=u-i,ty=v-j;
 const at=(x,y,c)=>{while(y<0||y>=h){if(y<0){y=-y;x+=w/2;}else{y=2*(h-1)-y;x+=w/2;}}const k=y*w+((x%w+w)%w);return c<0?data.residual[k]:data.masks[k*4+c]/255;};
 const value=c=>{const rows=[];for(let y=-1;y<=2;y++)rows.push(cubic(at(i-1,j+y,c),at(i,j+y,c),at(i+1,j+y,c),at(i+2,j+y,c),tx));return cubic(...rows,ty);};
 return{height:value(-1),soil:clamp(value(0)),exposure:clamp(value(1)),flow:clamp(value(2)),shelter:clamp(value(3))};
}
